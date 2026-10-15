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

        // Check reply / review holds
        String followUpStatus = invoice.getFollowUpStatus();
        if (followUpStatus != null && (
                "PAUSED_FOR_REVIEW".equalsIgnoreCase(followUpStatus) ||
                "PAUSED_BY_USER".equalsIgnoreCase(followUpStatus) ||
                "CLIENT_REPLIED".equalsIgnoreCase(followUpStatus))) {
            log.info("Follow-up hold active ({}) for invoice {}. Skipping reminder scheduling.", followUpStatus, invoice.getInvoiceNumber());
            return;
        }

        String userId = invoice.getUserId();
        UserProfile profile = userProfileRepository.findById(userId).orElse(null);
        if (profile != null && !profile.isAutomatedRemindersEnabled()) {
            log.info("Automated reminders globally disabled for user: {}", userId);
            return;
        }

        Client client = invoice.getClient();
        if (client != null && !client.isAutomatedRemindersEnabled()) {
            log.info("Automated reminders disabled for client {} on invoice: {}", client.getName(), invoice.getInvoiceNumber());
            return;
        }

        // Determine timezone: Client preference takes precedence, then profile, then Asia/Kolkata
        String timezoneStr = (client != null && client.getTimezone() != null && !client.getTimezone().isBlank())
                ? client.getTimezone().trim()
                : (profile != null && profile.getTimezone() != null ? profile.getTimezone().trim() : "Asia/Kolkata");
        ZoneId zoneId;
        try {
            zoneId = ZoneId.of(timezoneStr);
        } catch (Exception e) {
            zoneId = ZoneId.of("Asia/Kolkata");
        }

        List<ReminderRule> rules = ruleRepository.findByUserIdAndEnabledTrue(userId);
        if (rules.isEmpty()) {
            createDefaultReminders(invoice, client, zoneId);
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
            LocalTime desiredTime = parseLocalTime(rule.getSendTime());

            ZonedDateTime zdt = adjustToAllowedWindowAndDays(targetDate, desiredTime, client, ruleZone);
            Instant scheduledAt = zdt.toInstant();

            // Unique idempotency key to prevent duplicates
            String idempotencyKey = String.format("rem-%s-%s-%s", invoice.getId(), rule.getId(), zdt.toLocalDate());

            if (!scheduledReminderRepository.existsByIdempotencyKey(idempotencyKey)) {
                if (scheduledAt.isAfter(now.minus(Duration.ofHours(1)))) {
                    ScheduledReminder reminder = new ScheduledReminder(
                            invoice,
                            userId,
                            rule,
                            scheduledAt,
                            idempotencyKey
                    );
                    scheduledReminderRepository.save(reminder);
                    log.info("Scheduled reminder for invoice {} at {} ({})", invoice.getInvoiceNumber(), scheduledAt, ruleZone);
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

    private void createDefaultReminders(Invoice invoice, Client client, ZoneId zoneId) {
        Instant now = Instant.now();
        LocalDate dueDate = invoice.getDueDate();
        LocalTime defaultTime = LocalTime.of(9, 0);

        // 1. 3 days before
        scheduleOccurrence(invoice, client, dueDate.minusDays(3), defaultTime, zoneId, "default-before-3", now);
        // 2. On due date
        scheduleOccurrence(invoice, client, dueDate, defaultTime, zoneId, "default-on-due", now);
        // 3. 5 days overdue
        scheduleOccurrence(invoice, client, dueDate.plusDays(5), defaultTime, zoneId, "default-overdue-5", now);
    }

    private void scheduleOccurrence(Invoice invoice, Client client, LocalDate date, LocalTime time, ZoneId zoneId, String suffix, Instant now) {
        ZonedDateTime zdt = adjustToAllowedWindowAndDays(date, time, client, zoneId);
        Instant scheduledAt = zdt.toInstant();
        String idempotencyKey = String.format("rem-%s-%s-%s", invoice.getId(), suffix, zdt.toLocalDate());

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

    /**
     * Adjust target dispatch date and time according to client communication window,
     * quiet hours, and allowed communication days. Defer, never silently drop!
     */
    public ZonedDateTime adjustToAllowedWindowAndDays(LocalDate targetDate, LocalTime targetTime, Client client, ZoneId zoneId) {
        LocalTime windowStart = LocalTime.of(9, 0);
        LocalTime windowEnd = LocalTime.of(18, 0);
        LocalTime quietStart = LocalTime.of(21, 0);
        LocalTime quietEnd = LocalTime.of(8, 0);
        String allowedDaysStr = "MONDAY,TUESDAY,WEDNESDAY,THURSDAY,FRIDAY";

        if (client != null) {
            if (client.getCommunicationWindowStart() != null) windowStart = parseLocalTime(client.getCommunicationWindowStart());
            if (client.getCommunicationWindowEnd() != null) windowEnd = parseLocalTime(client.getCommunicationWindowEnd());
            if (client.getQuietHoursStart() != null) quietStart = parseLocalTime(client.getQuietHoursStart());
            if (client.getQuietHoursEnd() != null) quietEnd = parseLocalTime(client.getQuietHoursEnd());
            if (client.getAllowedDays() != null && !client.getAllowedDays().isBlank()) allowedDaysStr = client.getAllowedDays();
        }

        LocalDate adjustedDate = targetDate;
        LocalTime adjustedTime = targetTime;

        // Check if targetTime is inside quiet hours or outside communication window
        boolean isInQuietHours = isTimeInQuietHours(adjustedTime, quietStart, quietEnd);
        boolean isOutsideWindow = adjustedTime.isBefore(windowStart) || adjustedTime.isAfter(windowEnd);

        if (isInQuietHours || isOutsideWindow) {
            if (adjustedTime.isBefore(windowStart)) {
                adjustedTime = windowStart;
            } else {
                // If after window end or in quiet evening hours, defer to next day window start
                adjustedDate = adjustedDate.plusDays(1);
                adjustedTime = windowStart;
            }
        }

        // Adjust day if not permitted
        List<String> allowedDays = List.of(allowedDaysStr.toUpperCase().split(","));
        int attempts = 0;
        while (!allowedDays.contains(adjustedDate.getDayOfWeek().name()) && attempts < 14) {
            adjustedDate = adjustedDate.plusDays(1);
            adjustedTime = windowStart;
            attempts++;
        }

        return ZonedDateTime.of(adjustedDate, adjustedTime, zoneId);
    }

    private boolean isTimeInQuietHours(LocalTime time, LocalTime quietStart, LocalTime quietEnd) {
        if (quietStart.isBefore(quietEnd)) {
            // e.g. 01:00 to 07:00
            return !time.isBefore(quietStart) && time.isBefore(quietEnd);
        } else {
            // Crosses midnight, e.g. 21:00 to 08:00
            return !time.isBefore(quietStart) || time.isBefore(quietEnd);
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
