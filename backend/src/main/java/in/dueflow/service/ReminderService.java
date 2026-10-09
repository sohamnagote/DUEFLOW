package in.dueflow.service;

import in.dueflow.dto.ReminderDtos.EnrichedLogDto;
import in.dueflow.dto.ReminderDtos.EnrichedRuleDto;
import in.dueflow.entity.Invoice;
import in.dueflow.entity.Profile;
import in.dueflow.entity.ReminderLog;
import in.dueflow.entity.ReminderRule;
import in.dueflow.repository.InvoiceRepository;
import in.dueflow.repository.ProfileRepository;
import in.dueflow.repository.ReminderLogRepository;
import in.dueflow.repository.ReminderRuleRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class ReminderService {

    private static final Logger log = LoggerFactory.getLogger(ReminderService.class);

    private final ReminderRuleRepository reminderRuleRepository;
    private final ReminderLogRepository reminderLogRepository;
    private final InvoiceRepository invoiceRepository;
    private final ProfileRepository profileRepository;
    private final EmailService emailService;

    public ReminderService(ReminderRuleRepository reminderRuleRepository,
                           ReminderLogRepository reminderLogRepository,
                           InvoiceRepository invoiceRepository,
                           ProfileRepository profileRepository,
                           EmailService emailService) {
        this.reminderRuleRepository = reminderRuleRepository;
        this.reminderLogRepository = reminderLogRepository;
        this.invoiceRepository = invoiceRepository;
        this.profileRepository = profileRepository;
        this.emailService = emailService;
    }

    public List<EnrichedRuleDto> getRulesForUser(UUID userId) {
        List<Invoice> invoices = invoiceRepository.findByUserIdOrderByCreatedAtDesc(userId);
        if (invoices.isEmpty()) return List.of();

        Map<UUID, Invoice> invoiceMap = invoices.stream()
                .collect(Collectors.toMap(Invoice::getId, Function.identity(), (a, b) -> a));

        List<UUID> invoiceIds = new ArrayList<>(invoiceMap.keySet());
        List<ReminderRule> rules = reminderRuleRepository.findByInvoiceIdIn(invoiceIds);

        List<EnrichedRuleDto> results = new ArrayList<>();
        for (ReminderRule r : rules) {
            Invoice inv = invoiceMap.get(r.getInvoiceId());
            if (inv != null) {
                results.add(EnrichedRuleDto.from(r, inv.getInvoiceNumber(), inv.getClientNameSnapshot(),
                        inv.getAmount(), inv.getDueDate().toString()));
            }
        }
        results.sort(Comparator.comparing(EnrichedRuleDto::getScheduled_for));
        return results;
    }

    public List<EnrichedLogDto> getLogsForUser(UUID userId) {
        List<Invoice> invoices = invoiceRepository.findByUserIdOrderByCreatedAtDesc(userId);
        if (invoices.isEmpty()) return List.of();

        Map<UUID, Invoice> invoiceMap = invoices.stream()
                .collect(Collectors.toMap(Invoice::getId, Function.identity(), (a, b) -> a));

        List<UUID> invoiceIds = new ArrayList<>(invoiceMap.keySet());
        List<ReminderLog> logs = reminderLogRepository.findByInvoiceIdInOrderByCreatedAtDesc(invoiceIds);

        List<EnrichedLogDto> results = new ArrayList<>();
        for (ReminderLog l : logs) {
            Invoice inv = invoiceMap.get(l.getInvoiceId());
            if (inv != null) {
                results.add(EnrichedLogDto.from(l, inv.getInvoiceNumber(), inv.getClientNameSnapshot(), inv.getAmount()));
            }
        }
        return results;
    }

    // Operational Metrics for Phase 5 Monitoring
    private static final java.util.concurrent.atomic.AtomicLong totalRuns = new java.util.concurrent.atomic.AtomicLong(0);
    private static final java.util.concurrent.atomic.AtomicLong totalAccepted = new java.util.concurrent.atomic.AtomicLong(0);
    private static final java.util.concurrent.atomic.AtomicLong totalFailed = new java.util.concurrent.atomic.AtomicLong(0);
    private static final java.util.concurrent.atomic.AtomicReference<Instant> lastSchedulerRun = new java.util.concurrent.atomic.AtomicReference<>(null);
    private static final java.util.concurrent.atomic.AtomicReference<Instant> lastSuccessfulProcessing = new java.util.concurrent.atomic.AtomicReference<>(null);

    /**
     * Real background Java scheduler running automatically.
     * Recovers pending work after restarts and processes due reminders.
     */
    @Scheduled(fixedDelay = 60000, initialDelay = 15000)
    public void scheduledCronRun() {
        log.info("[Scheduler Worker] Running periodic pending reminders check.");
        processPendingReminders();
    }

    public Map<String, Object> getSchedulerMetrics() {
        Map<String, Object> metrics = new HashMap<>();
        metrics.put("last_run", lastSchedulerRun.get() != null ? lastSchedulerRun.get().toString() : "never");
        metrics.put("last_successful_processing", lastSuccessfulProcessing.get() != null ? lastSuccessfulProcessing.get().toString() : "none");
        metrics.put("total_runs", totalRuns.get());
        metrics.put("total_accepted_sends", totalAccepted.get());
        metrics.put("total_failed_sends", totalFailed.get());
        metrics.put("pending_occurrences", reminderRuleRepository.count());
        return metrics;
    }

    /**
     * Core atomic, idempotent, durable reminder processing engine.
     * Prevents duplicate sends across instances, recovers from crashes, and enforces retry bounds.
     */
    @Transactional
    public Map<String, Object> processPendingReminders() {
        Instant now = Instant.now();
        lastSchedulerRun.set(now);
        totalRuns.incrementAndGet();

        // 1. Recover any rules stuck in 'processing' due to past server restart or crash (> 10 mins)
        try {
            int recovered = reminderRuleRepository.recoverStuckProcessingRules(now.minusSeconds(600), now);
            if (recovered > 0) {
                log.info("[Scheduler Worker] Recovered {} rules stuck in processing state.", recovered);
            }
        } catch (Exception e) {
            log.warn("[Scheduler Worker] Error during stuck rules recovery: {}", e.getMessage());
        }

        // 2. Fetch all rules due for processing (status = 'pending', enabled = true, scheduledFor <= now)
        List<ReminderRule> dueCandidates = reminderRuleRepository
                .findByStatusAndEnabledTrueAndScheduledForLessThanEqualOrderByScheduledForAsc("pending", now);

        List<Map<String, Object>> outcomeList = new ArrayList<>();

        for (ReminderRule candidate : dueCandidates) {
            // 3. Concurrency Protection: Atomic claim in database
            // If another instance or worker already claimed this rule, count will be 0
            int claimed = reminderRuleRepository.claimRuleForProcessing(candidate.getId(), now);
            if (claimed == 0) {
                log.debug("[Scheduler Worker] Rule {} already claimed by concurrent worker. Skipping.", candidate.getId());
                continue;
            }

            ReminderRule rule = reminderRuleRepository.findById(candidate.getId()).orElse(candidate);

            // 4. Verify parent invoice exists
            Optional<Invoice> invoiceOpt = invoiceRepository.findById(rule.getInvoiceId());
            if (invoiceOpt.isEmpty()) {
                rule.setStatus("cancelled");
                rule.setEnabled(false);
                reminderRuleRepository.save(rule);
                continue;
            }

            Invoice invoice = invoiceOpt.get();
            String invNum = (invoice.getInvoiceNumber() != null) ? invoice.getInvoiceNumber() : "N/A";

            // 5. Strict Business Rule: Never send reminder if invoice is paid or reminders disabled
            if ("paid".equalsIgnoreCase(invoice.getStatus())) {
                rule.setStatus("cancelled");
                rule.setEnabled(false);
                reminderRuleRepository.save(rule);
                outcomeList.add(Map.of(
                        "rule_id", rule.getId(),
                        "invoice_number", invNum,
                        "skipped", true,
                        "reason", "Invoice already marked paid"
                ));
                continue;
            }

            if (Boolean.FALSE.equals(invoice.getRemindersEnabled()) || Boolean.FALSE.equals(rule.getEnabled())) {
                rule.setStatus("cancelled");
                rule.setEnabled(false);
                reminderRuleRepository.save(rule);
                outcomeList.add(Map.of(
                        "rule_id", rule.getId(),
                        "invoice_number", invNum,
                        "skipped", true,
                        "reason", "Reminders disabled on invoice"
                ));
                continue;
            }

            // 6. Idempotency Guard: Ensure this occurrence was not already successfully sent
            List<ReminderLog> existingLogs = reminderLogRepository.findByInvoiceIdOrderByCreatedAtDesc(invoice.getId());
            boolean alreadySent = existingLogs.stream().anyMatch(
                    l -> rule.getOccurrenceKey().equals(l.getOccurrenceKey()) &&
                         ("sent".equalsIgnoreCase(l.getStatus()) || "delivered".equalsIgnoreCase(l.getStatus()))
            );

            if (alreadySent) {
                rule.setStatus("sent");
                rule.setEnabled(false);
                reminderRuleRepository.save(rule);
                outcomeList.add(Map.of(
                        "rule_id", rule.getId(),
                        "invoice_number", invNum,
                        "skipped", true,
                        "reason", "Occurrence already recorded as sent"
                ));
                continue;
            }

            // 7. Check user-level channel preferences
            Profile profile = profileRepository.findById(invoice.getUserId()).orElse(null);
            if (profile != null && Boolean.FALSE.equals(profile.getEmailRemindersEnabled())) {
                rule.setStatus("skipped");
                rule.setEnabled(false);
                reminderRuleRepository.save(rule);
                outcomeList.add(Map.of(
                        "rule_id", rule.getId(),
                        "invoice_number", invNum,
                        "skipped", true,
                        "reason", "Email channel disabled in user settings"
                ));
                continue;
            }

            // 8. Construct professional RFC 2822 email payload
            EmailService.EmailRenderData emailData = new EmailService.EmailRenderData();
            emailData.invoiceNumber = invoice.getInvoiceNumber();
            emailData.amount = invoice.getAmount();
            emailData.dueDate = invoice.getDueDate().toString();
            emailData.issueDate = invoice.getIssueDate() != null ? invoice.getIssueDate().toString() : null;
            emailData.clientName = invoice.getClientNameSnapshot();
            emailData.clientEmail = invoice.getClientEmailSnapshot();
            emailData.businessName = profile != null ? profile.getBusinessName() : "";
            emailData.senderName = profile != null ? profile.getFullName() : "";
            emailData.senderEmail = profile != null ? profile.getEmail() : "";
            emailData.senderPhone = profile != null ? profile.getPhone() : null;
            emailData.senderAddress = profile != null ? profile.getAddress() : null;
            emailData.upiId = profile != null ? profile.getUpiId() : null;
            emailData.bankAccount = profile != null ? profile.getBankAccount() : null;
            emailData.bankIfsc = profile != null ? profile.getBankIfsc() : null;
            emailData.bankName = profile != null ? profile.getBankName() : null;
            emailData.paymentNotes = profile != null ? profile.getPaymentNotes() : null;
            emailData.paymentQrUrl = profile != null ? profile.getPaymentQrUrl() : null;
            emailData.notes = invoice.getNotes();
            emailData.stageName = rule.getOccurrenceKey();

            // 9. Real email dispatch through connected provider (Gmail/Outlook/fallback)
            EmailService.SendResult sendResult = emailService.sendEmail(
                    invoice.getUserId(),
                    invoice.getClientEmailSnapshot(),
                    profile != null ? profile.getEmail() : null,
                    emailData
            );

            // 10. Record attempt result
            ReminderLog logRecord = new ReminderLog();
            logRecord.setInvoiceId(invoice.getId());
            logRecord.setRuleId(rule.getId());
            logRecord.setChannel("email");
            logRecord.setProvider(sendResult.provider != null ? sendResult.provider : "none");
            logRecord.setOccurrenceKey(rule.getOccurrenceKey());
            logRecord.setRecipientEmail(invoice.getClientEmailSnapshot());
            logRecord.setRecipient(invoice.getClientEmailSnapshot());
            logRecord.setSubject(emailData.customSubject != null ? emailData.customSubject : ("Invoice " + invoice.getInvoiceNumber() + " reminder"));
            logRecord.setProviderMessageId(sendResult.providerMessageId);
            logRecord.setStatus(sendResult.success ? "sent" : "failed");
            logRecord.setErrorCode(sendResult.error);
            logRecord.setRetryable(sendResult.retryable);
            logRecord.setAttemptedAt(now);
            logRecord.setSentAt(sendResult.success ? now : null);
            reminderLogRepository.save(logRecord);

            // 11. Bounded retry handling
            int attempts = (rule.getAttemptCount() != null ? rule.getAttemptCount() : 0) + 1;
            rule.setAttemptCount(attempts);
            rule.setLastAttemptedAt(now);

            if (sendResult.success) {
                rule.setStatus("sent");
                rule.setEnabled(false);
                reminderRuleRepository.save(rule);
                totalAccepted.incrementAndGet();
                lastSuccessfulProcessing.set(now);
            } else if (sendResult.retryable && attempts < 3) {
                // Transient error with remaining retries: exponential backoff (5m, 10m)
                rule.setStatus("pending");
                rule.setScheduledFor(now.plusSeconds(300L * attempts));
                reminderRuleRepository.save(rule);
                totalFailed.incrementAndGet();
                log.warn("[Scheduler Worker] Rule {} failed transiently (attempt {}/3). Scheduled retry for {}.",
                        rule.getId(), attempts, rule.getScheduledFor());
            } else {
                // Permanent error or exceeded max retries
                rule.setStatus("failed");
                rule.setEnabled(false);
                reminderRuleRepository.save(rule);
                totalFailed.incrementAndGet();
                log.error("[Scheduler Worker] Rule {} permanently failed after {} attempts: {}",
                        rule.getId(), attempts, sendResult.error);
            }

            outcomeList.add(Map.of(
                    "rule_id", rule.getId(),
                    "invoice_number", invNum,
                    "channel", "email",
                    "status", sendResult.success ? "sent" : "failed",
                    "provider", sendResult.provider != null ? sendResult.provider : "none",
                    "provider_message_id", sendResult.providerMessageId != null ? sendResult.providerMessageId : "",
                    "error", sendResult.error != null ? sendResult.error : ""
            ));
        }

        Map<String, Object> res = new HashMap<>();
        res.put("timestamp", now.toString());
        res.put("candidates_evaluated", dueCandidates.size());
        res.put("processed_count", outcomeList.size());
        res.put("results", outcomeList);
        return res;
    }
}
