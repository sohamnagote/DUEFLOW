package com.dueflow.service;

import com.dueflow.domain.Notification;
import com.dueflow.dto.NotificationDto;
import com.dueflow.exception.ResourceNotFoundException;
import com.dueflow.repository.NotificationRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class NotificationService {

    private final NotificationRepository notificationRepository;

    public NotificationService(NotificationRepository notificationRepository) {
        this.notificationRepository = notificationRepository;
    }

    @Transactional(readOnly = true)
    public List<NotificationDto> getUserNotifications(String userId, int limit) {
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(userId, PageRequest.of(0, Math.min(limit, 50)))
                .stream()
                .map(NotificationDto::fromEntity)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public long getUnreadCount(String userId) {
        return notificationRepository.countByUserIdAndIsReadFalse(userId);
    }

    @Transactional
    public void markAsRead(String id, String userId) {
        Notification notification = notificationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Notification not found"));
        if (!notification.getUserId().equals(userId)) {
            throw new ResourceNotFoundException("Notification not found");
        }
        notification.setRead(true);
        notificationRepository.save(notification);
    }

    @Transactional
    public void markAllAsRead(String userId) {
        List<Notification> unreadList = notificationRepository.findByUserIdAndIsReadFalseOrderByCreatedAtDesc(userId);
        for (Notification n : unreadList) {
            n.setRead(true);
        }
        notificationRepository.saveAll(unreadList);
    }

    @Transactional
    public NotificationDto createNotification(String userId, String title, String message, String type, String invoiceId) {
        Notification notification = new Notification(userId, title, message, type, invoiceId);
        Notification saved = notificationRepository.save(notification);
        return NotificationDto.fromEntity(saved);
    }
}
