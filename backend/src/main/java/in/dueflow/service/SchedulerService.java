package in.dueflow.service;

import in.dueflow.entity.ReminderRule;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.*;

@Service
public class SchedulerService {

    public static class CadenceStage {
        public final int stageNumber;
        public final int offsetDays;
        public final String direction;
        public final String occurrenceKey;
        public final String label;

        public CadenceStage(int stageNumber, int offsetDays, String direction, String occurrenceKey, String label) {
            this.stageNumber = stageNumber;
            this.offsetDays = offsetDays;
            this.direction = direction;
            this.occurrenceKey = occurrenceKey;
            this.label = label;
        }
    }

    public static final List<CadenceStage> DEFAULT_CADENCE = List.of(
        new CadenceStage(1, 3, "before", "stage_1_3_days_before", "3 Days Before Due Date"),
        new CadenceStage(2, 0, "on", "stage_2_on_due_date", "On Due Date"),
        new CadenceStage(3, 3, "after", "stage_3_3_days_overdue", "3 Days Overdue"),
        new CadenceStage(4, 7, "after", "stage_4_7_days_overdue", "7 Days Overdue")
    );

    public Instant computeScheduledTime(LocalDate targetDate, String timezone) {
        ZoneId zoneId;
        try {
            zoneId = (timezone != null && !timezone.isBlank()) ? ZoneId.of(timezone) : ZoneId.of("Asia/Kolkata");
        } catch (Exception e) {
            zoneId = ZoneId.of("Asia/Kolkata");
        }

        // 9:00 AM in the user's local timezone
        ZonedDateTime local9am = targetDate.atTime(9, 0, 0).atZone(zoneId);
        return local9am.toInstant();
    }

    public List<ReminderRule> calculateReminderRules(UUID invoiceId, LocalDate dueDate, String timezone,
                                                     String invoiceStatus, List<String> channels) {
        boolean isPaid = "paid".equalsIgnoreCase(invoiceStatus);
        List<String> targetChannels = (channels != null && !channels.isEmpty()) ? channels : List.of("email");
        List<ReminderRule> rules = new ArrayList<>();

        for (String channel : targetChannels) {
            for (CadenceStage stage : DEFAULT_CADENCE) {
                LocalDate targetDate;
                if ("before".equalsIgnoreCase(stage.direction)) {
                    targetDate = dueDate.minusDays(stage.offsetDays);
                } else if ("after".equalsIgnoreCase(stage.direction)) {
                    targetDate = dueDate.plusDays(stage.offsetDays);
                } else {
                    targetDate = dueDate;
                }

                Instant scheduledFor = computeScheduledTime(targetDate, timezone);

                ReminderRule rule = new ReminderRule();
                rule.setInvoiceId(invoiceId);
                rule.setChannel(channel);
                rule.setOffsetDays(stage.offsetDays);
                rule.setDirection(stage.direction);
                rule.setOccurrenceKey(stage.occurrenceKey);
                rule.setScheduledFor(scheduledFor);
                rule.setStatus(isPaid ? "cancelled" : "pending");
                rule.setEnabled(!isPaid);
                rules.add(rule);
            }
        }

        return rules;
    }

    public List<ReminderRule> recomputeRulesForUnpaid(UUID invoiceId, LocalDate dueDate,
                                                      Set<String> sentOccurrenceKeys,
                                                      String timezone, List<String> channels) {
        List<ReminderRule> freshRules = calculateReminderRules(invoiceId, dueDate, timezone, "unpaid", channels);
        Instant now = Instant.now();

        List<ReminderRule> result = new ArrayList<>();
        for (ReminderRule rule : freshRules) {
            String channelSpecificKey = rule.getOccurrenceKey() + "_" + rule.getChannel();
            boolean wasSent = sentOccurrenceKeys.contains(rule.getOccurrenceKey()) ||
                              sentOccurrenceKeys.contains(channelSpecificKey);

            if (wasSent) {
                rule.setStatus("sent");
                rule.setEnabled(false);
            } else if (rule.getScheduledFor().isBefore(now)) {
                // If scheduled time was in the past, mark skipped to prevent spamming client
                rule.setStatus("skipped");
                rule.setEnabled(false);
            } else {
                rule.setStatus("pending");
                rule.setEnabled(true);
            }
            result.add(rule);
        }

        return result;
    }
}
