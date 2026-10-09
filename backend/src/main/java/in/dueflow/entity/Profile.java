package in.dueflow.entity;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "profiles")
public class Profile {

    @Id
    private UUID id;

    @Column(nullable = false)
    private String email;

    @Column(name = "full_name")
    private String fullName = "";

    @Column(name = "business_name")
    private String businessName = "";

    @Column
    private String phone = "";

    @Column
    private String address = "";

    @Column(name = "logo_url")
    private String logoUrl = "";

    @Column(nullable = false)
    private String timezone = "Asia/Kolkata";

    @Column(name = "upi_id")
    private String upiId = "";

    @Column(name = "bank_account")
    private String bankAccount = "";

    @Column(name = "bank_ifsc")
    private String bankIfsc = "";

    @Column(name = "bank_name")
    private String bankName = "";

    @Column(name = "payment_notes", length = 1000)
    private String paymentNotes = "";

    @Column(name = "payment_qr_url", columnDefinition = "TEXT")
    private String paymentQrUrl = "";

    @Column(name = "reminder_schedule_rules", columnDefinition = "TEXT")
    private String reminderScheduleRules = "[]";

    @Column(name = "custom_email_subject", columnDefinition = "TEXT")
    private String customEmailSubject = "";

    @Column(name = "custom_email_body", columnDefinition = "TEXT")
    private String customEmailBody = "";

    @Column(name = "email_tone")
    private String emailTone = "professional";

    @Column(name = "reminder_default")
    private String reminderDefault = "cadence_default";

    @Column(name = "default_reminder_channel")
    private String defaultReminderChannel = "email";

    @Column(name = "email_reminders_enabled")
    private Boolean emailRemindersEnabled = true;

    @Column(name = "whatsapp_reminders_enabled")
    private Boolean whatsappRemindersEnabled = false;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    public Profile() {}

    public Profile(UUID id, String email) {
        this.id = id;
        this.email = email;
    }

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) createdAt = Instant.now();
        if (updatedAt == null) updatedAt = Instant.now();
        if (timezone == null) timezone = "Asia/Kolkata";
        if (reminderDefault == null) reminderDefault = "cadence_default";
        if (defaultReminderChannel == null) defaultReminderChannel = "email";
        if (emailRemindersEnabled == null) emailRemindersEnabled = true;
        if (whatsappRemindersEnabled == null) whatsappRemindersEnabled = false;
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = Instant.now();
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }

    public String getBusinessName() { return businessName; }
    public void setBusinessName(String businessName) { this.businessName = businessName; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public String getTimezone() { return timezone; }
    public void setTimezone(String timezone) { this.timezone = timezone; }

    public String getUpiId() { return upiId; }
    public void setUpiId(String upiId) { this.upiId = upiId; }

    public String getBankAccount() { return bankAccount; }
    public void setBankAccount(String bankAccount) { this.bankAccount = bankAccount; }

    public String getBankIfsc() { return bankIfsc; }
    public void setBankIfsc(String bankIfsc) { this.bankIfsc = bankIfsc; }

    public String getReminderDefault() { return reminderDefault; }
    public void setReminderDefault(String reminderDefault) { this.reminderDefault = reminderDefault; }

    public String getDefaultReminderChannel() { return defaultReminderChannel; }
    public void setDefaultReminderChannel(String defaultReminderChannel) { this.defaultReminderChannel = defaultReminderChannel; }

    public Boolean getEmailRemindersEnabled() { return emailRemindersEnabled; }
    public void setEmailRemindersEnabled(Boolean emailRemindersEnabled) { this.emailRemindersEnabled = emailRemindersEnabled; }

    public Boolean getWhatsappRemindersEnabled() { return whatsappRemindersEnabled; }
    public void setWhatsappRemindersEnabled(Boolean whatsappRemindersEnabled) { this.whatsappRemindersEnabled = whatsappRemindersEnabled; }

    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }

    public String getLogoUrl() { return logoUrl; }
    public void setLogoUrl(String logoUrl) { this.logoUrl = logoUrl; }

    public String getBankName() { return bankName; }
    public void setBankName(String bankName) { this.bankName = bankName; }

    public String getPaymentNotes() { return paymentNotes; }
    public void setPaymentNotes(String paymentNotes) { this.paymentNotes = paymentNotes; }

    public String getPaymentQrUrl() { return paymentQrUrl; }
    public void setPaymentQrUrl(String paymentQrUrl) { this.paymentQrUrl = paymentQrUrl; }

    public String getReminderScheduleRules() { return reminderScheduleRules; }
    public void setReminderScheduleRules(String reminderScheduleRules) { this.reminderScheduleRules = reminderScheduleRules; }

    public String getCustomEmailSubject() { return customEmailSubject; }
    public void setCustomEmailSubject(String customEmailSubject) { this.customEmailSubject = customEmailSubject; }

    public String getCustomEmailBody() { return customEmailBody; }
    public void setCustomEmailBody(String customEmailBody) { this.customEmailBody = customEmailBody; }

    public String getEmailTone() { return emailTone; }
    public void setEmailTone(String emailTone) { this.emailTone = emailTone; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }

    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
}
