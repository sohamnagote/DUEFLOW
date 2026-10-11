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
        return userProfileRepository.findById(userId).orElseGet(() -> {
            UserProfile newProfile = new UserProfile(userId, email != null ? email : "");
            return userProfileRepository.save(newProfile);
        });
    }

    @Transactional(readOnly = true)
    public UserProfile getProfile(String userId) {
        return userProfileRepository.findById(userId)
                .orElseGet(() -> new UserProfile(userId, ""));
    }

    @Transactional
    public UserProfile updateProfile(String userId, UserProfileDto dto) {
        UserProfile profile = userProfileRepository.findById(userId).orElseGet(() -> {
            UserProfile p = new UserProfile(userId, dto.getEmail() != null ? dto.getEmail() : "");
            return p;
        });

        if (dto.getFullName() != null) {
            profile.setFullName(dto.getFullName().trim());
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
        if (!userProfileRepository.existsById(userId)) {
            userProfileRepository.save(new UserProfile(userId, com.dueflow.security.SecurityUtils.getCurrentUserEmail().orElse("")));
        }

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
        if (!userProfileRepository.existsById(userId)) {
            userProfileRepository.save(new UserProfile(userId, com.dueflow.security.SecurityUtils.getCurrentUserEmail().orElse("")));
        }

        PaymentSettings settings = paymentSettingsRepository.findByUserId(userId)
                .orElseGet(() -> new PaymentSettings(userId));
        settings.setQrCodeUrl(qrUrl);
        return paymentSettingsRepository.save(settings);
    }
}
