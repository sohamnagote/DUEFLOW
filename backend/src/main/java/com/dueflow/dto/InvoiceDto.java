package com.dueflow.dto;

import com.dueflow.domain.Invoice;
import com.dueflow.domain.InvoiceStatus;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

public class InvoiceDto {
    private String id;

    private String clientId;

    private String clientName;
    private String clientEmail;

    private String invoiceNumber;

    private LocalDate issueDate;

    private LocalDate dueDate;

    private String currency = "INR";
    private BigDecimal amount = BigDecimal.ZERO; // Maps to totalAmount for frontend compatibility
    private BigDecimal subtotal = BigDecimal.ZERO;
    private BigDecimal taxAmount = BigDecimal.ZERO;
    private BigDecimal discountAmount = BigDecimal.ZERO;
    private BigDecimal totalAmount = BigDecimal.ZERO;

    private String status = "UNPAID";
    private String description;
    private String notes;
    private String paymentInstructions;
    private Instant paidAt;
    private int remindersSentCount = 0;

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
}
