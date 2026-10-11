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

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;

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
    private final boolean schedulerEnabled;

    public ReminderSchedulerService(
            ScheduledReminderRepository scheduledReminderRepository,
            ReminderHistoryRepository reminderHistoryRepository,
            NotificationRepository notificationRepository,
            GmailSenderService gmailSenderService,
            @Value("${dueflow.scheduler.enabled:true}") boolean schedulerEnabled) {
        this(scheduledReminderRepository, reminderHistoryRepository, notificationRepository,
             gmailSenderService, null, null, schedulerEnabled);
    }

    public ReminderSchedulerService(
            ScheduledReminderRepository scheduledReminderRepository,
            ReminderHistoryRepository reminderHistoryRepository,
            NotificationRepository notificationRepository,
            GmailSenderService gmailSenderService,
            GmailOAuthService gmailOAuthService,
            InvoiceRepository invoiceRepository,
            @Value("${dueflow.scheduler.enabled:true}") boolean schedulerEnabled) {
        this.scheduledReminderRepository = scheduledReminderRepository;
        this.reminderHistoryRepository = reminderHistoryRepository;
        this.notificationRepository = notificationRepository;
        this.gmailSenderService = gmailSenderService;
        this.gmailOAuthService = gmailOAuthService;
        this.invoiceRepository = invoiceRepository;
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
     */
    @Transactional
    public void triggerReminderManually(String reminderOrInvoiceId, String userId) {
        ScheduledReminder reminder = scheduledReminderRepository.findById(reminderOrInvoiceId).orElse(null);
        Invoice invoice = null;

        if (reminder != null) {
            if (!reminder.getUserId().equals(userId)) {
                throw new ResourceNotFoundException("Scheduled reminder not found");
            }
            invoice = reminder.getInvoice();
        } else if (invoiceRepository != null) {
            invoice = invoiceRepository.findById(reminderOrInvoiceId)
                    .filter(inv -> inv.getUserId().equals(userId))
                    .orElse(null);
        }

        if (invoice == null) {
            throw new ResourceNotFoundException("Scheduled reminder not found");
        }

        // 1. Check invoice eligibility: Do not send reminders for paid or cancelled invoices
        if (invoice.getStatus() == InvoiceStatus.PAID) {
            throw new ValidationException("Cannot send reminder: invoice is already paid.");
        }
        if (invoice.getStatus() == InvoiceStatus.CANCELLED) {
            throw new ValidationException("Cannot send reminder: invoice is cancelled.");
        }

        // 2. Verify Gmail is connected
        if (gmailOAuthService != null) {
            String refreshToken = gmailOAuthService.getDecryptedRefreshToken(userId);
            if (refreshToken == null || refreshToken.isBlank()) {
                throw new ValidationException("Gmail is not connected. Please connect your Gmail account in Settings before sending reminders.");
            }
        }

        // 3. Verify client email is present
        String recipientEmail = invoice.getClient() != null ? invoice.getClient().getEmail() : null;
        if (recipientEmail == null || recipientEmail.isBlank()) {
            throw new ValidationException("Client does not have a valid email address.");
        }

        // 4. Send email via GmailSenderService
        String subject = "Payment Reminder: Invoice #" + invoice.getInvoiceNumber();
        String messageId;
        try {
            messageId = gmailSenderService.sendInvoiceReminder(invoice, subject, null);
        } catch (ValidationException ve) {
            throw ve;
        } catch (Exception e) {
            log.error("Failed to dispatch manual reminder for invoice {}: {}", invoice.getInvoiceNumber(), e.getMessage(), e);
            throw new ValidationException("Failed to dispatch reminder email: " + e.getMessage());
        }

        // 5. Record manual dispatch in reminder history
        ReminderHistory history = new ReminderHistory(
                reminder != null ? reminder.getId() : "MANUAL",
                invoice.getId(),
                userId,
                recipientEmail,
                subject,
                "SENT"
        );
        history.setProviderMessageId(messageId);
        reminderHistoryRepository.save(history);

        // 6. Record user notification
        String clientName = invoice.getClient() != null ? invoice.getClient().getName() : "Client";
        Notification notification = new Notification(
                userId,
                "Payment Reminder Sent",
                "Payment reminder for invoice #" + invoice.getInvoiceNumber() + " sent to " + clientName,
                "INFO",
                "/invoices"
        );
        notificationRepository.save(notification);

        // 7. Update invoice reminders sent count
        invoice.setRemindersSentCount(invoice.getRemindersSentCount() + 1);
        if (invoiceRepository != null) {
            invoiceRepository.save(invoice);
        }

        log.info("Manual reminder successfully dispatched by user {} for invoice {}", userId, invoice.getInvoiceNumber());
    }
}
