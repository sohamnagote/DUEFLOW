package com.dueflow.dto;

import com.dueflow.domain.ScheduledReminder;

import java.time.Instant;

public class ScheduledReminderDto {
    private String id;
    private String invoiceId;
    private String invoiceNumber;
    private String clientName;
    private String ruleLabel;
    private Instant scheduledAt;
    private String status;
    private int attemptCount;
    private Instant lastAttemptAt;

    public ScheduledReminderDto() {
    }

    public static ScheduledReminderDto fromEntity(ScheduledReminder r) {
        if (r == null) return null;
        ScheduledReminderDto dto = new ScheduledReminderDto();
        dto.setId(r.getId());
        if (r.getInvoice() != null) {
            dto.setInvoiceId(r.getInvoice().getId());
            dto.setInvoiceNumber(r.getInvoice().getInvoiceNumber());
            if (r.getInvoice().getClient() != null) {
                dto.setClientName(r.getInvoice().getClient().getName());
            }
        }
        if (r.getRule() != null) {
            dto.setRuleLabel(r.getRule().getLabel());
        }
        dto.setScheduledAt(r.getScheduledAt());
        dto.setStatus(r.getStatus() != null ? r.getStatus().name() : null);
        dto.setAttemptCount(r.getAttemptCount());
        dto.setLastAttemptAt(r.getLastAttemptAt());
        return dto;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getInvoiceId() {
        return invoiceId;
    }

    public void setInvoiceId(String invoiceId) {
        this.invoiceId = invoiceId;
    }

    public String getInvoiceNumber() {
        return invoiceNumber;
    }

    public void setInvoiceNumber(String invoiceNumber) {
        this.invoiceNumber = invoiceNumber;
    }

    public String getClientName() {
        return clientName;
    }

    public void setClientName(String clientName) {
        this.clientName = clientName;
    }

    public String getRuleLabel() {
        return ruleLabel;
    }

    public void setRuleLabel(String ruleLabel) {
        this.ruleLabel = ruleLabel;
    }

    public Instant getScheduledAt() {
        return scheduledAt;
    }

    public void setScheduledAt(Instant scheduledAt) {
        this.scheduledAt = scheduledAt;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public int getAttemptCount() {
        return attemptCount;
    }

    public void setAttemptCount(int attemptCount) {
        this.attemptCount = attemptCount;
    }

    public Instant getLastAttemptAt() {
        return lastAttemptAt;
    }

    public void setLastAttemptAt(Instant lastAttemptAt) {
        this.lastAttemptAt = lastAttemptAt;
    }
}
