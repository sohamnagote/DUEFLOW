package com.dueflow.service;

import com.dueflow.domain.*;
import com.dueflow.exception.ResourceNotFoundException;
import com.dueflow.exception.ValidationException;
import com.dueflow.repository.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

@Service
public class ReminderSchedulerService {

    private static final Logger log = LoggerFactory.getLogger(ReminderSchedulerService.class);
    private static final int MAX_ATTEMPTS = 3;

    private final ScheduledReminderRepository scheduledReminderRepository;
    private final ReminderHistoryRepository reminderHistoryRepository;
    private final NotificationRepository notificationRepository;
    private final GmailSenderService gmailSenderService;
    private final GmailOAuthService gmailOAuthService;
    private final InvoiceRepository invoiceRepository;
    private final ReminderRuleRepository reminderRuleRepository;
    private final boolean schedulerEnabled;
    private final ConcurrentMap<String, Instant> inFlightDispatches = new ConcurrentHashMap<>();

    public ReminderSchedulerService(
            ScheduledReminderRepository scheduledReminderRepository,
            ReminderHistoryRepository reminderHistoryRepository,
            NotificationRepository notificationRepository,
            GmailSenderService gmailSenderService,
            @Value("${dueflow.scheduler.enabled:true}") boolean schedulerEnabled) {
        this(scheduledReminderRepository, reminderHistoryRepository, notificationRepository,
             gmailSenderService, null, null, null, schedulerEnabled);
    }

    public ReminderSchedulerService(
            ScheduledReminderRepository scheduledReminderRepository,
            ReminderHistoryRepository reminderHistoryRepository,
            NotificationRepository notificationRepository,
            GmailSenderService gmailSenderService,
            GmailOAuthService gmailOAuthService,
            InvoiceRepository invoiceRepository,
            boolean schedulerEnabled) {
        this(scheduledReminderRepository, reminderHistoryRepository, notificationRepository,
             gmailSenderService, gmailOAuthService, invoiceRepository, null, schedulerEnabled);
    }

    @org.springframework.beans.factory.annotation.Autowired
    public ReminderSchedulerService(
            ScheduledReminderRepository scheduledReminderRepository,
            ReminderHistoryRepository reminderHistoryRepository,
            NotificationRepository notificationRepository,
            GmailSenderService gmailSenderService,
            GmailOAuthService gmailOAuthService,
            InvoiceRepository invoiceRepository,
            @org.springframework.beans.factory.annotation.Autowired(required = false) ReminderRuleRepository reminderRuleRepository,
            @Value("${dueflow.scheduler.enabled:true}") boolean schedulerEnabled) {
        this.scheduledReminderRepository = scheduledReminderRepository;
        this.reminderHistoryRepository = reminderHistoryRepository;
        this.notificationRepository = notificationRepository;
        this.gmailSenderService = gmailSenderService;
        this.gmailOAuthService = gmailOAuthService;
        this.invoiceRepository = invoiceRepository;
        this.reminderRuleRepository = reminderRuleRepository;
        this.schedulerEnabled = schedulerEnabled;
    }

    /**
     * Periodic background execution to deliver due payment reminders.
     */
    @Scheduled(fixedDelayString = "${dueflow.scheduler.interval-ms:60000}")
    public void runScheduledReminders() {
        if (!schedulerEnabled) {
            return;
        }

        Instant now = Instant.now();
        List<ScheduledReminder> dueList = scheduledReminderRepository.findDueReminders(
                ReminderStatus.PENDING,
                now,
                PageRequest.of(0, 25)
        );

        if (!dueList.isEmpty()) {
            log.info("Found {} due reminders ready for dispatch", dueList.size());
            for (ScheduledReminder reminder : dueList) {
                try {
                    processSingleReminder(reminder.getId());
                } catch (Exception e) {
                    log.error("Unexpected error handling reminder {}: {}", reminder.getId(), e.getMessage(), e);
                }
            }
        }
    }

    /**
     * Atomically process a single scheduled reminder.
     */
    @Transactional
    public boolean processSingleReminder(String reminderId) {
        ScheduledReminder reminder = scheduledReminderRepository.findById(reminderId).orElse(null);
        if (reminder == null || reminder.getStatus() != ReminderStatus.PENDING) {
            return false;
        }

        Invoice invoice = reminder.getInvoice();
        if (invoice == null) {
            reminder.setStatus(ReminderStatus.CANCELLED);
            scheduledReminderRepository.save(reminder);
            return false;
        }

        // If invoice is already paid or cancelled, cancel future reminders
        if (invoice.getStatus() == InvoiceStatus.PAID || invoice.getStatus() == InvoiceStatus.CANCELLED) {
            reminder.setStatus(ReminderStatus.CANCELLED);
            scheduledReminderRepository.save(reminder);
            log.info("Cancelled reminder {} because invoice {} is already {}",
                    reminder.getId(), invoice.getInvoiceNumber(), invoice.getStatus());
            return false;
        }

        // Claim reminder
        reminder.setStatus(ReminderStatus.PROCESSING);
        reminder.setAttemptCount(reminder.getAttemptCount() + 1);
        reminder.setLastAttemptAt(Instant.now());
        scheduledReminderRepository.save(reminder);

        String recipientEmail = invoice.getClient() != null ? invoice.getClient().getEmail() : null;
        String subject = "Payment Reminder: Invoice #" + invoice.getInvoiceNumber();

        try {
            String messageId = gmailSenderService.sendInvoiceReminder(invoice, subject, null);

            reminder.setStatus(ReminderStatus.SENT);
            reminder.setLastAttemptAt(Instant.now());
            scheduledReminderRepository.save(reminder);

            // Log history
            ReminderHistory history = new ReminderHistory(
                    reminder.getId(),
                    invoice.getId(),
                    reminder.getUserId(),
                    recipientEmail != null ? recipientEmail : "unknown",
                    subject,
                    "SENT"
            );
            history.setProviderMessageId(messageId);
            reminderHistoryRepository.save(history);

            // Create user notification
            Notification notification = new Notification(
                    reminder.getUserId(),
                    "Reminder Sent",
                    "Payment reminder for invoice #" + invoice.getInvoiceNumber() + " sent to " + invoice.getClient().getName(),
                    "INFO",
                    "/invoices"
            );
            notificationRepository.save(notification);

            log.info("Reminder {} successfully sent for invoice {}", reminder.getId(), invoice.getInvoiceNumber());
            return true;

        } catch (Exception e) {
            String errorMessage = e.getMessage() != null ? e.getMessage() : "Unknown delivery error";
            log.warn("Failed to dispatch reminder {} (attempt {}): {}", reminder.getId(), reminder.getAttemptCount(), errorMessage);

            if (reminder.getAttemptCount() >= MAX_ATTEMPTS) {
                reminder.setStatus(ReminderStatus.FAILED);
            } else {
                // Exponential retry backoff: 15min * attempts
                reminder.setStatus(ReminderStatus.PENDING);
                reminder.setScheduledAt(Instant.now().plus(15L * reminder.getAttemptCount(), ChronoUnit.MINUTES));
            }
            scheduledReminderRepository.save(reminder);

            // Log history failure
            ReminderHistory history = new ReminderHistory(
                    reminder.getId(),
                    invoice.getId(),
                    reminder.getUserId(),
                    recipientEmail != null ? recipientEmail : "unknown",
                    subject,
                    "FAILED"
            );
            history.setErrorMessage(errorMessage);
            history.setErrorCategory("GMAIL_ERROR");
            reminderHistoryRepository.save(history);

            if (reminder.getStatus() == ReminderStatus.FAILED) {
                Notification failureNotification = new Notification(
                        reminder.getUserId(),
                        "Reminder Delivery Failed",
                        "Failed to send reminder for invoice #" + invoice.getInvoiceNumber() + ": " + errorMessage,
                        "ERROR",
                        "/reminders"
                );
                notificationRepository.save(failureNotification);
            }

            return false;
        }
    }

    /**
     * Allows immediate manual dispatch of a reminder by the owner ("Remind Now").
     * Supports both scheduled reminder IDs and invoice IDs.
     * Enforces tenant isolation, invoice eligibility, Gmail connection, and idempotency safeguards.
     * Does NOT alter or cancel future automated reminder schedules.
     *
     * @return map containing dispatch result details
     */
    public Map<String, Object> triggerReminderManually(String reminderOrInvoiceId, String userId) {
        ScheduledReminder reminder = scheduledReminderRepository.findById(reminderOrInvoiceId).orElse(null);
        Invoice invoice = null;

        if (reminder != null) {
            if (!userId.equals(reminder.getUserId())) {
                throw new ResourceNotFoundException("Scheduled reminder not found");
            }
            invoice = reminder.getInvoice();
        } else if (invoiceRepository != null) {
            invoice = invoiceRepository.findById(reminderOrInvoiceId)
                    .filter(inv -> userId.equals(inv.getUserId()))
                    .orElse(null);
        }

        if (invoice == null) {
            throw new ResourceNotFoundException("Scheduled reminder or invoice not found");
        }

        // 1. Check tenant isolation for invoice and client
        if (!userId.equals(invoice.getUserId())) {
            throw new ResourceNotFoundException("Invoice not found");
        }
        if (invoice.getClient() == null || !userId.equals(invoice.getClient().getUserId())) {
            throw new ValidationException("Invoice client is missing or does not belong to the user.");
        }

        // 2. Check invoice eligibility: Do not send reminders for paid or cancelled invoices
        if (invoice.getStatus() == InvoiceStatus.PAID) {
            scheduledReminderRepository.cancelPendingForInvoice(invoice.getId());
            throw new ValidationException("Cannot send reminder: invoice is already paid.");
        }
        if (invoice.getStatus() == InvoiceStatus.CANCELLED) {
            scheduledReminderRepository.cancelPendingForInvoice(invoice.getId());
            throw new ValidationException("Cannot send reminder: invoice is cancelled.");
        }

        // 3. Outstanding balance check
        if (invoice.getTotalAmount() == null || invoice.getTotalAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new ValidationException("Cannot send reminder: invoice has no outstanding balance.");
        }

        // 4. Verify client email is present
        String recipientEmail = invoice.getClient().getEmail();
        if (recipientEmail == null || recipientEmail.isBlank()) {
            throw new ValidationException("Client does not have a valid email address.");
        }

        // 5. Verify Gmail is connected
        if (gmailOAuthService == null) {
            throw new ValidationException("Gmail service is unavailable.");
        }
        String refreshToken = gmailOAuthService.getDecryptedRefreshToken(userId);
        if (refreshToken == null || refreshToken.isBlank()) {
            throw new ValidationException("Gmail is not connected. Please connect your Gmail account in Settings before sending reminders.");
        }

        // 6. Concurrency guard: in-flight deduplication
        Instant now = Instant.now();
        Instant active = inFlightDispatches.putIfAbsent(invoice.getId(), now);
        if (active != null) {
            throw new ValidationException("A reminder dispatch for invoice " + invoice.getInvoiceNumber() + " is already in progress. Please wait a moment.");
        }

        try {
            // 7. Recent dispatch cooldown (15 seconds) to avoid duplicate sends from accidental double-clicks or retries
            List<ReminderHistory> recentHistory = reminderHistoryRepository.findByInvoiceIdOrderByAttemptedAtDesc(invoice.getId());
            if (!recentHistory.isEmpty()) {
                ReminderHistory latest = recentHistory.get(0);
                if ("SENT".equals(latest.getStatus()) && latest.getAttemptedAt() != null) {
                    long secondsSince = java.time.Duration.between(latest.getAttemptedAt(), now).toSeconds();
                    if (secondsSince < 15) {
                        throw new ValidationException("A reminder for invoice " + invoice.getInvoiceNumber() + " was already sent " + secondsSince + " seconds ago. Please wait before sending another.");
                    }
                }
            }

            // 8. Template & Tone Selection
            String subject = "Payment Reminder: Invoice #" + invoice.getInvoiceNumber();
            String customBody = null;

            if (reminder != null && reminder.getRule() != null) {
                ReminderRule rule = reminder.getRule();
                if (rule.getCustomSubject() != null && !rule.getCustomSubject().isBlank()) {
                    subject = rule.getCustomSubject();
                } else if ("FIRM".equalsIgnoreCase(rule.getTone()) || "URGENT".equalsIgnoreCase(rule.getTone())) {
                    subject = "Payment overdue notice: Invoice #" + invoice.getInvoiceNumber();
                } else if ("FRIENDLY".equalsIgnoreCase(rule.getTone())) {
                    subject = "Friendly note: Invoice #" + invoice.getInvoiceNumber() + " payment reminder";
                }

                if (rule.getCustomMessage() != null && !rule.getCustomMessage().isBlank()) {
                    customBody = rule.getCustomMessage();
                }
            } else {
                // If invoice is overdue, use overdue notice subject
                if (invoice.getDueDate() != null && invoice.getDueDate().isBefore(LocalDate.now())) {
                    subject = "Payment overdue notice: Invoice #" + invoice.getInvoiceNumber();
                }
            }

            // Replace template placeholders if present
            if (subject.contains("{{invoice_number}}")) {
                subject = subject.replace("{{invoice_number}}", invoice.getInvoiceNumber());
            }
            if (customBody != null) {
                customBody = customBody
                        .replace("{{invoice_number}}", invoice.getInvoiceNumber())
                        .replace("{{client_name}}", invoice.getClient().getName() != null ? invoice.getClient().getName() : "Client")
                        .replace("{{total_amount}}", invoice.getCurrency() + " " + invoice.getTotalAmount())
                        .replace("{{due_date}}", invoice.getDueDate() != null ? invoice.getDueDate().toString() : "soon");
            }

            // 9. Send email via GmailSenderService
            String messageId;
            try {
                messageId = gmailSenderService.sendInvoiceReminder(invoice, subject, customBody);
            } catch (ValidationException ve) {
                recordHistoryAttempt(reminder != null ? reminder.getId() : "MANUAL", invoice.getId(), userId, recipientEmail, subject, "FAILED", null, "VALIDATION_ERROR", ve.getMessage());
                throw ve;
            } catch (Exception e) {
                log.error("Failed to dispatch manual reminder for invoice {}: {}", invoice.getInvoiceNumber(), e.getMessage(), e);
                recordHistoryAttempt(reminder != null ? reminder.getId() : "MANUAL", invoice.getId(), userId, recipientEmail, subject, "FAILED", null, "GMAIL_ERROR", e.getMessage());
                throw new ValidationException("Failed to dispatch reminder email: " + e.getMessage());
            }

            // 10. Record success in reminder history
            recordHistoryAttempt(reminder != null ? reminder.getId() : "MANUAL", invoice.getId(), userId, recipientEmail, subject, "SENT", messageId, null, null);

            // 11. Create user notification
            String clientName = invoice.getClient() != null ? invoice.getClient().getName() : "Client";
            Notification notification = new Notification(
                    userId,
                    "Payment Reminder Sent",
                    "Payment reminder for invoice #" + invoice.getInvoiceNumber() + " sent to " + clientName,
                    "INFO",
                    "/invoices"
            );
            notificationRepository.save(notification);

            // 12. Update invoice reminders sent count
            invoice.setRemindersSentCount(invoice.getRemindersSentCount() + 1);
            if (invoiceRepository != null) {
                invoiceRepository.save(invoice);
            }

            log.info("Manual reminder successfully dispatched by user {} for invoice {} (messageId: {})", userId, invoice.getInvoiceNumber(), messageId);

            return Map.of(
                    "success", true,
                    "message", "Payment reminder sent successfully to " + recipientEmail + " for invoice " + invoice.getInvoiceNumber(),
                    "providerMessageId", messageId,
                    "invoiceId", invoice.getId(),
                    "recipientEmail", recipientEmail
            );

        } finally {
            inFlightDispatches.remove(invoice.getId());
        }
    }

    private void recordHistoryAttempt(
            String scheduledReminderId,
            String invoiceId,
            String userId,
            String recipientEmail,
            String subject,
            String status,
            String providerMessageId,
            String errorCategory,
            String errorMessage) {
        try {
            ReminderHistory history = new ReminderHistory(
                    scheduledReminderId,
                    invoiceId,
                    userId,
                    recipientEmail,
                    subject,
                    status
            );
            if (providerMessageId != null) {
                history.setProviderMessageId(providerMessageId);
            }
            if (errorCategory != null) {
                history.setErrorCategory(errorCategory);
            }
            if (errorMessage != null) {
                history.setErrorMessage(errorMessage);
            }
            reminderHistoryRepository.save(history);
        } catch (Exception ex) {
            log.error("Failed to record reminder history attempt: {}", ex.getMessage(), ex);
        }
    }
}
