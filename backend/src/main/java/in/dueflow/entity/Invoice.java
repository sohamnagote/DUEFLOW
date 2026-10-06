package in.dueflow.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "invoices", indexes = {
    @Index(name = "idx_invoices_user_id", columnList = "user_id"),
    @Index(name = "idx_invoices_status", columnList = "user_id, status"),
    @Index(name = "idx_invoices_due_date", columnList = "due_date")
}, uniqueConstraints = {
    @UniqueConstraint(name = "uq_user_invoice_number", columnNames = {"user_id", "invoice_number"})
})
public class Invoice {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "client_id")
    private UUID clientId;

    @Column(name = "client_name_snapshot", nullable = false)
    private String clientNameSnapshot;

    @Column(name = "client_email_snapshot", nullable = false)
    private String clientEmailSnapshot;

    @Column(name = "client_phone_snapshot")
    private String clientPhoneSnapshot;

    @Column(name = "invoice_number", nullable = false)
    private String invoiceNumber;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal amount;

    @Column(nullable = false)
    private String currency = "INR";

    @Column(name = "issue_date", nullable = false)
    private LocalDate issueDate;

    @Column(name = "due_date", nullable = false)
    private LocalDate dueDate;

    @Column(length = 1000)
    private String notes = "";

    @Column(nullable = false)
    private String status = "unpaid";

    @Column(name = "reminders_enabled", nullable = false)
    private Boolean remindersEnabled = true;

    @Column(name = "reminder_channel")
    private String reminderChannel = "default";

    @Column(name = "template_key", nullable = false)
    private String templateKey = "cadence_default";

    @Column(name = "paid_at")
    private Instant paidAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    public Invoice() {}

    @PrePersist
    protected void onCreate() {
        if (id == null) id = UUID.randomUUID();
        if (createdAt == null) createdAt = Instant.now();
        if (updatedAt == null) updatedAt = Instant.now();
        if (currency == null) currency = "INR";
        if (status == null) status = "unpaid";
        if (remindersEnabled == null) remindersEnabled = true;
        if (reminderChannel == null) reminderChannel = "default";
        if (templateKey == null) templateKey = "cadence_default";
        if (notes == null) notes = "";
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = Instant.now();
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public UUID getUserId() { return userId; }
    public void setUserId(UUID userId) { this.userId = userId; }

    public UUID getClientId() { return clientId; }
    public void setClientId(UUID clientId) { this.clientId = clientId; }

    public String getClientNameSnapshot() { return clientNameSnapshot; }
    public void setClientNameSnapshot(String clientNameSnapshot) { this.clientNameSnapshot = clientNameSnapshot; }

    public String getClientEmailSnapshot() { return clientEmailSnapshot; }
    public void setClientEmailSnapshot(String clientEmailSnapshot) { this.clientEmailSnapshot = clientEmailSnapshot; }

    public String getClientPhoneSnapshot() { return clientPhoneSnapshot; }
    public void setClientPhoneSnapshot(String clientPhoneSnapshot) { this.clientPhoneSnapshot = clientPhoneSnapshot; }

    public String getInvoiceNumber() { return invoiceNumber; }
    public void setInvoiceNumber(String invoiceNumber) { this.invoiceNumber = invoiceNumber; }

    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }

    public String getCurrency() { return currency; }
    public void setCurrency(String currency) { this.currency = currency; }

    public LocalDate getIssueDate() { return issueDate; }
    public void setIssueDate(LocalDate issueDate) { this.issueDate = issueDate; }

    public LocalDate getDueDate() { return dueDate; }
    public void setDueDate(LocalDate dueDate) { this.dueDate = dueDate; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public Boolean getRemindersEnabled() { return remindersEnabled; }
    public void setRemindersEnabled(Boolean remindersEnabled) { this.remindersEnabled = remindersEnabled; }

    public String getReminderChannel() { return reminderChannel; }
    public void setReminderChannel(String reminderChannel) { this.reminderChannel = reminderChannel; }

    public String getTemplateKey() { return templateKey; }
    public void setTemplateKey(String templateKey) { this.templateKey = templateKey; }

    public Instant getPaidAt() { return paidAt; }
    public void setPaidAt(Instant paidAt) { this.paidAt = paidAt; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }

    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
}
