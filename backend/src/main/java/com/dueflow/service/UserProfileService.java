package com.dueflow.service;

import com.dueflow.domain.Invoice;
import com.dueflow.domain.InvoiceStatus;
import com.dueflow.domain.PaymentSettings;
import com.dueflow.domain.UserProfile;
import com.dueflow.dto.PaymentSettingsDto;
import com.dueflow.dto.UserProfileDto;
import com.dueflow.repository.GmailIntegrationRepository;
import com.dueflow.repository.InvoiceRepository;
import com.dueflow.repository.PaymentSettingsRepository;
import com.dueflow.repository.ScheduledReminderRepository;
import com.dueflow.repository.UserProfileRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class UserProfileService {

    private static final Logger log = LoggerFactory.getLogger(UserProfileService.class);

    private final UserProfileRepository userProfileRepository;
    private final PaymentSettingsRepository paymentSettingsRepository;

    @Autowired(required = false)
    private GmailIntegrationRepository gmailIntegrationRepository;

    @Autowired(required = false)
    private ScheduledReminderRepository scheduledReminderRepository;

    @Autowired(required = false)
    private InvoiceRepository invoiceRepository;

    @Autowired(required = false)
    private ReminderScheduleCalculator reminderScheduleCalculator;

    public UserProfileService(UserProfileRepository userProfileRepository,
                              PaymentSettingsRepository paymentSettingsRepository) {
        this.userProfileRepository = userProfileRepository;
        this.paymentSettingsRepository = paymentSettingsRepository;
    }

    public UserProfileService(UserProfileRepository userProfileRepository,
                              PaymentSettingsRepository paymentSettingsRepository,
                              GmailIntegrationRepository gmailIntegrationRepository,
                              ScheduledReminderRepository scheduledReminderRepository,
                              InvoiceRepository invoiceRepository,
                              ReminderScheduleCalculator reminderScheduleCalculator) {
        this.userProfileRepository = userProfileRepository;
        this.paymentSettingsRepository = paymentSettingsRepository;
        this.gmailIntegrationRepository = gmailIntegrationRepository;
        this.scheduledReminderRepository = scheduledReminderRepository;
        this.invoiceRepository = invoiceRepository;
        this.reminderScheduleCalculator = reminderScheduleCalculator;
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
                        newProfile.setAutomatedRemindersEnabled(true);
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
        boolean previousRemindersState = profile.isAutomatedRemindersEnabled();

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

        boolean newRemindersState = dto.isAutomatedRemindersEnabled();
        profile.setAutomatedRemindersEnabled(newRemindersState);

        UserProfile saved = userProfileRepository.save(profile);

        // Handle scheduler sync when automated reminder preference changes
        if (previousRemindersState != newRemindersState) {
            if (!newRemindersState) {
                // Pausing future automated dispatches without deleting invoice records or history
                if (scheduledReminderRepository != null) {
                    int cancelled = scheduledReminderRepository.cancelPendingForUser(userId);
                    log.info("Paused {} pending automated reminders for user {}", cancelled, userId);
                }
            } else {
                // Re-enabling reminders recalculates eligible future reminders without duplicates
                if (invoiceRepository != null && reminderScheduleCalculator != null) {
                    List<Invoice> unpaidInvoices = invoiceRepository.findByUserIdOrderByCreatedAtDesc(userId);
                    for (Invoice inv : unpaidInvoices) {
                        if (inv.getStatus() != InvoiceStatus.PAID && inv.getStatus() != InvoiceStatus.CANCELLED) {
                            reminderScheduleCalculator.scheduleRemindersForInvoice(inv);
                        }
                    }
                    log.info("Recalculated reminders for active invoices of user {}", userId);
                }
            }
        }

        return saved;
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

        // Custom Invoice Branding Fields
        if (dto.getBusinessName() != null) {
            settings.setBusinessName(dto.getBusinessName().trim());
        }
        if (dto.getLogoUrl() != null) {
            settings.setLogoUrl(dto.getLogoUrl().trim());
        }
        if (dto.getBusinessEmail() != null) {
            settings.setBusinessEmail(dto.getBusinessEmail().trim());
        }
        if (dto.getBusinessPhone() != null) {
            settings.setBusinessPhone(dto.getBusinessPhone().trim());
        }
        if (dto.getBusinessAddress() != null) {
            settings.setBusinessAddress(dto.getBusinessAddress().trim());
        }
        if (dto.getBrandColor() != null && !dto.getBrandColor().isBlank()) {
            settings.setBrandColor(dto.getBrandColor().trim());
        }
        if (dto.getFooterTerms() != null) {
            settings.setFooterTerms(dto.getFooterTerms().trim());
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

    @Transactional
    public PaymentSettings updateLogoUrl(String userId, String logoUrl, String storagePath) {
        ensureProfileExists(userId);

        PaymentSettings settings = paymentSettingsRepository.findByUserId(userId)
                .orElseGet(() -> new PaymentSettings(userId));
        settings.setLogoUrl(logoUrl);
        settings.setLogoStoragePath(storagePath);
        return paymentSettingsRepository.save(settings);
    }

    @Transactional(readOnly = true)
    public void populateGmailStatus(String userId, UserProfileDto dto) {
        if (gmailIntegrationRepository == null || dto == null) return;
        gmailIntegrationRepository.findByUserId(userId).ifPresentOrElse(g -> {
            boolean valid = "CONNECTED".equalsIgnoreCase(g.getConnectionStatus())
                    && g.getEncryptedRefreshToken() != null
                    && !g.getEncryptedRefreshToken().isBlank();
            dto.setGmailConnected(valid);
            dto.setGmailEmail(g.getGmailEmail());
            dto.setGmailStatus(valid ? "CONNECTED" : (g.getConnectionStatus() != null ? g.getConnectionStatus() : "DISCONNECTED"));
        }, () -> {
            dto.setGmailConnected(false);
            dto.setGmailEmail(null);
            dto.setGmailStatus("DISCONNECTED");
        });
    }
}
