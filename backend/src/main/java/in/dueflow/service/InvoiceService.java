package in.dueflow.service;

import in.dueflow.dto.AiDtos.GenerateReminderRequest;
import in.dueflow.dto.AiDtos.GenerateReminderResponse;
import in.dueflow.dto.InvoiceDtos.*;
import in.dueflow.entity.Invoice;
import in.dueflow.entity.Profile;
import in.dueflow.entity.ReminderLog;
import in.dueflow.entity.ReminderRule;
import in.dueflow.exception.BadRequestException;
import in.dueflow.exception.DuplicateResourceException;
import in.dueflow.exception.ResourceNotFoundException;
import in.dueflow.repository.InvoiceRepository;
import in.dueflow.repository.ProfileRepository;
import in.dueflow.repository.ReminderLogRepository;
import in.dueflow.repository.ReminderRuleRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class InvoiceService {

    private final InvoiceRepository invoiceRepository;
    private final ReminderRuleRepository reminderRuleRepository;
    private final ReminderLogRepository reminderLogRepository;
    private final ProfileRepository profileRepository;
    private final StatusService statusService;
    private final SchedulerService schedulerService;
    private final EmailService emailService;
    private final AiService aiService;
    private final PdfInvoiceService pdfInvoiceService;

    public InvoiceService(InvoiceRepository invoiceRepository,
                          ReminderRuleRepository reminderRuleRepository,
                          ReminderLogRepository reminderLogRepository,
                          ProfileRepository profileRepository,
                          StatusService statusService,
                          SchedulerService schedulerService,
                          EmailService emailService,
                          AiService aiService,
                          PdfInvoiceService pdfInvoiceService) {
        this.invoiceRepository = invoiceRepository;
        this.reminderRuleRepository = reminderRuleRepository;
        this.reminderLogRepository = reminderLogRepository;
        this.profileRepository = profileRepository;
        this.statusService = statusService;
        this.schedulerService = schedulerService;
        this.emailService = emailService;
        this.aiService = aiService;
        this.pdfInvoiceService = pdfInvoiceService;
    }

    public InvoiceListResponse listInvoices(UUID userId, String search, String status, String sort, int page, int limit) {
        int pageIndex = Math.max(0, page - 1);
        int pageSize = limit > 0 ? limit : 50;

        Sort sorting = Sort.by(Sort.Direction.DESC, "createdAt");
        if ("due_date_asc".equalsIgnoreCase(sort)) {
            sorting = Sort.by(Sort.Direction.ASC, "dueDate");
        } else if ("due_date_desc".equalsIgnoreCase(sort)) {
            sorting = Sort.by(Sort.Direction.DESC, "dueDate");
        } else if ("amount_asc".equalsIgnoreCase(sort)) {
            sorting = Sort.by(Sort.Direction.ASC, "amount");
        } else if ("amount_desc".equalsIgnoreCase(sort)) {
            sorting = Sort.by(Sort.Direction.DESC, "amount");
        }

        Pageable pageable = PageRequest.of(pageIndex, pageSize, sorting);
        String searchParam = (search != null && !search.isBlank()) ? search.trim() : null;
        String statusParam = (status != null && !status.isBlank() && !"all".equalsIgnoreCase(status)) ? status.trim() : null;

        Page<Invoice> paged = invoiceRepository.findFiltered(userId, statusParam, searchParam, pageable);

        List<InvoiceResponseDto> dtoList = paged.getContent().stream()
                .map(inv -> InvoiceResponseDto.from(inv, statusService.deriveOperationalStatus(inv), null))
                .collect(Collectors.toList());

        return new InvoiceListResponse(dtoList, paged.getTotalElements(), page, paged.getTotalPages());
    }

    public InvoiceDetailResponse getInvoiceDetail(UUID userId, UUID invoiceId) {
        Invoice invoice = invoiceRepository.findByUserIdAndId(userId, invoiceId)
                .orElseThrow(() -> new ResourceNotFoundException("Invoice not found"));

        List<ReminderRule> rules = reminderRuleRepository.findByInvoiceIdOrderByScheduledForAsc(invoiceId);
        List<ReminderLog> logs = reminderLogRepository.findByInvoiceIdOrderByCreatedAtDesc(invoiceId);

        InvoiceResponseDto dto = InvoiceResponseDto.from(invoice, statusService.deriveOperationalStatus(invoice), rules);
        return new InvoiceDetailResponse(dto, rules, logs);
    }

    @Transactional
    public InvoiceResponseDto createInvoice(UUID userId, CreateInvoiceRequest req) {
        if (invoiceRepository.existsByUserIdAndInvoiceNumber(userId, req.getInvoice_number().trim())) {
            throw new DuplicateResourceException("Invoice number " + req.getInvoice_number() + " already exists");
        }

        if (req.getDue_date().isBefore(req.getIssue_date())) {
            throw new BadRequestException("Due date must be on or after issue date");
        }

        Invoice invoice = new Invoice();
        invoice.setUserId(userId);
        invoice.setClientId(req.getClient_id());
        invoice.setClientNameSnapshot(req.getClient_name().trim());
        invoice.setClientEmailSnapshot(req.getClient_email().toLowerCase().trim());
        invoice.setClientPhoneSnapshot(req.getClient_phone() != null ? req.getClient_phone().trim() : "");
        invoice.setInvoiceNumber(req.getInvoice_number().trim());
        invoice.setAmount(req.getAmount());
        invoice.setCurrency(req.getCurrency() != null ? req.getCurrency() : "INR");
        invoice.setIssueDate(req.getIssue_date());
        invoice.setDueDate(req.getDue_date());
        invoice.setNotes(req.getNotes() != null ? req.getNotes().trim() : "");
        invoice.setTemplateKey(req.getTemplate_key() != null ? req.getTemplate_key() : "cadence_default");
        invoice.setRemindersEnabled(req.getReminders_enabled() != null ? req.getReminders_enabled() : true);
        invoice.setReminderChannel(req.getReminder_channel() != null ? req.getReminder_channel() : "default");
        invoice.setStatus("unpaid");

        Invoice saved = invoiceRepository.save(invoice);

        // Fetch user profile and custom schedule rules for reminder calculation
        Profile profile = profileRepository.findById(userId).orElse(null);
        String timezone = profile != null ? profile.getTimezone() : "Asia/Kolkata";
        String customRulesJson = profile != null ? profile.getReminderScheduleRules() : null;

        List<ReminderRule> generatedRules = schedulerService.calculateReminderRules(
                saved.getId(), saved.getDueDate(), timezone, "unpaid", List.of("email"), customRulesJson
        );
        List<ReminderRule> savedRules = reminderRuleRepository.saveAll(generatedRules);

        return InvoiceResponseDto.from(saved, statusService.deriveOperationalStatus(saved), savedRules);
    }

    @Transactional
    public InvoiceResponseDto updateInvoice(UUID userId, UUID invoiceId, UpdateInvoiceRequest req) {
        Invoice invoice = invoiceRepository.findByUserIdAndId(userId, invoiceId)
                .orElseThrow(() -> new ResourceNotFoundException("Invoice not found"));

        boolean dueDateChanged = false;
        if (req.getClient_name() != null) invoice.setClientNameSnapshot(req.getClient_name().trim());
        if (req.getClient_email() != null) invoice.setClientEmailSnapshot(req.getClient_email().toLowerCase().trim());
        if (req.getClient_phone() != null) invoice.setClientPhoneSnapshot(req.getClient_phone().trim());
        if (req.getAmount() != null) invoice.setAmount(req.getAmount());
        if (req.getIssue_date() != null) invoice.setIssueDate(req.getIssue_date());
        if (req.getNotes() != null) invoice.setNotes(req.getNotes().trim());
        if (req.getTemplate_key() != null) invoice.setTemplateKey(req.getTemplate_key());
        if (req.getReminders_enabled() != null) invoice.setRemindersEnabled(req.getReminders_enabled());
        if (req.getReminder_channel() != null) invoice.setReminderChannel(req.getReminder_channel());

        if (req.getDue_date() != null && !req.getDue_date().equals(invoice.getDueDate())) {
            invoice.setDueDate(req.getDue_date());
            dueDateChanged = true;
        }

        Invoice saved = invoiceRepository.save(invoice);

        // If due date changed, rebuild only unsent future reminders and preserve sent history
        if (dueDateChanged && !"paid".equalsIgnoreCase(saved.getStatus())) {
            Profile prof = profileRepository.findById(userId).orElse(null);
            String tz = prof != null ? prof.getTimezone() : "Asia/Kolkata";
            String cRules = prof != null ? prof.getReminderScheduleRules() : null;
            List<ReminderLog> existingLogs = reminderLogRepository.findByInvoiceIdOrderByCreatedAtDesc(invoiceId);
            Set<String> sentKeys = existingLogs.stream()
                    .filter(l -> "sent".equalsIgnoreCase(l.getStatus()) || "delivered".equalsIgnoreCase(l.getStatus()))
                    .map(ReminderLog::getOccurrenceKey)
                    .collect(Collectors.toSet());

            reminderRuleRepository.deleteByInvoiceId(invoiceId);
            reminderRuleRepository.flush();
            List<ReminderRule> recomputed = schedulerService.recomputeRulesForUnpaid(
                    invoiceId, saved.getDueDate(), sentKeys, tz, List.of("email"), cRules
            );
            reminderRuleRepository.saveAll(recomputed);
        }

        List<ReminderRule> rules = reminderRuleRepository.findByInvoiceIdOrderByScheduledForAsc(invoiceId);
        return InvoiceResponseDto.from(saved, statusService.deriveOperationalStatus(saved), rules);
    }

    @Transactional
    public boolean deleteInvoice(UUID userId, UUID invoiceId) {
        Invoice invoice = invoiceRepository.findByUserIdAndId(userId, invoiceId)
                .orElseThrow(() -> new ResourceNotFoundException("Invoice not found"));

        reminderRuleRepository.deleteByInvoiceId(invoiceId);
        invoiceRepository.delete(invoice);
        return true;
    }

    @Transactional
    public InvoiceResponseDto markInvoicePaid(UUID userId, UUID invoiceId) {
        Invoice invoice = invoiceRepository.findByUserIdAndId(userId, invoiceId)
                .orElseThrow(() -> new ResourceNotFoundException("Invoice not found"));

        invoice.setStatus("paid");
        invoice.setPaidAt(Instant.now());
        Invoice saved = invoiceRepository.save(invoice);

        // Cancel all pending future reminder rules
        List<ReminderRule> rules = reminderRuleRepository.findByInvoiceIdOrderByScheduledForAsc(invoiceId);
        for (ReminderRule rule : rules) {
            if ("pending".equalsIgnoreCase(rule.getStatus()) || "processing".equalsIgnoreCase(rule.getStatus())) {
                rule.setStatus("cancelled");
                rule.setEnabled(false);
            }
        }
        reminderRuleRepository.saveAll(rules);

        return InvoiceResponseDto.from(saved, "paid", rules);
    }

    @Transactional
    public InvoiceResponseDto markInvoiceUnpaid(UUID userId, UUID invoiceId) {
        Invoice invoice = invoiceRepository.findByUserIdAndId(userId, invoiceId)
                .orElseThrow(() -> new ResourceNotFoundException("Invoice not found"));

        invoice.setStatus("unpaid");
        invoice.setPaidAt(null);
        Invoice saved = invoiceRepository.save(invoice);

        String timezone = profileRepository.findById(userId).map(Profile::getTimezone).orElse("Asia/Kolkata");
        List<ReminderLog> logs = reminderLogRepository.findByInvoiceIdOrderByCreatedAtDesc(invoiceId);
        Set<String> sentKeys = logs.stream()
                .filter(l -> "sent".equalsIgnoreCase(l.getStatus()) || "delivered".equalsIgnoreCase(l.getStatus()))
                .map(ReminderLog::getOccurrenceKey)
                .collect(Collectors.toSet());

        reminderRuleRepository.deleteByInvoiceId(invoiceId);
        reminderRuleRepository.flush();
        List<ReminderRule> recomputed = schedulerService.recomputeRulesForUnpaid(
                invoiceId, saved.getDueDate(), sentKeys, timezone, List.of("email")
        );
        List<ReminderRule> savedRules = reminderRuleRepository.saveAll(recomputed);

        return InvoiceResponseDto.from(saved, statusService.deriveOperationalStatus(saved), savedRules);
    }

    @Transactional
    public InvoiceResponseDto toggleReminders(UUID userId, UUID invoiceId, boolean enabled) {
        Invoice invoice = invoiceRepository.findByUserIdAndId(userId, invoiceId)
                .orElseThrow(() -> new ResourceNotFoundException("Invoice not found"));

        invoice.setRemindersEnabled(enabled);
        Invoice saved = invoiceRepository.save(invoice);

        List<ReminderRule> rules = reminderRuleRepository.findByInvoiceIdOrderByScheduledForAsc(invoiceId);
        for (ReminderRule rule : rules) {
            if ("pending".equalsIgnoreCase(rule.getStatus())) {
                rule.setEnabled(enabled);
            }
        }
        reminderRuleRepository.saveAll(rules);

        return InvoiceResponseDto.from(saved, statusService.deriveOperationalStatus(saved), rules);
    }

    @Transactional
    public Map<String, Object> nudgeInvoice(UUID userId, UUID invoiceId, NudgeRequest req) {
        Invoice invoice = invoiceRepository.findByUserIdAndId(userId, invoiceId)
                .orElseThrow(() -> new ResourceNotFoundException("Invoice not found"));

        if ("paid".equalsIgnoreCase(invoice.getStatus())) {
            throw new BadRequestException("Cannot send reminder for an invoice already marked paid");
        }

        if (Boolean.FALSE.equals(invoice.getRemindersEnabled())) {
            throw new BadRequestException("Reminders are disabled for this invoice");
        }

        // Prevent duplicate sends caused by retries or repeated rapid clicks (15 second debounce)
        List<ReminderLog> recentLogs = reminderLogRepository.findByInvoiceIdOrderByCreatedAtDesc(invoice.getId());
        if (!recentLogs.isEmpty()) {
            ReminderLog lastLog = recentLogs.get(0);
            if ("sent".equalsIgnoreCase(lastLog.getStatus()) && lastLog.getCreatedAt() != null) {
                long secondsSince = java.time.Duration.between(lastLog.getCreatedAt(), Instant.now()).getSeconds();
                if (secondsSince < 15) {
                    throw new BadRequestException("A reminder for this invoice was sent " + secondsSince + " seconds ago. Please wait before sending another reminder.");
                }
            }
        }

        Profile profile = profileRepository.findById(userId).orElse(new Profile(userId, ""));

        String subject = req.getCustomSubject();
        String body = req.getCustomBody();

        if (body == null || body.isBlank()) {
            GenerateReminderRequest aiReq = new GenerateReminderRequest();
            aiReq.setInvoice_id(invoice.getId());
            aiReq.setInvoice_number(invoice.getInvoiceNumber());
            aiReq.setAmount(invoice.getAmount());
            aiReq.setDue_date(invoice.getDueDate().toString());
            aiReq.setClient_name(invoice.getClientNameSnapshot());
            aiReq.setTone(req.getTone() != null ? req.getTone() : "professional");

            GenerateReminderResponse aiRes = aiService.generateReminder(
                    userId, aiReq, profile.getBusinessName(), profile.getFullName()
            );
            subject = aiRes.getSubject();
            body = aiRes.getBody();
        }

        EmailService.EmailRenderData emailData = new EmailService.EmailRenderData();
        emailData.invoiceNumber = invoice.getInvoiceNumber();
        emailData.amount = invoice.getAmount();
        emailData.dueDate = invoice.getDueDate().toString();
        emailData.issueDate = invoice.getIssueDate() != null ? invoice.getIssueDate().toString() : null;
        emailData.clientName = invoice.getClientNameSnapshot();
        emailData.clientEmail = invoice.getClientEmailSnapshot();
        emailData.businessName = profile.getBusinessName();
        emailData.senderName = profile.getFullName();
        emailData.senderEmail = profile.getEmail();
        emailData.senderPhone = profile.getPhone();
        emailData.senderAddress = profile.getAddress();
        emailData.upiId = profile.getUpiId();
        emailData.bankAccount = profile.getBankAccount();
        emailData.bankIfsc = profile.getBankIfsc();
        emailData.bankName = profile.getBankName();
        emailData.paymentNotes = profile.getPaymentNotes();
        emailData.paymentQrUrl = profile.getPaymentQrUrl();
        emailData.notes = invoice.getNotes();
        emailData.customSubject = subject;
        emailData.customBody = body;

        // Generate actual invoice PDF and attach it to the email
        try {
            PdfInvoiceService.PdfGenerationResult pdfResult = pdfInvoiceService.generateInvoicePdf(invoice, profile);
            if (pdfResult != null && pdfResult.pdfBytes != null) {
                emailData.pdfAttachmentBytes = pdfResult.pdfBytes;
                emailData.pdfAttachmentFilename = pdfResult.filename;
            }
        } catch (Exception e) {
            throw new RuntimeException("Failed to generate invoice PDF attachment: " + e.getMessage(), e);
        }

        EmailService.SendResult sendRes = emailService.sendEmail(
                userId, invoice.getClientEmailSnapshot(), profile.getEmail(), emailData
        );

        ReminderLog log = new ReminderLog();
        log.setInvoiceId(invoice.getId());
        log.setChannel("email");
        log.setProvider(sendRes.provider != null ? sendRes.provider : "none");
        log.setOccurrenceKey("manual_nudge_email_" + System.currentTimeMillis());
        log.setRecipientEmail(invoice.getClientEmailSnapshot());
        log.setRecipient(invoice.getClientEmailSnapshot());
        log.setSubject(emailData.customSubject != null ? emailData.customSubject : ("Invoice " + invoice.getInvoiceNumber() + " reminder"));
        log.setProviderMessageId(sendRes.providerMessageId);
        log.setStatus(sendRes.success ? "sent" : "failed");
        log.setErrorCode(sendRes.error);
        log.setRetryable(sendRes.retryable);
        log.setAttemptedAt(Instant.now());
        log.setSentAt(sendRes.success ? Instant.now() : null);

        ReminderLog savedLog = reminderLogRepository.save(log);

        Map<String, Object> response = new HashMap<>();
        response.put("success", sendRes.success);
        response.put("channel", "email");
        response.put("provider", sendRes.provider);
        response.put("providerMessageId", sendRes.providerMessageId);
        response.put("results", Map.of("email", sendRes));
        response.put("logs", List.of(savedLog));
        response.put("message", sendRes.success
                ? ("Reminder dispatched successfully via " + sendRes.provider + " with invoice PDF attached.")
                : ("Email delivery failed: " + sendRes.error));
        return response;
    }

    public EmailService.RenderedEmail previewEmail(UUID userId, UUID invoiceId, int stage, String tone) {
        Invoice invoice = invoiceRepository.findByUserIdAndId(userId, invoiceId)
                .orElseThrow(() -> new ResourceNotFoundException("Invoice not found"));

        Profile profile = profileRepository.findById(userId).orElse(new Profile(userId, ""));

        EmailService.EmailRenderData emailData = new EmailService.EmailRenderData();
        emailData.invoiceNumber = invoice.getInvoiceNumber();
        emailData.amount = invoice.getAmount();
        emailData.dueDate = invoice.getDueDate().toString();
        emailData.issueDate = invoice.getIssueDate() != null ? invoice.getIssueDate().toString() : null;
        emailData.clientName = invoice.getClientNameSnapshot();
        emailData.clientEmail = invoice.getClientEmailSnapshot();
        emailData.businessName = profile.getBusinessName();
        emailData.senderName = profile.getFullName();
        emailData.senderEmail = profile.getEmail();
        emailData.senderPhone = profile.getPhone();
        emailData.senderAddress = profile.getAddress();
        emailData.upiId = profile.getUpiId();
        emailData.bankAccount = profile.getBankAccount();
        emailData.bankIfsc = profile.getBankIfsc();
        emailData.bankName = profile.getBankName();
        emailData.paymentNotes = profile.getPaymentNotes();
        emailData.paymentQrUrl = profile.getPaymentQrUrl();
        emailData.notes = invoice.getNotes();
        emailData.stageName = "Stage " + stage;
        emailData.tone = (tone != null && !tone.isBlank()) ? tone : (profile.getEmailTone() != null ? profile.getEmailTone() : "professional");
        emailData.customSubject = profile.getCustomEmailSubject();
        emailData.customBody = profile.getCustomEmailBody();

        return emailService.renderReminderEmail(emailData);
    }

    public PdfInvoiceService.PdfGenerationResult getInvoicePdf(UUID userId, UUID invoiceId) {
        Invoice invoice = invoiceRepository.findByUserIdAndId(userId, invoiceId)
                .orElseThrow(() -> new ResourceNotFoundException("Invoice not found"));
        Profile profile = profileRepository.findById(userId).orElse(new Profile(userId, ""));
        return pdfInvoiceService.generateInvoicePdf(invoice, profile);
    }

    @Transactional
    public void rebuildSchedulesForUser(UUID userId) {
        Profile profile = profileRepository.findById(userId).orElse(null);
        if (profile == null) return;
        String tz = profile.getTimezone() != null ? profile.getTimezone() : "Asia/Kolkata";
        String customRulesJson = profile.getReminderScheduleRules();

        List<Invoice> unpaidInvoices = invoiceRepository.findByUserIdOrderByCreatedAtDesc(userId)
                .stream()
                .filter(inv -> !"paid".equalsIgnoreCase(inv.getStatus()) && Boolean.TRUE.equals(inv.getRemindersEnabled()))
                .collect(Collectors.toList());

        for (Invoice invoice : unpaidInvoices) {
            List<ReminderLog> existingLogs = reminderLogRepository.findByInvoiceIdOrderByCreatedAtDesc(invoice.getId());
            Set<String> sentKeys = existingLogs.stream()
                    .filter(l -> "sent".equalsIgnoreCase(l.getStatus()) || "delivered".equalsIgnoreCase(l.getStatus()))
                    .map(ReminderLog::getOccurrenceKey)
                    .collect(Collectors.toSet());

            reminderRuleRepository.deleteByInvoiceId(invoice.getId());
            reminderRuleRepository.flush();
            List<ReminderRule> recomputed = schedulerService.recomputeRulesForUnpaid(
                    invoice.getId(), invoice.getDueDate(), sentKeys, tz, List.of("email"), customRulesJson
            );
            reminderRuleRepository.saveAll(recomputed);
        }
    }
}
