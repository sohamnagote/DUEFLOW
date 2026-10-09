package in.dueflow.controller;

import in.dueflow.dto.ReminderDtos.*;
import in.dueflow.entity.Profile;
import in.dueflow.repository.ProfileRepository;
import in.dueflow.security.SecurityUtils;
import in.dueflow.service.InvoiceService;
import in.dueflow.service.ReminderService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/reminders")
public class ReminderController {

    private final ReminderService reminderService;
    private final InvoiceService invoiceService;
    private final ProfileRepository profileRepository;

    public ReminderController(ReminderService reminderService,
                              InvoiceService invoiceService,
                              ProfileRepository profileRepository) {
        this.reminderService = reminderService;
        this.invoiceService = invoiceService;
        this.profileRepository = profileRepository;
    }

    @GetMapping("/rules")
    public ResponseEntity<Map<String, List<EnrichedRuleDto>>> getRules() {
        UUID userId = SecurityUtils.getCurrentUserId();
        List<EnrichedRuleDto> rules = reminderService.getRulesForUser(userId);
        return ResponseEntity.ok(Map.of("rules", rules));
    }

    @GetMapping("/logs")
    public ResponseEntity<Map<String, List<EnrichedLogDto>>> getLogs() {
        UUID userId = SecurityUtils.getCurrentUserId();
        List<EnrichedLogDto> logs = reminderService.getLogsForUser(userId);
        return ResponseEntity.ok(Map.of("logs", logs));
    }

    @PostMapping("/process")
    public ResponseEntity<Map<String, Object>> triggerProcess() {
        Map<String, Object> result = reminderService.processPendingReminders();
        return ResponseEntity.ok(result);
    }

    @PostMapping("/schedule")
    public ResponseEntity<Map<String, Object>> saveSchedule(@RequestBody SaveScheduleRequest req) {
        UUID userId = SecurityUtils.getCurrentUserId();
        Profile profile = profileRepository.findById(userId).orElse(new Profile(userId, ""));
        if (req.getRules_json() != null) {
            profile.setReminderScheduleRules(req.getRules_json());
        }
        if (req.getTimezone() != null && !req.getTimezone().isBlank()) {
            profile.setTimezone(req.getTimezone().trim());
        }
        profileRepository.save(profile);

        // Rebuild pending reminder rules for all unpaid active invoices
        invoiceService.rebuildSchedulesForUser(userId);

        return ResponseEntity.ok(Map.of(
                "message", "Reminder schedule saved and pending reminders rebuilt successfully.",
                "schedule_rules", profile.getReminderScheduleRules() != null ? profile.getReminderScheduleRules() : "[]",
                "timezone", profile.getTimezone()
        ));
    }

    @GetMapping("/template")
    public ResponseEntity<TemplateSettingsDto> getTemplate() {
        UUID userId = SecurityUtils.getCurrentUserId();
        Profile profile = profileRepository.findById(userId).orElse(new Profile(userId, ""));
        List<String> placeholders = List.of(
                "{{client_name}}",
                "{{invoice_number}}",
                "{{invoice_amount}}",
                "{{due_date}}",
                "{{business_name}}",
                "{{sender_name}}",
                "{{upi_id}}"
        );
        return ResponseEntity.ok(new TemplateSettingsDto(
                profile.getEmailTone() != null ? profile.getEmailTone() : "professional",
                profile.getCustomEmailSubject() != null ? profile.getCustomEmailSubject() : "",
                profile.getCustomEmailBody() != null ? profile.getCustomEmailBody() : "",
                placeholders
        ));
    }

    @PostMapping("/template")
    public ResponseEntity<Map<String, Object>> saveTemplate(@RequestBody SaveTemplateRequest req) {
        UUID userId = SecurityUtils.getCurrentUserId();
        Profile profile = profileRepository.findById(userId).orElse(new Profile(userId, ""));
        if (req.getTone() != null) profile.setEmailTone(req.getTone());
        if (req.getSubject() != null) profile.setCustomEmailSubject(req.getSubject());
        if (req.getBody() != null) profile.setCustomEmailBody(req.getBody());
        profileRepository.save(profile);

        return ResponseEntity.ok(Map.of(
                "message", "Email template preferences saved successfully.",
                "tone", profile.getEmailTone(),
                "subject", profile.getCustomEmailSubject() != null ? profile.getCustomEmailSubject() : "",
                "body", profile.getCustomEmailBody() != null ? profile.getCustomEmailBody() : ""
        ));
    }
}
