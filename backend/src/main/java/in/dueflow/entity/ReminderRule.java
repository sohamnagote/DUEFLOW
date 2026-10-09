package in.dueflow.entity;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "reminder_rules", indexes = {
    @Index(name = "idx_reminder_rules_invoice_id", columnList = "invoice_id"),
    @Index(name = "idx_reminder_rules_due_worker", columnList = "status, scheduled_for")
}, uniqueConstraints = {
    @UniqueConstraint(name = "uq_invoice_occurrence", columnNames = {"invoice_id", "occurrence_key"})
})
public class ReminderRule {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "invoice_id", nullable = false)
    private UUID invoiceId;

    @Column(nullable = false)
    private String channel = "email";

    @Column(name = "offset_days", nullable = false)
    private Integer offsetDays;

    @Column(nullable = false)
    private String direction;

    @Column(nullable = false)
    private Boolean enabled = true;

    @Column(name = "occurrence_key", nullable = false)
    private String occurrenceKey;

    @Column(name = "scheduled_for", nullable = false)
    private Instant scheduledFor;

    @Column(nullable = false)
    private String status = "pending";

    @Column(name = "attempt_count", nullable = false)
    private Integer attemptCount = 0;

    @Column(name = "last_attempted_at")
    private Instant lastAttemptedAt;

    @Column(name = "updated_at")
    private Instant updatedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    public ReminderRule() {}

    public ReminderRule(UUID invoiceId, String channel, Integer offsetDays, String direction,
                        String occurrenceKey, Instant scheduledFor, String status, Boolean enabled) {
        this.invoiceId = invoiceId;
        this.channel = channel != null ? channel : "email";
        this.offsetDays = offsetDays;
        this.direction = direction;
        this.occurrenceKey = occurrenceKey;
        this.scheduledFor = scheduledFor;
        this.status = status != null ? status : "pending";
        this.enabled = enabled != null ? enabled : true;
        this.attemptCount = 0;
    }

    @PrePersist
    protected void onCreate() {
        if (id == null) id = UUID.randomUUID();
        if (createdAt == null) createdAt = Instant.now();
        if (channel == null) channel = "email";
        if (status == null) status = "pending";
        if (enabled == null) enabled = true;
        if (attemptCount == null) attemptCount = 0;
        this.updatedAt = Instant.now();
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = Instant.now();
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public UUID getInvoiceId() { return invoiceId; }
    public void setInvoiceId(UUID invoiceId) { this.invoiceId = invoiceId; }

    public String getChannel() { return channel; }
    public void setChannel(String channel) { this.channel = channel; }

    public Integer getOffsetDays() { return offsetDays; }
    public void setOffsetDays(Integer offsetDays) { this.offsetDays = offsetDays; }

    public String getDirection() { return direction; }
    public void setDirection(String direction) { this.direction = direction; }

    public Boolean getEnabled() { return enabled; }
    public void setEnabled(Boolean enabled) { this.enabled = enabled; }

    public String getOccurrenceKey() { return occurrenceKey; }
    public void setOccurrenceKey(String occurrenceKey) { this.occurrenceKey = occurrenceKey; }

    public Instant getScheduledFor() { return scheduledFor; }
    public void setScheduledFor(Instant scheduledFor) { this.scheduledFor = scheduledFor; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public Integer getAttemptCount() { return attemptCount; }
    public void setAttemptCount(Integer attemptCount) { this.attemptCount = attemptCount; }

    public Instant getLastAttemptedAt() { return lastAttemptedAt; }
    public void setLastAttemptedAt(Instant lastAttemptedAt) { this.lastAttemptedAt = lastAttemptedAt; }

    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
