package com.dueflow.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "reminder_rules")
public class ReminderRule {

    @Id
    @Column(name = "id", length = 64, nullable = false)
    private String id = UUID.randomUUID().toString();

    @Column(name = "user_id", length = 64, nullable = false)
    private String userId;

    @Column(name = "label", nullable = false)
    private String label;

    @Column(name = "timing", length = 30, nullable = false)
    private String timing; // BEFORE, ON_DUE_DATE, AFTER

    @Column(name = "days_offset", nullable = false)
    private int daysOffset = 0;

    @Column(name = "send_time", length = 10, nullable = false)
    private String sendTime = "09:00";

    @Column(name = "tone", length = 30, nullable = false)
    private String tone = "FRIENDLY"; // FRIENDLY, PROFESSIONAL, FIRM

    @Column(name = "custom_subject")
    private String customSubject;

    @Column(name = "custom_message", columnDefinition = "TEXT")
    private String customMessage;

    @Column(name = "timezone", length = 100, nullable = false)
    private String timezone = "Asia/Kolkata";

    @Column(name = "invoice_id", length = 64)
    private String invoiceId;

    @Column(name = "enabled", nullable = false)
    private boolean enabled = true;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    public ReminderRule() {
    }

    public ReminderRule(String userId, String label, String timing, int daysOffset, String tone) {
        this.userId = userId;
        this.label = label;
        this.timing = timing;
        this.daysOffset = daysOffset;
        this.tone = tone;
    }

    @PreUpdate
    public void onUpdate() {
        this.updatedAt = Instant.now();
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getUserId() {
        return userId;
    }

    public void setUserId(String userId) {
        this.userId = userId;
    }

    public String getLabel() {
        return label;
    }

    public void setLabel(String label) {
        this.label = label;
    }

    public String getTiming() {
        return timing;
    }

    public void setTiming(String timing) {
        this.timing = timing;
    }

    public int getDaysOffset() {
        return daysOffset;
    }

    public void setDaysOffset(int daysOffset) {
        this.daysOffset = daysOffset;
    }

    public String getSendTime() {
        return sendTime;
    }

    public void setSendTime(String sendTime) {
        this.sendTime = sendTime;
    }

    public String getTone() {
        return tone;
    }

    public void setTone(String tone) {
        this.tone = tone;
    }

    public String getCustomSubject() {
        return customSubject;
    }

    public void setCustomSubject(String customSubject) {
        this.customSubject = customSubject;
    }

    public String getCustomMessage() {
        return customMessage;
    }

    public void setCustomMessage(String customMessage) {
        this.customMessage = customMessage;
    }

    public boolean isEnabled() {
        return enabled;
    }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }

    public String getTimezone() {
        return timezone;
    }

    public void setTimezone(String timezone) {
        this.timezone = timezone;
    }

    public String getInvoiceId() {
        return invoiceId;
    }

    public void setInvoiceId(String invoiceId) {
        this.invoiceId = invoiceId;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = updatedAt;
    }
}
