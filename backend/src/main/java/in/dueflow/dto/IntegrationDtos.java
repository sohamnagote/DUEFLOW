package in.dueflow.dto;

import in.dueflow.entity.Integration;
import java.time.Instant;
import java.util.UUID;

public class IntegrationDtos {

    public static class SafeIntegrationDto {
        private UUID id;
        private String provider;
        private String channel;
        private String status;
        private String display_email;
        private String display_name;
        private String display_phone;
        private String business_name;
        private Instant connected_at;
        private Instant last_success_at;
        private String last_error;

        public static SafeIntegrationDto from(Integration i) {
            SafeIntegrationDto dto = new SafeIntegrationDto();
            dto.id = i.getId();
            dto.provider = i.getProvider();
            dto.channel = i.getChannel();
            dto.status = i.getStatus();
            dto.display_email = i.getProviderEmail();
            dto.display_phone = i.getProviderPhoneId();
            dto.connected_at = i.getConnectedAt();
            dto.last_success_at = i.getLastSuccessAt();
            dto.last_error = i.getLastErrorMessage();
            return dto;
        }

        public UUID getId() { return id; }
        public String getProvider() { return provider; }
        public String getChannel() { return channel; }
        public String getStatus() { return status; }
        public String getDisplay_email() { return display_email; }
        public String getDisplay_name() { return display_name; }
        public String getDisplay_phone() { return display_phone; }
        public String getBusiness_name() { return business_name; }
        public Instant getConnected_at() { return connected_at; }
        public Instant getLast_success_at() { return last_success_at; }
        public String getLast_error() { return last_error; }
    }

    public static class ChannelSettingsDto {
        private String default_reminder_channel;
        private Boolean email_reminders_enabled;
        private Boolean whatsapp_reminders_enabled;
        private Boolean can_select_both;
        private Boolean email_connected;
        private Boolean whatsapp_connected;

        public ChannelSettingsDto(String default_reminder_channel, Boolean email_reminders_enabled,
                                  Boolean whatsapp_reminders_enabled, Boolean can_select_both,
                                  Boolean email_connected, Boolean whatsapp_connected) {
            this.default_reminder_channel = default_reminder_channel;
            this.email_reminders_enabled = email_reminders_enabled;
            this.whatsapp_reminders_enabled = whatsapp_reminders_enabled;
            this.can_select_both = can_select_both;
            this.email_connected = email_connected;
            this.whatsapp_connected = whatsapp_connected;
        }

        public String getDefault_reminder_channel() { return default_reminder_channel; }
        public Boolean getEmail_reminders_enabled() { return email_reminders_enabled; }
        public Boolean getWhatsapp_reminders_enabled() { return whatsapp_reminders_enabled; }
        public Boolean getCan_select_both() { return can_select_both; }
        public Boolean getEmail_connected() { return email_connected; }
        public Boolean getWhatsapp_connected() { return whatsapp_connected; }
    }

    public static class UpdateSettingsRequest {
        private String default_reminder_channel;
        private Boolean email_reminders_enabled;
        private Boolean whatsapp_reminders_enabled;

        public String getDefault_reminder_channel() { return default_reminder_channel; }
        public void setDefault_reminder_channel(String default_reminder_channel) { this.default_reminder_channel = default_reminder_channel; }

        public Boolean getEmail_reminders_enabled() { return email_reminders_enabled; }
        public void setEmail_reminders_enabled(Boolean email_reminders_enabled) { this.email_reminders_enabled = email_reminders_enabled; }

        public Boolean getWhatsapp_reminders_enabled() { return whatsapp_reminders_enabled; }
        public void setWhatsapp_reminders_enabled(Boolean whatsapp_reminders_enabled) { this.whatsapp_reminders_enabled = whatsapp_reminders_enabled; }
    }
}
