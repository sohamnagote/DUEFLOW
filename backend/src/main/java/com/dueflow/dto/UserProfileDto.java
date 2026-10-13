package com.dueflow.dto;

import com.dueflow.domain.UserProfile;
import com.fasterxml.jackson.annotation.JsonAlias;

public class UserProfileDto {
    private String userId;
    private String fullName;
    private String email;
    private String preferredCurrency;
    private String timezone;
    private boolean automatedRemindersEnabled;

    @JsonAlias({"onboarding_completed", "onboardingCompleted", "isOnboarded"})
    private boolean onboardingCompleted;

    public UserProfileDto() {
    }

    public static UserProfileDto fromEntity(UserProfile p) {
        if (p == null) return null;
        UserProfileDto dto = new UserProfileDto();
        dto.setUserId(p.getUserId());
        dto.setFullName(p.getFullName());
        dto.setEmail(p.getEmail());
        dto.setPreferredCurrency(p.getPreferredCurrency());
        dto.setTimezone(p.getTimezone());
        dto.setAutomatedRemindersEnabled(p.isAutomatedRemindersEnabled());
        dto.setOnboardingCompleted(p.isOnboardingCompleted() || (p.getFullName() != null && !p.getFullName().trim().isEmpty()));
        return dto;
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
        this.preferredCurrency = preferredCurrency;
    }

    public String getTimezone() {
        return timezone;
    }

    public void setTimezone(String timezone) {
        this.timezone = timezone;
    }

    public boolean isAutomatedRemindersEnabled() {
        return automatedRemindersEnabled;
    }

    public void setAutomatedRemindersEnabled(boolean automatedRemindersEnabled) {
        this.automatedRemindersEnabled = automatedRemindersEnabled;
    }

    public boolean isOnboardingCompleted() {
        return onboardingCompleted;
    }

    public void setOnboardingCompleted(boolean onboardingCompleted) {
        this.onboardingCompleted = onboardingCompleted;
    }
}
