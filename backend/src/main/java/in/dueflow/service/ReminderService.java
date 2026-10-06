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

    /**
     * Real background Java scheduler running every 5 minutes.
     */
    @Scheduled(fixedDelay = 300000, initialDelay = 60000)
    public void scheduledCronRun() {
        log.info("[Scheduler Worker] Running periodic pending reminders check.");
        processPendingReminders();
    }

    /**
     * Core atomic reminder processing engine.
     */
    @Transactional
    public Map<String, Object> processPendingReminders() {
        Instant now = Instant.now();
        List<ReminderRule> dueRules = reminderRuleRepository.findByStatusAndScheduledForLessThanEqual("pending", now);

        List<Map<String, Object>> outcomeList = new ArrayList<>();

        for (ReminderRule rule : dueRules) {
            // Atomic claim
            rule.setStatus("processing");
            reminderRuleRepository.save(rule);

            Optional<Invoice> invoiceOpt = invoiceRepository.findById(rule.getInvoiceId());
            if (invoiceOpt.isEmpty()) {
                rule.setStatus("cancelled");
                reminderRuleRepository.save(rule);
                continue;
            }

            Invoice invoice = invoiceOpt.get();

            // Guard: invoice must still be unpaid and have reminders enabled
            if ("paid".equalsIgnoreCase(invoice.getStatus()) || Boolean.FALSE.equals(invoice.getRemindersEnabled())) {
                rule.setStatus("cancelled");
                rule.setEnabled(false);
                reminderRuleRepository.save(rule);
                outcomeList.add(Map.of(
                        "rule_id", rule.getId(),
                        "invoice_number", invoice.getInvoiceNumber(),
                        "skipped", true,
                        "reason", "Invoice paid or reminders disabled"
                ));
                continue;
            }

            // Guard: Idempotency check with existing logs
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
                        "invoice_number", invoice.getInvoiceNumber(),
                        "skipped", true,
                        "reason", "Already sent for this occurrence key"
                ));
                continue;
            }

            Profile profile = profileRepository.findById(invoice.getUserId()).orElse(null);
            if (profile != null && Boolean.FALSE.equals(profile.getEmailRemindersEnabled())) {
                rule.setStatus("skipped");
                reminderRuleRepository.save(rule);
                outcomeList.add(Map.of(
                        "rule_id", rule.getId(),
                        "invoice_number", invoice.getInvoiceNumber(),
                        "skipped", true,
                        "reason", "Email reminders disabled by user profile"
                ));
                continue;
            }

            // Render email and dispatch
            EmailService.EmailRenderData emailData = new EmailService.EmailRenderData();
            emailData.invoiceNumber = invoice.getInvoiceNumber();
            emailData.amount = invoice.getAmount();
            emailData.dueDate = invoice.getDueDate().toString();
            emailData.clientName = invoice.getClientNameSnapshot();
            emailData.clientEmail = invoice.getClientEmailSnapshot();
            emailData.businessName = profile != null ? profile.getBusinessName() : "";
            emailData.senderName = profile != null ? profile.getFullName() : "";
            emailData.senderEmail = profile != null ? profile.getEmail() : "";
            emailData.upiId = profile != null ? profile.getUpiId() : null;
            emailData.bankAccount = profile != null ? profile.getBankAccount() : null;
            emailData.bankIfsc = profile != null ? profile.getBankIfsc() : null;
            emailData.notes = invoice.getNotes();
            emailData.stageName = rule.getOccurrenceKey();

            EmailService.SendResult sendResult = emailService.sendEmail(
                    invoice.getClientEmailSnapshot(),
                    profile != null ? profile.getEmail() : null,
                    emailData
            );

            String logStatus = sendResult.success ? "sent" : "failed";

            ReminderLog logRecord = new ReminderLog();
            logRecord.setInvoiceId(invoice.getId());
            logRecord.setRuleId(rule.getId());
            logRecord.setChannel("email");
            logRecord.setProvider("resend");
            logRecord.setOccurrenceKey(rule.getOccurrenceKey());
            logRecord.setRecipientEmail(invoice.getClientEmailSnapshot());
            logRecord.setRecipient(invoice.getClientEmailSnapshot());
            logRecord.setSubject(emailData.customSubject != null ? emailData.customSubject : ("Invoice " + invoice.getInvoiceNumber() + " reminder"));
            logRecord.setProviderMessageId(sendResult.providerMessageId);
            logRecord.setStatus(logStatus);
            logRecord.setErrorCode(sendResult.error);
            logRecord.setRetryable(sendResult.retryable);
            logRecord.setAttemptedAt(now);
            logRecord.setSentAt(sendResult.success ? now : null);
            reminderLogRepository.save(logRecord);

            // Never mark reminder as sent unless provider accepted
            rule.setStatus(sendResult.success ? "sent" : (sendResult.retryable ? "pending" : "failed"));
            reminderRuleRepository.save(rule);

            outcomeList.add(Map.of(
                    "rule_id", rule.getId(),
                    "invoice_number", invoice.getInvoiceNumber(),
                    "channel", "email",
                    "status", logStatus,
                    "provider_message_id", sendResult.providerMessageId != null ? sendResult.providerMessageId : "",
                    "error", sendResult.error != null ? sendResult.error : ""
            ));
        }

        Map<String, Object> res = new HashMap<>();
        res.put("timestamp", now.toString());
        res.put("processed_count", outcomeList.size());
        res.put("results", outcomeList);
        return res;
    }
}
