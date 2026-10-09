package in.dueflow.service;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import in.dueflow.entity.ReminderRule;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.*;

/**
 * Customizable Reminder Scheduler Service.
 * Allows users to define custom timing rules (e.g. 2 days before at 10:00 AM, on due date at 09:30 AM),
 * converts dates to user's configured timezone, and generates persistent reminder occurrences.
 */
@Service
public class SchedulerService {

    private static final Logger log = LoggerFactory.getLogger(SchedulerService.class);
    private final ObjectMapper objectMapper = new ObjectMapper()
            .configure(com.fasterxml.jackson.databind.DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);

    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class CustomRuleDefinition {
        @JsonProperty("direction")
        public String direction = "before"; // before, on, after

        @JsonProperty("offset_days")
        @com.fasterxml.jackson.annotation.JsonAlias({"offset_days", "offsetDays"})
        public int offsetDays = 3;

        @JsonProperty("send_time")
        @com.fasterxml.jackson.annotation.JsonAlias({"send_time", "sendTime"})
        public String sendTime = "10:00"; // HH:mm in user's timezone

        @JsonProperty("enabled")
        public boolean enabled = true;

        public CustomRuleDefinition() {}

        public CustomRuleDefinition(String direction, int offsetDays, String sendTime, boolean enabled) {
            this.direction = direction;
            this.offsetDays = offsetDays;
            this.sendTime = sendTime;
            this.enabled = enabled;
        }
    }

    public static class CadenceStage {
        public final int stageNumber;
        public final int offsetDays;
        public final String direction;
        public final String occurrenceKey;
        public final String label;
        public final String sendTime;

        public CadenceStage(int stageNumber, int offsetDays, String direction, String occurrenceKey, String label, String sendTime) {
            this.stageNumber = stageNumber;
            this.offsetDays = offsetDays;
            this.direction = direction;
            this.occurrenceKey = occurrenceKey;
            this.label = label;
            this.sendTime = sendTime != null ? sendTime : "10:00";
        }

        public CadenceStage(int stageNumber, int offsetDays, String direction, String occurrenceKey, String label) {
            this(stageNumber, offsetDays, direction, occurrenceKey, label, "10:00");
        }
    }

    public static final List<CadenceStage> DEFAULT_CADENCE = List.of(
        new CadenceStage(1, 3, "before", "stage_1_3_days_before", "3 Days Before Due Date", "10:00"),
        new CadenceStage(2, 0, "on", "stage_2_on_due_date", "On Due Date", "10:00"),
        new CadenceStage(3, 3, "after", "stage_3_3_days_overdue", "3 Days Overdue", "10:00"),
        new CadenceStage(4, 7, "after", "stage_4_7_days_overdue", "7 Days Overdue", "10:00")
    );

    public Instant computeScheduledTime(LocalDate targetDate, String sendTime, String timezone) {
        ZoneId zoneId;
        try {
            zoneId = (timezone != null && !timezone.isBlank()) ? ZoneId.of(timezone.trim()) : ZoneId.of("Asia/Kolkata");
        } catch (Exception e) {
            zoneId = ZoneId.of("Asia/Kolkata");
        }

        LocalTime time = LocalTime.of(10, 0);
        if (sendTime != null && sendTime.contains(":")) {
            try {
                String[] parts = sendTime.trim().split(":");
                int hour = Integer.parseInt(parts[0]);
                int minute = Integer.parseInt(parts[1]);
                time = LocalTime.of(hour, minute);
            } catch (Exception ignored) {}
        }

        ZonedDateTime localZdt = targetDate.atTime(time).atZone(zoneId);
        return localZdt.toInstant();
    }

    public Instant computeScheduledTime(LocalDate targetDate, String timezone) {
        return computeScheduledTime(targetDate, "10:00", timezone);
    }

    public List<CustomRuleDefinition> parseCustomRules(String customRulesJson) {
        if (customRulesJson == null || customRulesJson.isBlank() || customRulesJson.equals("[]")) {
            return List.of();
        }
        try {
            return objectMapper.readValue(customRulesJson, new TypeReference<List<CustomRuleDefinition>>() {});
        } catch (Exception e) {
            log.warn("[SchedulerService] Could not parse custom rules JSON: {}", e.getMessage());
            return List.of();
        }
    }

    public List<ReminderRule> calculateReminderRules(UUID invoiceId, LocalDate dueDate, String timezone,
                                                     String invoiceStatus, List<String> channels, String customRulesJson) {
        boolean isPaid = "paid".equalsIgnoreCase(invoiceStatus);
        List<String> targetChannels = (channels != null && !channels.isEmpty()) ? channels : List.of("email");
        List<ReminderRule> rules = new ArrayList<>();

        List<CustomRuleDefinition> customRules = parseCustomRules(customRulesJson);

        if (!customRules.isEmpty()) {
            for (String channel : targetChannels) {
                int index = 1;
                for (CustomRuleDefinition cr : customRules) {
                    if (!cr.enabled) {
                        continue;
                    }
                    LocalDate targetDate;
                    String dir = (cr.direction != null) ? cr.direction.toLowerCase() : "before";
                    if ("before".equalsIgnoreCase(dir)) {
                        targetDate = dueDate.minusDays(Math.max(0, cr.offsetDays));
                    } else if ("after".equalsIgnoreCase(dir)) {
                        targetDate = dueDate.plusDays(Math.max(0, cr.offsetDays));
                    } else {
                        targetDate = dueDate;
                        cr.offsetDays = 0;
                        dir = "on";
                    }

                    String timeStr = (cr.sendTime != null && !cr.sendTime.isBlank()) ? cr.sendTime.trim() : "10:00";
                    Instant scheduledFor = computeScheduledTime(targetDate, timeStr, timezone);

                    String cleanTimeKey = timeStr.replace(":", "");
                    String occKey = "custom_" + dir + "_" + cr.offsetDays + "d_" + cleanTimeKey + "_" + index;

                    ReminderRule rule = new ReminderRule();
                    rule.setInvoiceId(invoiceId);
                    rule.setChannel(channel);
                    rule.setOffsetDays(cr.offsetDays);
                    rule.setDirection(dir);
                    rule.setOccurrenceKey(occKey);
                    rule.setScheduledFor(scheduledFor);
                    rule.setStatus(isPaid ? "cancelled" : (cr.enabled ? "pending" : "cancelled"));
                    rule.setEnabled(!isPaid && cr.enabled);
                    rules.add(rule);
                    index++;
                }
            }
        } else {
            // Default 4-stage cadence
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

                    Instant scheduledFor = computeScheduledTime(targetDate, stage.sendTime, timezone);

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
        }

        return rules;
    }

    public List<ReminderRule> calculateReminderRules(UUID invoiceId, LocalDate dueDate, String timezone,
                                                     String invoiceStatus, List<String> channels) {
        return calculateReminderRules(invoiceId, dueDate, timezone, invoiceStatus, channels, null);
    }

    public List<ReminderRule> recomputeRulesForUnpaid(UUID invoiceId, LocalDate dueDate,
                                                      Set<String> sentOccurrenceKeys,
                                                      String timezone, List<String> channels,
                                                      String customRulesJson) {
        List<ReminderRule> freshRules = calculateReminderRules(invoiceId, dueDate, timezone, "unpaid", channels, customRulesJson);
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

    public List<ReminderRule> recomputeRulesForUnpaid(UUID invoiceId, LocalDate dueDate,
                                                      Set<String> sentOccurrenceKeys,
                                                      String timezone, List<String> channels) {
        return recomputeRulesForUnpaid(invoiceId, dueDate, sentOccurrenceKeys, timezone, channels, null);
    }
}
