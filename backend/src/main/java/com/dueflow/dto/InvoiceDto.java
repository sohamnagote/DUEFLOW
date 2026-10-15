package com.dueflow.dto;

import com.dueflow.domain.Invoice;
import com.dueflow.domain.InvoiceStatus;
import com.fasterxml.jackson.annotation.JsonAlias;
import jakarta.validation.Valid;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

public class InvoiceDto {
    private String id;

    @JsonAlias({"client_id", "clientId"})
    private String clientId;

    @JsonAlias({"client_name", "clientName", "client_name_snapshot"})
    private String clientName;

    @JsonAlias({"client_email", "clientEmail", "client_email_snapshot"})
    private String clientEmail;

    @JsonAlias({"invoice_number", "invoiceNumber"})
    private String invoiceNumber;

    @JsonAlias({"issue_date", "issueDate"})
    private LocalDate issueDate;

    @JsonAlias({"due_date", "dueDate"})
    private LocalDate dueDate;

    private String currency = "INR";

    @JsonAlias({"amount", "total_amount", "totalAmount"})
    private BigDecimal amount = BigDecimal.ZERO; // Maps to totalAmount for frontend compatibility

    private BigDecimal subtotal = BigDecimal.ZERO;

    @JsonAlias({"tax_amount", "taxAmount"})
    private BigDecimal taxAmount = BigDecimal.ZERO;

    @JsonAlias({"discount_amount", "discountAmount"})
    private BigDecimal discountAmount = BigDecimal.ZERO;

    @JsonAlias({"total_amount", "totalAmount"})
    private BigDecimal totalAmount = BigDecimal.ZERO;

    private String status = "UNPAID";
    private String description;
    private String notes;

    @JsonAlias({"payment_instructions", "paymentInstructions", "paymentNotes"})
    private String paymentInstructions;

    private Instant paidAt;

    @JsonAlias({"reminders_sent_count", "remindersSentCount"})
    private int remindersSentCount = 0;

    @JsonAlias({"follow_up_status", "followUpStatus"})
    private String followUpStatus = "ACTIVE";

    @JsonAlias({"last_reply_snippet", "lastReplySnippet"})
    private String lastReplySnippet;

    @JsonAlias({"last_reply_classification", "lastReplyClassification"})
    private String lastReplyClassification;

    @JsonAlias({"last_reply_at", "lastReplyAt"})
    private Instant lastReplyAt;

    @JsonAlias({"gmail_thread_id", "gmailThreadId"})
    private String gmailThreadId;

    @JsonAlias({"response_token", "responseToken"})
    private String responseToken;

    @Valid
    private List<InvoiceItemDto> items = new ArrayList<>();

    private Instant createdAt;

    public InvoiceDto() {
    }

    public static InvoiceDto fromEntity(Invoice inv) {
        if (inv == null) return null;
        InvoiceDto dto = new InvoiceDto();
        dto.setId(inv.getId());
        if (inv.getClient() != null) {
            dto.setClientId(inv.getClient().getId());
            dto.setClientName(inv.getClient().getName());
            dto.setClientEmail(inv.getClient().getEmail());
        }
        dto.setInvoiceNumber(inv.getInvoiceNumber());
        dto.setIssueDate(inv.getIssueDate());
        dto.setDueDate(inv.getDueDate());
        dto.setCurrency(inv.getCurrency());
        dto.setSubtotal(inv.getSubtotal());
        dto.setTaxAmount(inv.getTaxAmount());
        dto.setDiscountAmount(inv.getDiscountAmount());
        dto.setTotalAmount(inv.getTotalAmount());
        dto.setAmount(inv.getTotalAmount()); // For frontend `inv.amount` compatibility
        dto.setStatus(inv.getStatus() != null ? inv.getStatus().name().toLowerCase() : "unpaid");
        dto.setDescription(inv.getDescription());
        dto.setNotes(inv.getNotes());
        dto.setPaymentInstructions(inv.getPaymentInstructions());
        dto.setPaidAt(inv.getPaidAt());
        dto.setRemindersSentCount(inv.getRemindersSentCount());
        dto.setCreatedAt(inv.getCreatedAt());

        dto.setFollowUpStatus(inv.getFollowUpStatus() != null ? inv.getFollowUpStatus() : "ACTIVE");
        dto.setLastReplySnippet(inv.getLastReplySnippet());
        dto.setLastReplyClassification(inv.getLastReplyClassification());
        dto.setLastReplyAt(inv.getLastReplyAt());
        dto.setGmailThreadId(inv.getGmailThreadId());
        dto.setResponseToken(inv.getResponseToken());

        if (inv.getItems() != null) {
            dto.setItems(inv.getItems().stream().map(InvoiceItemDto::fromEntity).toList());
        }
        return dto;
    }


    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getClientId() {
        return clientId;
    }

    public void setClientId(String clientId) {
        this.clientId = clientId;
    }

    public String getClientName() {
        return clientName;
    }

    public void setClientName(String clientName) {
        this.clientName = clientName;
    }

    public String getClientEmail() {
        return clientEmail;
    }

    public void setClientEmail(String clientEmail) {
        this.clientEmail = clientEmail;
    }

    public String getInvoiceNumber() {
        return invoiceNumber;
    }

    public void setInvoiceNumber(String invoiceNumber) {
        this.invoiceNumber = invoiceNumber;
    }

    public LocalDate getIssueDate() {
        return issueDate;
    }

    public void setIssueDate(LocalDate issueDate) {
        this.issueDate = issueDate;
    }

    public LocalDate getDueDate() {
        return dueDate;
    }

    public void setDueDate(LocalDate dueDate) {
        this.dueDate = dueDate;
    }

    public String getCurrency() {
        return currency;
    }

    public void setCurrency(String currency) {
        this.currency = currency;
    }

    public BigDecimal getAmount() {
        return amount;
    }

    public void setAmount(BigDecimal amount) {
        this.amount = amount;
    }

    public BigDecimal getSubtotal() {
        return subtotal;
    }

    public void setSubtotal(BigDecimal subtotal) {
        this.subtotal = subtotal;
    }

    public BigDecimal getTaxAmount() {
        return taxAmount;
    }

    public void setTaxAmount(BigDecimal taxAmount) {
        this.taxAmount = taxAmount;
    }

    public BigDecimal getDiscountAmount() {
        return discountAmount;
    }

    public void setDiscountAmount(BigDecimal discountAmount) {
        this.discountAmount = discountAmount;
    }

    public BigDecimal getTotalAmount() {
        return totalAmount;
    }

    public void setTotalAmount(BigDecimal totalAmount) {
        this.totalAmount = totalAmount;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }

    public String getPaymentInstructions() {
        return paymentInstructions;
    }

    public void setPaymentInstructions(String paymentInstructions) {
        this.paymentInstructions = paymentInstructions;
    }

    public Instant getPaidAt() {
        return paidAt;
    }

    public void setPaidAt(Instant paidAt) {
        this.paidAt = paidAt;
    }

    public int getRemindersSentCount() {
        return remindersSentCount;
    }

    public void setRemindersSentCount(int remindersSentCount) {
        this.remindersSentCount = remindersSentCount;
    }

    public List<InvoiceItemDto> getItems() {
        return items;
    }

    public void setItems(List<InvoiceItemDto> items) {
        this.items = items;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public String getFollowUpStatus() {
        return followUpStatus;
    }

    public void setFollowUpStatus(String followUpStatus) {
        this.followUpStatus = followUpStatus;
    }

    public String getLastReplySnippet() {
        return lastReplySnippet;
    }

    public void setLastReplySnippet(String lastReplySnippet) {
        this.lastReplySnippet = lastReplySnippet;
    }

    public String getLastReplyClassification() {
        return lastReplyClassification;
    }

    public void setLastReplyClassification(String lastReplyClassification) {
        this.lastReplyClassification = lastReplyClassification;
    }

    public Instant getLastReplyAt() {
        return lastReplyAt;
    }

    public void setLastReplyAt(Instant lastReplyAt) {
        this.lastReplyAt = lastReplyAt;
    }

    public String getGmailThreadId() {
        return gmailThreadId;
    }

    public void setGmailThreadId(String gmailThreadId) {
        this.gmailThreadId = gmailThreadId;
    }

    public String getResponseToken() {
        return responseToken;
    }

    public void setResponseToken(String responseToken) {
        this.responseToken = responseToken;
    }
}

