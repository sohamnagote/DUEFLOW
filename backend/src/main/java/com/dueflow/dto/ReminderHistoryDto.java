package com.dueflow.dto;

import com.dueflow.domain.ReminderHistory;

import java.time.Instant;

public class ReminderHistoryDto {
    private String id;
    private String scheduledReminderId;
    private String invoiceId;
    private String recipientEmail;
    private String subject;
    private String status;
    private String providerMessageId;
    private String errorCategory;
    private String errorMessage;
    private Instant attemptedAt;

    public ReminderHistoryDto() {
    }

    public static ReminderHistoryDto fromEntity(ReminderHistory h) {
        if (h == null) return null;
        ReminderHistoryDto dto = new ReminderHistoryDto();
        dto.setId(h.getId());
        dto.setScheduledReminderId(h.getScheduledReminderId());
        dto.setInvoiceId(h.getInvoiceId());
        dto.setRecipientEmail(h.getRecipientEmail());
        dto.setSubject(h.getSubject());
        dto.setStatus(h.getStatus());
        dto.setProviderMessageId(h.getProviderMessageId());
        dto.setErrorCategory(h.getErrorCategory());
        dto.setErrorMessage(h.getErrorMessage());
        dto.setAttemptedAt(h.getAttemptedAt());
        return dto;
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
}
