package com.dueflow.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "reminder_history")
public class ReminderHistory {

    @Id
    @Column(name = "id", length = 64, nullable = false)
    private String id = UUID.randomUUID().toString();

    @Column(name = "scheduled_reminder_id", length = 64)
    private String scheduledReminderId;

    @Column(name = "invoice_id", length = 64, nullable = false)
    private String invoiceId;

    @Column(name = "user_id", length = 64, nullable = false)
    private String userId;

    @Column(name = "recipient_email", nullable = false)
    private String recipientEmail;

    @Column(name = "subject", nullable = false)
    private String subject;

    @Column(name = "status", length = 30, nullable = false)
    private String status; // SENT, FAILED

    @Column(name = "provider_message_id")
    private String providerMessageId;

    @Column(name = "provider_thread_id")
    private String providerThreadId;

    @Column(name = "error_category", length = 100)
    private String errorCategory;

    @Column(name = "error_message", columnDefinition = "TEXT")
    private String errorMessage;

    @Column(name = "attempted_at", nullable = false)
    private Instant attemptedAt = Instant.now();

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    public ReminderHistory() {
    }

    public ReminderHistory(String scheduledReminderId, String invoiceId, String userId, String recipientEmail, String subject, String status) {
        this.scheduledReminderId = scheduledReminderId;
        this.invoiceId = invoiceId;
        this.userId = userId;
        this.recipientEmail = recipientEmail;
        this.subject = subject;
        this.status = status;
        this.attemptedAt = Instant.now();
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getScheduledReminderId() {
        return scheduledReminderId;
    }

    public void setScheduledReminderId(String scheduledReminderId) {
        this.scheduledReminderId = scheduledReminderId;
    }

    public String getInvoiceId() {
        return invoiceId;
    }

    public void setInvoiceId(String invoiceId) {
        this.invoiceId = invoiceId;
    }

    public String getUserId() {
        return userId;
    }

    public void setUserId(String userId) {
        this.userId = userId;
    }

    public String getRecipientEmail() {
        return recipientEmail;
    }

    public void setRecipientEmail(String recipientEmail) {
        this.recipientEmail = recipientEmail;
    }

    public String getSubject() {
        return subject;
    }

    public void setSubject(String subject) {
        this.subject = subject;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getProviderMessageId() {
        return providerMessageId;
    }

    public void setProviderMessageId(String providerMessageId) {
        this.providerMessageId = providerMessageId;
    }

    public String getProviderThreadId() {
        return providerThreadId;
    }

    public void setProviderThreadId(String providerThreadId) {
        this.providerThreadId = providerThreadId;
    }

    public String getErrorCategory() {
        return errorCategory;
    }

    public void setErrorCategory(String errorCategory) {
        this.errorCategory = errorCategory;
    }

    public String getErrorMessage() {
        return errorMessage;
    }

    public void setErrorMessage(String errorMessage) {
        this.errorMessage = errorMessage;
    }

    public Instant getAttemptedAt() {
        return attemptedAt;
    }

    public void setAttemptedAt(Instant attemptedAt) {
        this.attemptedAt = attemptedAt;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }
}
