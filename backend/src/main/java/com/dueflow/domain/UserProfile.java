package com.dueflow.domain;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "user_profiles")
public class UserProfile {

    @Id
    @Column(name = "user_id", length = 64, nullable = false)
    private String userId;

    @Column(name = "full_name")
    private String fullName;

    @Column(name = "email", nullable = false)
    private String email;

    @Column(name = "preferred_currency", length = 10, nullable = false)
    private String preferredCurrency = "INR";

    @Column(name = "timezone", length = 100, nullable = false)
    private String timezone = "Asia/Kolkata";

    @Column(name = "automated_reminders_enabled", nullable = false)
    private boolean automatedRemindersEnabled = true;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    public UserProfile() {
    }

    public UserProfile(String userId, String email) {
        this.userId = userId;
        this.email = email;
    }

    @PreUpdate
    public void onUpdate() {
        this.updatedAt = Instant.now();
    }

    public String getUserId() {
        return userId;
    }

    public void setUserId(String userId) {
        this.userId = userId;
    }

    public String getFullName() {
        return fullName;
    }

    public void setFullName(String fullName) {
        this.fullName = fullName;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPreferredCurrency() {
        return preferredCurrency;
    }

    public void setPreferredCurrency(String preferredCurrency) {
        if ("USD".equalsIgnoreCase(preferredCurrency)) {
            this.preferredCurrency = "USD";
        } else {
            this.preferredCurrency = "INR";
        }
    }

    public String getTimezone() {
        return timezone;
    }

    public void setTimezone(String timezone) {
        this.timezone = (timezone != null && !timezone.isBlank()) ? timezone : "Asia/Kolkata";
    }

    public boolean isAutomatedRemindersEnabled() {
        return automatedRemindersEnabled;
    }

    public void setAutomatedRemindersEnabled(boolean automatedRemindersEnabled) {
        this.automatedRemindersEnabled = automatedRemindersEnabled;
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
