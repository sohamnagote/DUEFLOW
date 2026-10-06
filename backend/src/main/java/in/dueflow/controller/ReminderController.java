package in.dueflow.controller;

import in.dueflow.dto.ReminderDtos.EnrichedLogDto;
import in.dueflow.dto.ReminderDtos.EnrichedRuleDto;
import in.dueflow.security.SecurityUtils;
import in.dueflow.service.ReminderService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/reminders")
public class ReminderController {

    private final ReminderService reminderService;

    public ReminderController(ReminderService reminderService) {
        this.reminderService = reminderService;
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
}
