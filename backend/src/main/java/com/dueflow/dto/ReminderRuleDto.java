package com.dueflow.dto;

import com.dueflow.domain.ReminderRule;
import jakarta.validation.constraints.NotBlank;

public class ReminderRuleDto {
    private String id;

    @NotBlank(message = "Rule label is required")
    private String label;

    @NotBlank(message = "Timing is required (BEFORE, ON_DUE_DATE, AFTER)")
    private String timing;

    private int daysOffset = 0;
    private String sendTime = "09:00";
    private String tone = "FRIENDLY";
    private String timezone = "Asia/Kolkata";
    private String invoiceId;
    private String customSubject;
    private String customMessage;
    private boolean enabled = true;

    public ReminderRuleDto() {
    }

    public static ReminderRuleDto fromEntity(ReminderRule r) {
        if (r == null) return null;
        ReminderRuleDto dto = new ReminderRuleDto();
        dto.setId(r.getId());
        dto.setLabel(r.getLabel());
        dto.setTiming(r.getTiming());
        dto.setDaysOffset(r.getDaysOffset());
        dto.setSendTime(r.getSendTime());
        dto.setTone(r.getTone());
        dto.setTimezone(r.getTimezone());
        dto.setInvoiceId(r.getInvoiceId());
        dto.setCustomSubject(r.getCustomSubject());
        dto.setCustomMessage(r.getCustomMessage());
        dto.setEnabled(r.isEnabled());
        return dto;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
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
}
