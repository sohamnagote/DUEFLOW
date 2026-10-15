package com.dueflow.dto;

import com.dueflow.domain.Client;
import com.fasterxml.jackson.annotation.JsonAlias;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.Instant;

public class ClientDto {
    private String id;

    @NotBlank(message = "Client name is required")
    @Size(max = 255, message = "Client name cannot exceed 255 characters")
    private String name;

    @NotBlank(message = "Client email is required")
    @Email(message = "Valid email address is required")
    private String email;

    private String phone;

    @JsonAlias({"billing_address", "billingAddress", "address"})
    private String billingAddress;

    @JsonAlias({"tax_identifier", "taxIdentifier"})
    private String taxIdentifier;

    @JsonAlias({"internal_notes", "internalNotes", "notes"})
    private String internalNotes;

    @JsonAlias({"total_invoiced", "totalInvoiced"})
    private BigDecimal totalInvoiced = BigDecimal.ZERO;

    @JsonAlias({"total_outstanding", "totalOutstanding", "pending_balance"})
    private BigDecimal totalOutstanding = BigDecimal.ZERO;

    @JsonAlias({"invoices_count", "invoicesCount"})
    private int invoicesCount = 0;

    @JsonAlias({"created_at", "createdAt"})
    private Instant createdAt;

    @JsonAlias({"reminder_tone", "reminderTone"})
    private String reminderTone = "PROFESSIONAL";

    @JsonAlias({"preferred_channel", "preferredChannel"})
    private String preferredChannel = "EMAIL";

    private String timezone = "Asia/Kolkata";

    @JsonAlias({"allowed_days", "allowedDays"})
    private String allowedDays = "MONDAY,TUESDAY,WEDNESDAY,THURSDAY,FRIDAY";

    @JsonAlias({"communication_window_start", "communicationWindowStart"})
    private String communicationWindowStart = "09:00";

    @JsonAlias({"communication_window_end", "communicationWindowEnd"})
    private String communicationWindowEnd = "18:00";

    @JsonAlias({"quiet_hours_start", "quietHoursStart"})
    private String quietHoursStart = "21:00";

    @JsonAlias({"quiet_hours_end", "quietHoursEnd"})
    private String quietHoursEnd = "08:00";

    @JsonAlias({"automated_reminders_enabled", "automatedRemindersEnabled"})
    private boolean automatedRemindersEnabled = true;

    @JsonAlias({"communication_notes", "communicationNotes"})
    private String communicationNotes;

    public ClientDto() {
    }

    public static ClientDto fromEntity(Client c) {
        if (c == null) return null;
        ClientDto dto = new ClientDto();
        dto.setId(c.getId());
        dto.setName(c.getName());
        dto.setEmail(c.getEmail());
        dto.setPhone(c.getPhone());
        dto.setBillingAddress(c.getBillingAddress());
        dto.setTaxIdentifier(c.getTaxIdentifier());
        dto.setInternalNotes(c.getInternalNotes());
        dto.setCreatedAt(c.getCreatedAt());

        dto.setReminderTone(c.getReminderTone());
        dto.setPreferredChannel(c.getPreferredChannel());
        dto.setTimezone(c.getTimezone());
        dto.setAllowedDays(c.getAllowedDays());
        dto.setCommunicationWindowStart(c.getCommunicationWindowStart());
        dto.setCommunicationWindowEnd(c.getCommunicationWindowEnd());
        dto.setQuietHoursStart(c.getQuietHoursStart());
        dto.setQuietHoursEnd(c.getQuietHoursEnd());
        dto.setAutomatedRemindersEnabled(c.isAutomatedRemindersEnabled());
        dto.setCommunicationNotes(c.getCommunicationNotes());
        return dto;
    }


    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPhone() {
        return phone;
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }

    public String getBillingAddress() {
        return billingAddress;
    }

    public void setBillingAddress(String billingAddress) {
        this.billingAddress = billingAddress;
    }

    public String getTaxIdentifier() {
        return taxIdentifier;
    }

    public void setTaxIdentifier(String taxIdentifier) {
        this.taxIdentifier = taxIdentifier;
    }

    public String getInternalNotes() {
        return internalNotes;
    }

    public void setInternalNotes(String internalNotes) {
        this.internalNotes = internalNotes;
    }

    public BigDecimal getTotalInvoiced() {
        return totalInvoiced;
    }

    public void setTotalInvoiced(BigDecimal totalInvoiced) {
        this.totalInvoiced = totalInvoiced;
    }

    public BigDecimal getTotalOutstanding() {
        return totalOutstanding;
    }

    public void setTotalOutstanding(BigDecimal totalOutstanding) {
        this.totalOutstanding = totalOutstanding;
    }

    public int getInvoicesCount() {
        return invoicesCount;
    }

    public void setInvoicesCount(int invoicesCount) {
        this.invoicesCount = invoicesCount;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public String getReminderTone() {
        return reminderTone;
    }

    public void setReminderTone(String reminderTone) {
        this.reminderTone = reminderTone;
    }

    public String getPreferredChannel() {
        return preferredChannel;
    }

    public void setPreferredChannel(String preferredChannel) {
        this.preferredChannel = preferredChannel;
    }

    public String getTimezone() {
        return timezone;
    }

    public void setTimezone(String timezone) {
        this.timezone = timezone;
    }

    public String getAllowedDays() {
        return allowedDays;
    }

    public void setAllowedDays(String allowedDays) {
        this.allowedDays = allowedDays;
    }

    public String getCommunicationWindowStart() {
        return communicationWindowStart;
    }

    public void setCommunicationWindowStart(String communicationWindowStart) {
        this.communicationWindowStart = communicationWindowStart;
    }

    public String getCommunicationWindowEnd() {
        return communicationWindowEnd;
    }

    public void setCommunicationWindowEnd(String communicationWindowEnd) {
        this.communicationWindowEnd = communicationWindowEnd;
    }

    public String getQuietHoursStart() {
        return quietHoursStart;
    }

    public void setQuietHoursStart(String quietHoursStart) {
        this.quietHoursStart = quietHoursStart;
    }

    public String getQuietHoursEnd() {
        return quietHoursEnd;
    }

    public void setQuietHoursEnd(String quietHoursEnd) {
        this.quietHoursEnd = quietHoursEnd;
    }

    public boolean isAutomatedRemindersEnabled() {
        return automatedRemindersEnabled;
    }

    public void setAutomatedRemindersEnabled(boolean automatedRemindersEnabled) {
        this.automatedRemindersEnabled = automatedRemindersEnabled;
    }

    public String getCommunicationNotes() {
        return communicationNotes;
    }

    public void setCommunicationNotes(String communicationNotes) {
        this.communicationNotes = communicationNotes;
    }
}

