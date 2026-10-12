package com.dueflow.controller;

import com.dueflow.dto.ReminderHistoryDto;
import com.dueflow.dto.ReminderRuleDto;
import com.dueflow.dto.ScheduledReminderDto;
import com.dueflow.security.SecurityUtils;
import com.dueflow.service.ReminderService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping({"/api/reminders", "/reminders"})
public class ReminderController {

    private final ReminderService reminderService;

    public ReminderController(ReminderService reminderService) {
        this.reminderService = reminderService;
    }

    @GetMapping
    public ResponseEntity<List<ScheduledReminderDto>> getUpcomingReminders() {
        String userId = SecurityUtils.getRequiredUserId();
        return ResponseEntity.ok(reminderService.getUpcomingReminders(userId));
    }

    @GetMapping("/history")
    public ResponseEntity<List<ReminderHistoryDto>> getReminderHistory(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        String userId = SecurityUtils.getRequiredUserId();
        return ResponseEntity.ok(reminderService.getReminderHistory(userId, page, size));
    }

    @GetMapping("/rules")
    public ResponseEntity<List<ReminderRuleDto>> getReminderRules() {
        String userId = SecurityUtils.getRequiredUserId();
        return ResponseEntity.ok(reminderService.getReminderRules(userId));
    }

    @PostMapping("/rules")
    public ResponseEntity<ReminderRuleDto> createReminderRule(@Valid @RequestBody ReminderRuleDto dto) {
        String userId = SecurityUtils.getRequiredUserId();
        ReminderRuleDto created = reminderService.createReminderRule(userId, dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/rules/{id}")
    public ResponseEntity<ReminderRuleDto> updateReminderRule(@PathVariable String id, @Valid @RequestBody ReminderRuleDto dto) {
        String userId = SecurityUtils.getRequiredUserId();
        return ResponseEntity.ok(reminderService.updateReminderRule(userId, id, dto));
    }

    @DeleteMapping("/rules/{id}")
    public ResponseEntity<Map<String, String>> deleteReminderRule(@PathVariable String id) {
        String userId = SecurityUtils.getRequiredUserId();
        reminderService.deleteReminderRule(userId, id);
        return ResponseEntity.ok(Map.of("message", "Reminder rule deleted successfully"));
    }

    @PostMapping({"/{id}/trigger", "/trigger/{id}", "/remind-now/{id}"})
    public ResponseEntity<Map<String, String>> triggerReminder(@PathVariable String id) {
        String userId = SecurityUtils.getRequiredUserId();
        reminderService.triggerReminder(userId, id);
        return ResponseEntity.ok(Map.of("message", "Payment reminder sent successfully"));
    }
}
