package in.dueflow.entity;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "reminder_logs", indexes = {
    @Index(name = "idx_reminder_logs_invoice_id", columnList = "invoice_id"),
    @Index(name = "idx_reminder_logs_occurrence", columnList = "invoice_id, occurrence_key"),
    @Index(name = "idx_reminder_logs_provider_id", columnList = "provider_message_id")
})
public class ReminderLog {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "invoice_id", nullable = false)
    private UUID invoiceId;

    @Column(name = "rule_id")
    private UUID ruleId;

    @Column
    private String channel = "email";

    @Column
    private String provider = "resend";

    @Column(name = "occurrence_key", nullable = false)
    private String occurrenceKey;

    @Column(name = "recipient_email")
    private String recipientEmail;

    @Column(name = "recipient_phone")
    private String recipientPhone;

    @Column
    private String recipient;

    @Column
    private String subject;

    @Column(name = "provider_message_id")
    private String providerMessageId;

    @Column(nullable = false)
    private String status; // delivered, sent, bounced, complained, failed

    @Column(name = "error_code")
    private String errorCode;

    @Column
    private Boolean retryable = false;

    @Column(name = "attempted_at", nullable = false)
    private Instant attemptedAt = Instant.now();

    @Column(name = "sent_at")
    private Instant sentAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    public ReminderLog() {}

    @PrePersist
    protected void onCreate() {
        if (id == null) id = UUID.randomUUID();
        if (attemptedAt == null) attemptedAt = Instant.now();
        if (createdAt == null) createdAt = Instant.now();
        if (channel == null) channel = "email";
        if (provider == null) provider = "resend";
        if (retryable == null) retryable = false;
        if (recipient == null) {
            recipient = recipientEmail != null ? recipientEmail : (recipientPhone != null ? recipientPhone : "recipient");
        }
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public UUID getInvoiceId() { return invoiceId; }
    public void setInvoiceId(UUID invoiceId) { this.invoiceId = invoiceId; }

    public UUID getRuleId() { return ruleId; }
    public void setRuleId(UUID ruleId) { this.ruleId = ruleId; }

    public String getChannel() { return channel; }
    public void setChannel(String channel) { this.channel = channel; }

    public String getProvider() { return provider; }
    public void setProvider(String provider) { this.provider = provider; }

    public String getOccurrenceKey() { return occurrenceKey; }
    public void setOccurrenceKey(String occurrenceKey) { this.occurrenceKey = occurrenceKey; }

    public String getRecipientEmail() { return recipientEmail; }
    public void setRecipientEmail(String recipientEmail) { this.recipientEmail = recipientEmail; }

    public String getRecipientPhone() { return recipientPhone; }
    public void setRecipientPhone(String recipientPhone) { this.recipientPhone = recipientPhone; }

    public String getRecipient() { return recipient; }
    public void setRecipient(String recipient) { this.recipient = recipient; }

    public String getSubject() { return subject; }
    public void setSubject(String subject) { this.subject = subject; }

    public String getProviderMessageId() { return providerMessageId; }
    public void setProviderMessageId(String providerMessageId) { this.providerMessageId = providerMessageId; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getErrorCode() { return errorCode; }
    public void setErrorCode(String errorCode) { this.errorCode = errorCode; }

    public Boolean getRetryable() { return retryable; }
    public void setRetryable(Boolean retryable) { this.retryable = retryable; }

    public Instant getAttemptedAt() { return attemptedAt; }
    public void setAttemptedAt(Instant attemptedAt) { this.attemptedAt = attemptedAt; }

    public Instant getSentAt() { return sentAt; }
    public void setSentAt(Instant sentAt) { this.sentAt = sentAt; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
