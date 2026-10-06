package in.dueflow.dto;

import in.dueflow.entity.Invoice;
import in.dueflow.entity.ReminderLog;
import in.dueflow.entity.ReminderRule;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public class InvoiceDtos {

    public static class CreateInvoiceRequest {
        private UUID client_id;

        @NotBlank(message = "Client name is required")
        @Size(max = 150, message = "Client name too long")
        private String client_name;

        @NotBlank(message = "Invalid client email address")
        @Email(message = "Invalid client email address")
        @Size(max = 254)
        private String client_email;

        private String client_phone;

        @NotBlank(message = "Invoice number required")
        @Size(max = 50, message = "Invoice number too long")
        private String invoice_number;

        @NotNull(message = "Amount is required")
        @DecimalMin(value = "0.01", message = "Amount must be greater than 0")
        @DecimalMax(value = "100000000.00", message = "Amount cannot exceed INR 100,000,000")
        @Digits(integer = 10, fraction = 2, message = "Amount cannot exceed 2 decimal places")
        private BigDecimal amount;

        private String currency = "INR";

        @NotNull(message = "Issue date must be YYYY-MM-DD")
        private LocalDate issue_date;

        @NotNull(message = "Due date must be YYYY-MM-DD")
        private LocalDate due_date;

        @Size(max = 1000, message = "Notes cannot exceed 1000 characters")
        private String notes = "";

        private String template_key = "cadence_default";
        private Boolean reminders_enabled = true;
        private String reminder_channel = "default";

        public UUID getClient_id() { return client_id; }
        public void setClient_id(UUID client_id) { this.client_id = client_id; }

        public String getClient_name() { return client_name; }
        public void setClient_name(String client_name) { this.client_name = client_name; }

        public String getClient_email() { return client_email; }
        public void setClient_email(String client_email) { this.client_email = client_email; }

        public String getClient_phone() { return client_phone; }
        public void setClient_phone(String client_phone) { this.client_phone = client_phone; }

        public String getInvoice_number() { return invoice_number; }
        public void setInvoice_number(String invoice_number) { this.invoice_number = invoice_number; }

        public BigDecimal getAmount() { return amount; }
        public void setAmount(BigDecimal amount) { this.amount = amount; }

        public String getCurrency() { return currency; }
        public void setCurrency(String currency) { this.currency = currency; }

        public LocalDate getIssue_date() { return issue_date; }
        public void setIssue_date(LocalDate issue_date) { this.issue_date = issue_date; }

        public LocalDate getDue_date() { return due_date; }
        public void setDue_date(LocalDate due_date) { this.due_date = due_date; }

        public String getNotes() { return notes; }
        public void setNotes(String notes) { this.notes = notes; }

        public String getTemplate_key() { return template_key; }
        public void setTemplate_key(String template_key) { this.template_key = template_key; }

        public Boolean getReminders_enabled() { return reminders_enabled; }
        public void setReminders_enabled(Boolean reminders_enabled) { this.reminders_enabled = reminders_enabled; }

        public String getReminder_channel() { return reminder_channel; }
        public void setReminder_channel(String reminder_channel) { this.reminder_channel = reminder_channel; }
    }

    public static class UpdateInvoiceRequest {
        @Size(max = 150)
        private String client_name;

        @Email
        @Size(max = 254)
        private String client_email;

        private String client_phone;

        @DecimalMin(value = "0.01")
        @DecimalMax(value = "100000000.00")
        private BigDecimal amount;

        private LocalDate issue_date;
        private LocalDate due_date;

        @Size(max = 1000)
        private String notes;

        private String template_key;
        private Boolean reminders_enabled;
        private String reminder_channel;

        public String getClient_name() { return client_name; }
        public void setClient_name(String client_name) { this.client_name = client_name; }

        public String getClient_email() { return client_email; }
        public void setClient_email(String client_email) { this.client_email = client_email; }

        public String getClient_phone() { return client_phone; }
        public void setClient_phone(String client_phone) { this.client_phone = client_phone; }

        public BigDecimal getAmount() { return amount; }
        public void setAmount(BigDecimal amount) { this.amount = amount; }

        public LocalDate getIssue_date() { return issue_date; }
        public void setIssue_date(LocalDate issue_date) { this.issue_date = issue_date; }

        public LocalDate getDue_date() { return due_date; }
        public void setDue_date(LocalDate due_date) { this.due_date = due_date; }

        public String getNotes() { return notes; }
        public void setNotes(String notes) { this.notes = notes; }

        public String getTemplate_key() { return template_key; }
        public void setTemplate_key(String template_key) { this.template_key = template_key; }

        public Boolean getReminders_enabled() { return reminders_enabled; }
        public void setReminders_enabled(Boolean reminders_enabled) { this.reminders_enabled = reminders_enabled; }

        public String getReminder_channel() { return reminder_channel; }
        public void setReminder_channel(String reminder_channel) { this.reminder_channel = reminder_channel; }
    }

    public static class MarkUnpaidRequest {
        @NotNull(message = "Explicit confirmation (confirm: true) is required to mark an invoice unpaid.")
        @AssertTrue(message = "Explicit confirmation (confirm: true) is required to mark an invoice unpaid.")
        private Boolean confirm;

        public Boolean getConfirm() { return confirm; }
        public void setConfirm(Boolean confirm) { this.confirm = confirm; }
    }

    public static class ToggleRemindersRequest {
        @NotNull(message = "\"enabled\" boolean is required")
        private Boolean enabled;

        public Boolean getEnabled() { return enabled; }
        public void setEnabled(Boolean enabled) { this.enabled = enabled; }
    }

    public static class NudgeRequest {
        private String customSubject;
        private String customBody;
        private String tone = "professional";
        private String channel;
        private String recipient_phone;

        public String getCustomSubject() { return customSubject; }
        public void setCustomSubject(String customSubject) { this.customSubject = customSubject; }

        public String getCustomBody() { return customBody; }
        public void setCustomBody(String customBody) { this.customBody = customBody; }

        public String getTone() { return tone; }
        public void setTone(String tone) { this.tone = tone; }

        public String getChannel() { return channel; }
        public void setChannel(String channel) { this.channel = channel; }

        public String getRecipient_phone() { return recipient_phone; }
        public void setRecipient_phone(String recipient_phone) { this.recipient_phone = recipient_phone; }
    }

    public static class InvoiceResponseDto {
        private UUID id;
        private UUID user_id;
        private UUID client_id;
        private String client_name_snapshot;
        private String client_email_snapshot;
        private String client_phone_snapshot;
        private String invoice_number;
        private BigDecimal amount;
        private String currency;
        private String issue_date;
        private String due_date;
        private String notes;
        private String status;
        private String operational_status;
        private Boolean reminders_enabled;
        private String reminder_channel;
        private String template_key;
        private Instant paid_at;
        private Instant created_at;
        private Instant updated_at;
        private List<ReminderRule> rules;

        public static InvoiceResponseDto from(Invoice invoice, String operationalStatus, List<ReminderRule> rules) {
            InvoiceResponseDto dto = new InvoiceResponseDto();
            dto.id = invoice.getId();
            dto.user_id = invoice.getUserId();
            dto.client_id = invoice.getClientId();
            dto.client_name_snapshot = invoice.getClientNameSnapshot();
            dto.client_email_snapshot = invoice.getClientEmailSnapshot();
            dto.client_phone_snapshot = invoice.getClientPhoneSnapshot();
            dto.invoice_number = invoice.getInvoiceNumber();
            dto.amount = invoice.getAmount();
            dto.currency = invoice.getCurrency();
            dto.issue_date = invoice.getIssueDate() != null ? invoice.getIssueDate().toString() : "";
            dto.due_date = invoice.getDueDate() != null ? invoice.getDueDate().toString() : "";
            dto.notes = invoice.getNotes();
            dto.status = invoice.getStatus();
            dto.operational_status = operationalStatus != null ? operationalStatus : invoice.getStatus();
            dto.reminders_enabled = invoice.getRemindersEnabled();
            dto.reminder_channel = invoice.getReminderChannel();
            dto.template_key = invoice.getTemplateKey();
            dto.paid_at = invoice.getPaidAt();
            dto.created_at = invoice.getCreatedAt();
            dto.updated_at = invoice.getUpdatedAt();
            dto.rules = rules;
            return dto;
        }

        public UUID getId() { return id; }
        public UUID getUser_id() { return user_id; }
        public UUID getClient_id() { return client_id; }
        public String getClient_name_snapshot() { return client_name_snapshot; }
        public String getClient_email_snapshot() { return client_email_snapshot; }
        public String getClient_phone_snapshot() { return client_phone_snapshot; }
        public String getInvoice_number() { return invoice_number; }
        public BigDecimal getAmount() { return amount; }
        public String getCurrency() { return currency; }
        public String getIssue_date() { return issue_date; }
        public String getDue_date() { return due_date; }
        public String getNotes() { return notes; }
        public String getStatus() { return status; }
        public String getOperational_status() { return operational_status; }
        public Boolean getReminders_enabled() { return reminders_enabled; }
        public String getReminder_channel() { return reminder_channel; }
        public String getTemplate_key() { return template_key; }
        public Instant getPaid_at() { return paid_at; }
        public Instant getCreated_at() { return created_at; }
        public Instant getUpdated_at() { return updated_at; }
        public List<ReminderRule> getRules() { return rules; }
        public void setRules(List<ReminderRule> rules) { this.rules = rules; }
    }

    public static class InvoiceDetailResponse {
        private InvoiceResponseDto invoice;
        private List<ReminderRule> rules;
        private List<ReminderLog> logs;

        public InvoiceDetailResponse(InvoiceResponseDto invoice, List<ReminderRule> rules, List<ReminderLog> logs) {
            this.invoice = invoice;
            this.rules = rules;
            this.logs = logs;
        }

        public InvoiceResponseDto getInvoice() { return invoice; }
        public List<ReminderRule> getRules() { return rules; }
        public List<ReminderLog> getLogs() { return logs; }
    }

    public static class InvoiceListResponse {
        private List<InvoiceResponseDto> invoices;
        private long total;
        private int page;
        private int totalPages;

        public InvoiceListResponse(List<InvoiceResponseDto> invoices, long total, int page, int totalPages) {
            this.invoices = invoices;
            this.total = total;
            this.page = page;
            this.totalPages = totalPages;
        }

        public List<InvoiceResponseDto> getInvoices() { return invoices; }
        public long getTotal() { return total; }
        public int getPage() { return page; }
        public int getTotalPages() { return totalPages; }
    }
}
