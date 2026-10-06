package in.dueflow.dto;

import in.dueflow.entity.ReminderLog;
import in.dueflow.entity.ReminderRule;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public class ReminderDtos {

    public static class EnrichedRuleDto {
        private UUID id;
        private UUID invoice_id;
        private String channel;
        private Integer offset_days;
        private String direction;
        private Boolean enabled;
        private String occurrence_key;
        private Instant scheduled_for;
        private String status;
        private Instant created_at;

        // Enriched invoice fields
        private String invoice_number;
        private String client_name;
        private BigDecimal amount;
        private String due_date;

        public static EnrichedRuleDto from(ReminderRule r, String invoiceNumber, String clientName, BigDecimal amount, String dueDate) {
            EnrichedRuleDto dto = new EnrichedRuleDto();
            dto.id = r.getId();
            dto.invoice_id = r.getInvoiceId();
            dto.channel = r.getChannel();
            dto.offset_days = r.getOffsetDays();
            dto.direction = r.getDirection();
            dto.enabled = r.getEnabled();
            dto.occurrence_key = r.getOccurrenceKey();
            dto.scheduled_for = r.getScheduledFor();
            dto.status = r.getStatus();
            dto.created_at = r.getCreatedAt();
            dto.invoice_number = invoiceNumber;
            dto.client_name = clientName;
            dto.amount = amount;
            dto.due_date = dueDate;
            return dto;
        }

        public UUID getId() { return id; }
        public UUID getInvoice_id() { return invoice_id; }
        public String getChannel() { return channel; }
        public Integer getOffset_days() { return offset_days; }
        public String getDirection() { return direction; }
        public Boolean getEnabled() { return enabled; }
        public String getOccurrence_key() { return occurrence_key; }
        public Instant getScheduled_for() { return scheduled_for; }
        public String getStatus() { return status; }
        public Instant getCreated_at() { return created_at; }
        public String getInvoice_number() { return invoice_number; }
        public String getClient_name() { return client_name; }
        public BigDecimal getAmount() { return amount; }
        public String getDue_date() { return due_date; }
    }

    public static class EnrichedLogDto {
        private UUID id;
        private UUID invoice_id;
        private UUID rule_id;
        private String channel;
        private String provider;
        private String occurrence_key;
        private String recipient_email;
        private String recipient_phone;
        private String recipient;
        private String subject;
        private String provider_message_id;
        private String status;
        private String error_code;
        private Boolean retryable;
        private Instant attempted_at;
        private Instant sent_at;
        private Instant created_at;

        // Enriched invoice fields
        private String invoice_number;
        private String client_name;
        private BigDecimal amount;

        public static EnrichedLogDto from(ReminderLog l, String invoiceNumber, String clientName, BigDecimal amount) {
            EnrichedLogDto dto = new EnrichedLogDto();
            dto.id = l.getId();
            dto.invoice_id = l.getInvoiceId();
            dto.rule_id = l.getRuleId();
            dto.channel = l.getChannel();
            dto.provider = l.getProvider();
            dto.occurrence_key = l.getOccurrenceKey();
            dto.recipient_email = l.getRecipientEmail();
            dto.recipient_phone = l.getRecipientPhone();
            dto.recipient = l.getRecipient();
            dto.subject = l.getSubject();
            dto.provider_message_id = l.getProviderMessageId();
            dto.status = l.getStatus();
            dto.error_code = l.getErrorCode();
            dto.retryable = l.getRetryable();
            dto.attempted_at = l.getAttemptedAt();
            dto.sent_at = l.getSentAt();
            dto.created_at = l.getCreatedAt();
            dto.invoice_number = invoiceNumber;
            dto.client_name = clientName;
            dto.amount = amount;
            return dto;
        }

        public UUID getId() { return id; }
        public UUID getInvoice_id() { return invoice_id; }
        public UUID getRule_id() { return rule_id; }
        public String getChannel() { return channel; }
        public String getProvider() { return provider; }
        public String getOccurrence_key() { return occurrence_key; }
        public String getRecipient_email() { return recipient_email; }
        public String getRecipient_phone() { return recipient_phone; }
        public String getRecipient() { return recipient; }
        public String getSubject() { return subject; }
        public String getProvider_message_id() { return provider_message_id; }
        public String getStatus() { return status; }
        public String getError_code() { return error_code; }
        public Boolean getRetryable() { return retryable; }
        public Instant getAttempted_at() { return attempted_at; }
        public Instant getSent_at() { return sent_at; }
        public Instant getCreated_at() { return created_at; }
        public String getInvoice_number() { return invoice_number; }
        public String getClient_name() { return client_name; }
        public BigDecimal getAmount() { return amount; }
    }
}
