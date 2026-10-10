package com.dueflow.service;

import com.dueflow.domain.*;
import com.dueflow.repository.ReminderRuleRepository;
import com.dueflow.repository.ScheduledReminderRepository;
import com.dueflow.repository.UserProfileRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.*;
import java.util.List;

@Service
public class ReminderScheduleCalculator {

    private static final Logger log = LoggerFactory.getLogger(ReminderScheduleCalculator.class);

    private final ReminderRuleRepository ruleRepository;
    private final ScheduledReminderRepository scheduledReminderRepository;
    private final UserProfileRepository userProfileRepository;

    public ReminderScheduleCalculator(ReminderRuleRepository ruleRepository,
                                      ScheduledReminderRepository scheduledReminderRepository,
                                      UserProfileRepository userProfileRepository) {
        this.ruleRepository = ruleRepository;
        this.scheduledReminderRepository = scheduledReminderRepository;
        this.userProfileRepository = userProfileRepository;
    }

    @Transactional
    public void scheduleRemindersForInvoice(Invoice invoice) {
        if (invoice == null || invoice.getStatus() == InvoiceStatus.PAID || invoice.getStatus() == InvoiceStatus.CANCELLED) {
            cancelFutureRemindersForInvoice(invoice != null ? invoice.getId() : null);
            return;
        }

        String userId = invoice.getUserId();
        UserProfile profile = userProfileRepository.findById(userId).orElse(null);
        if (profile != null && !profile.isAutomatedRemindersEnabled()) {
            log.info("Automated reminders globally disabled for user: {}", userId);
            return;
        }

        String timezoneStr = (profile != null && profile.getTimezone() != null) ? profile.getTimezone() : "Asia/Kolkata";
        ZoneId zoneId;
        try {
            zoneId = ZoneId.of(timezoneStr);
        } catch (Exception e) {
            zoneId = ZoneId.of("Asia/Kolkata");
        }

        List<ReminderRule> rules = ruleRepository.findByUserIdAndEnabledTrue(userId);
        if (rules.isEmpty()) {
            // If no user-defined rules, use standard default schedule:
            // 1. 3 days before due date (friendly)
            // 2. On due date (professional)
            // 3. 5 days overdue (firm)
            createDefaultReminders(invoice, zoneId);
            return;
        }

        Instant now = Instant.now();
        for (ReminderRule rule : rules) {
            // If rule is scoped to a specific invoice, ignore other invoices
            if (rule.getInvoiceId() != null && !rule.getInvoiceId().isBlank() && !rule.getInvoiceId().equals(invoice.getId())) {
                continue;
            }

            ZoneId ruleZone = zoneId;
            if (rule.getTimezone() != null && !rule.getTimezone().isBlank()) {
                try {
                    ruleZone = ZoneId.of(rule.getTimezone().trim());
                } catch (Exception ignored) {}
            }

            LocalDate targetDate = calculateTargetDate(invoice.getDueDate(), rule.getTiming(), rule.getDaysOffset());
            LocalTime time = parseLocalTime(rule.getSendTime());
            ZonedDateTime zdt = ZonedDateTime.of(targetDate, time, ruleZone);
            Instant scheduledAt = zdt.toInstant();

            // Unique idempotency key to prevent duplicates
            String idempotencyKey = String.format("rem-%s-%s-%s", invoice.getId(), rule.getId(), targetDate);

            if (!scheduledReminderRepository.existsByIdempotencyKey(idempotencyKey)) {
                // If scheduled in the future or within the last hour (for immediate catch-up)
                if (scheduledAt.isAfter(now.minus(Duration.ofHours(1)))) {
                    ScheduledReminder reminder = new ScheduledReminder(
                            invoice,
                            userId,
                            rule,
                            scheduledAt,
                            idempotencyKey
                    );
                    scheduledReminderRepository.save(reminder);
                    log.info("Scheduled reminder for invoice {} at {} (UTC)", invoice.getInvoiceNumber(), scheduledAt);
                }
            }
        }
    }

    @Transactional
    public void cancelFutureRemindersForInvoice(String invoiceId) {
        if (invoiceId == null) return;
        int cancelled = scheduledReminderRepository.cancelPendingForInvoice(invoiceId);
        if (cancelled > 0) {
            log.info("Cancelled {} pending reminders for invoice {}", cancelled, invoiceId);
        }
    }

    private void createDefaultReminders(Invoice invoice, ZoneId zoneId) {
        Instant now = Instant.now();
        LocalDate dueDate = invoice.getDueDate();
        LocalTime defaultTime = LocalTime.of(9, 0);

        // 1. 3 days before
        scheduleOccurrence(invoice, dueDate.minusDays(3), defaultTime, zoneId, "default-before-3", now);
        // 2. On due date
        scheduleOccurrence(invoice, dueDate, defaultTime, zoneId, "default-on-due", now);
        // 3. 5 days overdue
        scheduleOccurrence(invoice, dueDate.plusDays(5), defaultTime, zoneId, "default-overdue-5", now);
    }

    private void scheduleOccurrence(Invoice invoice, LocalDate date, LocalTime time, ZoneId zoneId, String suffix, Instant now) {
        ZonedDateTime zdt = ZonedDateTime.of(date, time, zoneId);
        Instant scheduledAt = zdt.toInstant();
        String idempotencyKey = String.format("rem-%s-%s-%s", invoice.getId(), suffix, date);

        if (!scheduledReminderRepository.existsByIdempotencyKey(idempotencyKey)) {
            if (scheduledAt.isAfter(now.minus(Duration.ofHours(1)))) {
                ScheduledReminder reminder = new ScheduledReminder(
                        invoice,
                        invoice.getUserId(),
                        null,
                        scheduledAt,
                        idempotencyKey
                );
                scheduledReminderRepository.save(reminder);
            }
        }
    }

    private LocalDate calculateTargetDate(LocalDate dueDate, String timing, int daysOffset) {
        if ("BEFORE".equalsIgnoreCase(timing)) {
            return dueDate.minusDays(Math.abs(daysOffset));
        } else if ("AFTER".equalsIgnoreCase(timing)) {
            return dueDate.plusDays(Math.abs(daysOffset));
        } else {
            return dueDate;
        }
    }

    private LocalTime parseLocalTime(String timeStr) {
        if (timeStr == null || timeStr.isBlank()) {
            return LocalTime.of(9, 0);
        }
        try {
            return LocalTime.parse(timeStr.trim());
        } catch (Exception e) {
            return LocalTime.of(9, 0);
        }
    }
}
