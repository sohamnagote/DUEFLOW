package com.dueflow.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import java.math.BigDecimal;

public class InvoiceCsvRowDto {

    @JsonAlias({"invoiceNumber", "invoice_number", "Invoice Number", "InvoiceNumber", "Invoice #", "invoice_no"})
    private String invoiceNumber;

    @JsonAlias({"clientName", "client_name", "Client Name", "ClientName", "Customer", "Client"})
    private String clientName;

    @JsonAlias({"clientEmail", "client_email", "Client Email", "ClientEmail", "Email"})
    private String clientEmail;

    @JsonAlias({"clientPhone", "client_phone", "Client Phone", "Phone"})
    private String clientPhone;

    @JsonAlias({"issueDate", "issue_date", "Issue Date", "Date", "Invoice Date"})
    private String issueDate;

    @JsonAlias({"dueDate", "due_date", "Due Date", "DueDate"})
    private String dueDate;

    @JsonAlias({"amount", "totalAmount", "total_amount", "Total Amount", "Amount", "Total"})
    private BigDecimal amount;

    @JsonAlias({"currency", "Currency"})
    private String currency = "INR";

    @JsonAlias({"description", "notes", "Description", "Notes", "Item Description"})
    private String description;

    @JsonAlias({"status", "Status", "Payment Status"})
    private String status = "UNPAID";

    public InvoiceCsvRowDto() {
    }

    public String getInvoiceNumber() {
        return invoiceNumber;
    }

    public void setInvoiceNumber(String invoiceNumber) {
        this.invoiceNumber = invoiceNumber;
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

    public String getClientPhone() {
        return clientPhone;
    }

    public void setClientPhone(String clientPhone) {
        this.clientPhone = clientPhone;
    }

    public String getIssueDate() {
        return issueDate;
    }

    public void setIssueDate(String issueDate) {
        this.issueDate = issueDate;
    }

    public String getDueDate() {
        return dueDate;
    }

    public void setDueDate(String dueDate) {
        this.dueDate = dueDate;
    }

    public BigDecimal getAmount() {
        return amount;
    }

    public void setAmount(BigDecimal amount) {
        this.amount = amount;
    }

    public String getCurrency() {
        return currency != null && !currency.isBlank() ? currency.toUpperCase() : "INR";
    }

    public void setCurrency(String currency) {
        this.currency = currency;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getStatus() {
        return status != null && !status.isBlank() ? status.toUpperCase() : "UNPAID";
    }

    public void setStatus(String status) {
        this.status = status;
    }
}
