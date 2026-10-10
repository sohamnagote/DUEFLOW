package com.dueflow.service;

import com.dueflow.domain.*;
import com.dueflow.exception.ResourceNotFoundException;
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
    private final boolean schedulerEnabled;

    public ReminderSchedulerService(
            ScheduledReminderRepository scheduledReminderRepository,
            ReminderHistoryRepository reminderHistoryRepository,
            NotificationRepository notificationRepository,
            GmailSenderService gmailSenderService,
            @Value("${dueflow.scheduler.enabled:true}") boolean schedulerEnabled) {
        this.scheduledReminderRepository = scheduledReminderRepository;
        this.reminderHistoryRepository = reminderHistoryRepository;
        this.notificationRepository = notificationRepository;
        this.gmailSenderService = gmailSenderService;
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
     * Allows immediate manual dispatch of a pending reminder by the owner.
     */
    @Transactional
    public void triggerReminderManually(String reminderId, String userId) {
        ScheduledReminder reminder = scheduledReminderRepository.findById(reminderId)
                .orElseThrow(() -> new ResourceNotFoundException("Scheduled reminder not found"));

        if (!reminder.getUserId().equals(userId)) {
            throw new ResourceNotFoundException("Scheduled reminder not found");
        }

        processSingleReminder(reminderId);
    }
}
