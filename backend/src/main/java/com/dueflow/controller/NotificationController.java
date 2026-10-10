package com.dueflow.controller;

import com.dueflow.dto.NotificationDto;
import com.dueflow.security.SecurityUtils;
import com.dueflow.service.NotificationService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    private final NotificationService notificationService;

    public NotificationController(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    @GetMapping
    public ResponseEntity<List<NotificationDto>> getNotifications(@RequestParam(defaultValue = "30") int limit) {
        String userId = SecurityUtils.getRequiredUserId();
        return ResponseEntity.ok(notificationService.getUserNotifications(userId, limit));
    }

    @GetMapping("/unread-count")
    public ResponseEntity<Map<String, Long>> getUnreadCount() {
        String userId = SecurityUtils.getRequiredUserId();
        long count = notificationService.getUnreadCount(userId);
        return ResponseEntity.ok(Map.of("count", count, "unreadCount", count));
    }

    @PostMapping("/{id}/read")
    public ResponseEntity<Map<String, String>> markAsRead(@PathVariable String id) {
        String userId = SecurityUtils.getRequiredUserId();
        notificationService.markAsRead(id, userId);
        return ResponseEntity.ok(Map.of("message", "Notification marked as read"));
    }

    @PostMapping("/read-all")
    public ResponseEntity<Map<String, String>> markAllAsRead() {
        String userId = SecurityUtils.getRequiredUserId();
        notificationService.markAllAsRead(userId);
        return ResponseEntity.ok(Map.of("message", "All notifications marked as read"));
    }
}
