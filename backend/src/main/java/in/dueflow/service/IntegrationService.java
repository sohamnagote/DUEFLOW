package in.dueflow.service;

import in.dueflow.dto.IntegrationDtos.ChannelSettingsDto;
import in.dueflow.dto.IntegrationDtos.SafeIntegrationDto;
import in.dueflow.dto.IntegrationDtos.UpdateSettingsRequest;
import in.dueflow.entity.Integration;
import in.dueflow.entity.Profile;
import in.dueflow.exception.BadRequestException;
import in.dueflow.repository.IntegrationRepository;
import in.dueflow.repository.ProfileRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class IntegrationService {

    private final IntegrationRepository integrationRepository;
    private final ProfileRepository profileRepository;

    public IntegrationService(IntegrationRepository integrationRepository, ProfileRepository profileRepository) {
        this.integrationRepository = integrationRepository;
        this.profileRepository = profileRepository;
    }

    public Map<String, Object> getIntegrationsAndSettings(UUID userId) {
        List<Integration> integrations = integrationRepository.findByUserId(userId);
        Profile profile = profileRepository.findById(userId).orElse(new Profile(userId, ""));

        List<SafeIntegrationDto> safeIntegrations = integrations.stream()
                .map(SafeIntegrationDto::from)
                .collect(Collectors.toList());

        boolean emailConnected = integrations.stream()
                .anyMatch(i -> "email".equalsIgnoreCase(i.getChannel()) && "CONNECTED".equalsIgnoreCase(i.getStatus()));
        boolean whatsappConnected = integrations.stream()
                .anyMatch(i -> "whatsapp".equalsIgnoreCase(i.getChannel()) && "CONNECTED".equalsIgnoreCase(i.getStatus()));

        String defaultReminderChannel = profile.getDefaultReminderChannel() != null ? profile.getDefaultReminderChannel() : "email";
        if ("both".equalsIgnoreCase(defaultReminderChannel) && (!emailConnected || !whatsappConnected)) {
            defaultReminderChannel = emailConnected ? "email" : (whatsappConnected ? "whatsapp" : "email");
        }

        ChannelSettingsDto settings = new ChannelSettingsDto(
                defaultReminderChannel,
                profile.getEmailRemindersEnabled(),
                profile.getWhatsappRemindersEnabled(),
                emailConnected && whatsappConnected,
                emailConnected,
                whatsappConnected
        );

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("integrations", safeIntegrations);
        response.put("settings", settings);
        return response;
    }

    @Transactional
    public Map<String, Object> updateSettings(UUID userId, UpdateSettingsRequest req) {
        List<Integration> integrations = integrationRepository.findByUserId(userId);
        boolean emailConnected = integrations.stream()
                .anyMatch(i -> "email".equalsIgnoreCase(i.getChannel()) && "CONNECTED".equalsIgnoreCase(i.getStatus()));
        boolean whatsappConnected = integrations.stream()
                .anyMatch(i -> "whatsapp".equalsIgnoreCase(i.getChannel()) && "CONNECTED".equalsIgnoreCase(i.getStatus()));

        if ("both".equalsIgnoreCase(req.getDefault_reminder_channel()) && (!emailConnected || !whatsappConnected)) {
            throw new BadRequestException("Cannot set default channel to \"Both\" unless both Email and WhatsApp Business are connected.");
        }

        if ("whatsapp".equalsIgnoreCase(req.getDefault_reminder_channel()) && !whatsappConnected) {
            throw new BadRequestException("Cannot set default channel to WhatsApp because WhatsApp Business is not connected.");
        }

        Profile profile = profileRepository.findById(userId).orElse(new Profile(userId, ""));
        if (req.getDefault_reminder_channel() != null) {
            profile.setDefaultReminderChannel(req.getDefault_reminder_channel());
        }
        if (req.getEmail_reminders_enabled() != null) {
            profile.setEmailRemindersEnabled(req.getEmail_reminders_enabled());
        }
        if (req.getWhatsapp_reminders_enabled() != null) {
            profile.setWhatsappRemindersEnabled(req.getWhatsapp_reminders_enabled());
        }

        Profile saved = profileRepository.save(profile);

        ChannelSettingsDto settings = new ChannelSettingsDto(
                saved.getDefaultReminderChannel(),
                saved.getEmailRemindersEnabled(),
                saved.getWhatsappRemindersEnabled(),
                emailConnected && whatsappConnected,
                emailConnected,
                whatsappConnected
        );

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", "Integration settings saved successfully.");
        response.put("settings", settings);
        return response;
    }

    @Transactional
    public boolean deleteIntegration(UUID userId, String provider) {
        if (!integrationRepository.existsByUserIdAndProvider(userId, provider)) {
            return false;
        }
        integrationRepository.deleteByUserIdAndProvider(userId, provider);
        return true;
    }
}
