package com.dueflow.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "clients")
public class Client {

    @Id
    @Column(name = "id", length = 64, nullable = false)
    private String id = UUID.randomUUID().toString();

    @Column(name = "user_id", length = 64, nullable = false)
    private String userId;

    @Column(name = "name", nullable = false)
    private String name;

    @Column(name = "email", nullable = false)
    private String email;

    @Column(name = "phone", length = 50)
    private String phone;

    @Column(name = "billing_address", columnDefinition = "TEXT")
    private String billingAddress;

    @Column(name = "tax_identifier", length = 100)
    private String taxIdentifier;

    @Column(name = "internal_notes", columnDefinition = "TEXT")
    private String internalNotes;

    @Column(name = "reminder_tone", length = 30)
    private String reminderTone = "PROFESSIONAL";

    @Column(name = "preferred_channel", length = 30)
    private String preferredChannel = "EMAIL";

    @Column(name = "timezone", length = 100)
    private String timezone = "Asia/Kolkata";

    @Column(name = "allowed_days")
    private String allowedDays = "MONDAY,TUESDAY,WEDNESDAY,THURSDAY,FRIDAY";

    @Column(name = "communication_window_start", length = 10)
    private String communicationWindowStart = "09:00";

    @Column(name = "communication_window_end", length = 10)
    private String communicationWindowEnd = "18:00";

    @Column(name = "quiet_hours_start", length = 10)
    private String quietHoursStart = "21:00";

    @Column(name = "quiet_hours_end", length = 10)
    private String quietHoursEnd = "08:00";

    @Column(name = "automated_reminders_enabled", nullable = false)
    private boolean automatedRemindersEnabled = true;

    @Column(name = "communication_notes", columnDefinition = "TEXT")
    private String communicationNotes;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    public Client() {
    }

    public Client(String userId, String name, String email) {
        this.userId = userId;
        this.name = name;
        this.email = email;
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

    public String getReminderTone() {
        return reminderTone != null ? reminderTone : "PROFESSIONAL";
    }

    public void setReminderTone(String reminderTone) {
        this.reminderTone = reminderTone;
    }

    public String getPreferredChannel() {
        return preferredChannel != null ? preferredChannel : "EMAIL";
    }

    public void setPreferredChannel(String preferredChannel) {
        this.preferredChannel = preferredChannel;
    }

    public String getTimezone() {
        return timezone != null ? timezone : "Asia/Kolkata";
    }

    public void setTimezone(String timezone) {
        this.timezone = timezone;
    }

    public String getAllowedDays() {
        return allowedDays != null ? allowedDays : "MONDAY,TUESDAY,WEDNESDAY,THURSDAY,FRIDAY";
    }

    public void setAllowedDays(String allowedDays) {
        this.allowedDays = allowedDays;
    }

    public String getCommunicationWindowStart() {
        return communicationWindowStart != null ? communicationWindowStart : "09:00";
    }

    public void setCommunicationWindowStart(String communicationWindowStart) {
        this.communicationWindowStart = communicationWindowStart;
    }

    public String getCommunicationWindowEnd() {
        return communicationWindowEnd != null ? communicationWindowEnd : "18:00";
    }

    public void setCommunicationWindowEnd(String communicationWindowEnd) {
        this.communicationWindowEnd = communicationWindowEnd;
    }

    public String getQuietHoursStart() {
        return quietHoursStart != null ? quietHoursStart : "21:00";
    }

    public void setQuietHoursStart(String quietHoursStart) {
        this.quietHoursStart = quietHoursStart;
    }

    public String getQuietHoursEnd() {
        return quietHoursEnd != null ? quietHoursEnd : "08:00";
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
