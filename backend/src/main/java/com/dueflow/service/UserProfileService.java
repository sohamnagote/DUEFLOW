package com.dueflow.service;

import com.dueflow.domain.PaymentSettings;
import com.dueflow.domain.UserProfile;
import com.dueflow.dto.PaymentSettingsDto;
import com.dueflow.dto.UserProfileDto;
import com.dueflow.repository.PaymentSettingsRepository;
import com.dueflow.repository.UserProfileRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserProfileService {

    private final UserProfileRepository userProfileRepository;
    private final PaymentSettingsRepository paymentSettingsRepository;

    public UserProfileService(UserProfileRepository userProfileRepository,
                              PaymentSettingsRepository paymentSettingsRepository) {
        this.userProfileRepository = userProfileRepository;
        this.paymentSettingsRepository = paymentSettingsRepository;
    }

    @Transactional
    public UserProfile getOrCreateProfile(String userId, String email) {
        return userProfileRepository.findById(userId)
                .map(existing -> {
                    if (email != null && !email.isBlank() && (existing.getEmail() == null || existing.getEmail().isBlank())) {
                        existing.setEmail(email.trim());
                        return userProfileRepository.save(existing);
                    }
                    return existing;
                })
                .orElseGet(() -> {
                    try {
                        UserProfile newProfile = new UserProfile(userId, email != null ? email.trim() : "");
                        return userProfileRepository.saveAndFlush(newProfile);
                    } catch (Exception ex) {
                        return userProfileRepository.findById(userId)
                                .orElseThrow(() -> new IllegalStateException("Failed to initialize user profile: " + ex.getMessage(), ex));
                    }
                });
    }

    @Transactional
    public UserProfile ensureProfileExists(String userId) {
        String email = com.dueflow.security.SecurityUtils.getCurrentUserEmail().orElse("");
        return getOrCreateProfile(userId, email);
    }

    @Transactional
    public UserProfile getProfile(String userId) {
        String email = com.dueflow.security.SecurityUtils.getCurrentUserEmail().orElse("");
        return getOrCreateProfile(userId, email);
    }

    @Transactional
    public UserProfile updateProfile(String userId, UserProfileDto dto) {
        UserProfile profile = getOrCreateProfile(userId, dto.getEmail());

        if (dto.getFullName() != null) {
            String trimmedName = dto.getFullName().trim();
            profile.setFullName(trimmedName);
            if (!trimmedName.isEmpty()) {
                profile.setOnboardingCompleted(true);
            }
        }
        if (dto.isOnboardingCompleted()) {
            profile.setOnboardingCompleted(true);
        }
        if (dto.getEmail() != null && !dto.getEmail().isBlank()) {
            profile.setEmail(dto.getEmail().trim());
        }
        if (dto.getPreferredCurrency() != null && !dto.getPreferredCurrency().isBlank()) {
            profile.setPreferredCurrency(dto.getPreferredCurrency().trim());
        }
        if (dto.getTimezone() != null && !dto.getTimezone().isBlank()) {
            profile.setTimezone(dto.getTimezone().trim());
        }
        profile.setAutomatedRemindersEnabled(dto.isAutomatedRemindersEnabled());

        return userProfileRepository.save(profile);
    }

    @Transactional(readOnly = true)
    public PaymentSettings getPaymentSettings(String userId) {
        return paymentSettingsRepository.findByUserId(userId)
                .orElseGet(() -> new PaymentSettings(userId));
    }

    @Transactional
    public PaymentSettings updatePaymentSettings(String userId, PaymentSettingsDto dto) {
        ensureProfileExists(userId);

        PaymentSettings settings = paymentSettingsRepository.findByUserId(userId)
                .orElseGet(() -> new PaymentSettings(userId));

        if (dto.getUpiId() != null) {
            settings.setUpiId(dto.getUpiId().trim());
        }
        if (dto.getBeneficiaryName() != null) {
            settings.setBeneficiaryName(dto.getBeneficiaryName().trim());
        }
        if (dto.getBankName() != null) {
            settings.setBankName(dto.getBankName().trim());
        }
        if (dto.getAccountNumber() != null) {
            settings.setAccountNumber(dto.getAccountNumber().trim());
        }
        if (dto.getRoutingNumber() != null) {
            settings.setRoutingNumber(dto.getRoutingNumber().trim());
        }
        if (dto.getPaymentInstructions() != null) {
            settings.setPaymentInstructions(dto.getPaymentInstructions().trim());
        }
        if (dto.getPaymentQrUrl() != null) {
            settings.setQrCodeUrl(dto.getPaymentQrUrl());
        }

        return paymentSettingsRepository.save(settings);
    }

    @Transactional
    public PaymentSettings updateQrCodeUrl(String userId, String qrUrl) {
        ensureProfileExists(userId);

        PaymentSettings settings = paymentSettingsRepository.findByUserId(userId)
                .orElseGet(() -> new PaymentSettings(userId));
        settings.setQrCodeUrl(qrUrl);
        return paymentSettingsRepository.save(settings);
    }
}
