package com.dueflow.dto;

import com.dueflow.domain.ClientResponse;
import com.fasterxml.jackson.annotation.JsonAlias;

import java.time.Instant;
import java.time.LocalDate;

public class ClientResponseDto {

    private String id;

    @JsonAlias({"invoice_id", "invoiceId"})
    private String invoiceId;

    @JsonAlias({"user_id", "userId"})
    private String userId;

    @JsonAlias({"client_id", "clientId"})
    private String clientId;

    @JsonAlias({"response_type", "responseType"})
    private String responseType;

    @JsonAlias({"response_text", "responseText"})
    private String responseText;

    @JsonAlias({"proposed_payment_date", "proposedPaymentDate"})
    private LocalDate proposedPaymentDate;

    @JsonAlias({"review_status", "reviewStatus"})
    private String reviewStatus;

    @JsonAlias({"client_email", "clientEmail"})
    private String clientEmail;

    @JsonAlias({"created_at", "createdAt"})
    private Instant createdAt;

    @JsonAlias({"reviewed_at", "reviewedAt"})
    private Instant reviewedAt;

    public ClientResponseDto() {
    }

    public static ClientResponseDto fromEntity(ClientResponse entity) {
        if (entity == null) return null;
        ClientResponseDto dto = new ClientResponseDto();
        dto.setId(entity.getId());
        dto.setInvoiceId(entity.getInvoiceId());
        dto.setUserId(entity.getUserId());
        dto.setClientId(entity.getClientId());
        dto.setResponseType(entity.getResponseType());
        dto.setResponseText(entity.getResponseText());
        dto.setProposedPaymentDate(entity.getProposedPaymentDate());
        dto.setReviewStatus(entity.getReviewStatus());
        dto.setClientEmail(entity.getClientEmail());
        dto.setCreatedAt(entity.getCreatedAt());
        dto.setReviewedAt(entity.getReviewedAt());
        return dto;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getInvoiceId() {
        return invoiceId;
    }

    public void setInvoiceId(String invoiceId) {
        this.invoiceId = invoiceId;
    }

    public String getUserId() {
        return userId;
    }

    public void setUserId(String userId) {
        this.userId = userId;
    }

    public String getClientId() {
        return clientId;
    }

    public void setClientId(String clientId) {
        this.clientId = clientId;
    }

    public String getResponseType() {
        return responseType;
    }

    public void setResponseType(String responseType) {
        this.responseType = responseType;
    }

    public String getResponseText() {
        return responseText;
    }

    public void setResponseText(String responseText) {
        this.responseText = responseText;
    }

    public LocalDate getProposedPaymentDate() {
        return proposedPaymentDate;
    }

    public void setProposedPaymentDate(LocalDate proposedPaymentDate) {
        this.proposedPaymentDate = proposedPaymentDate;
    }

    public String getReviewStatus() {
        return reviewStatus;
    }

    public void setReviewStatus(String reviewStatus) {
        this.reviewStatus = reviewStatus;
    }

    public String getClientEmail() {
        return clientEmail;
    }

    public void setClientEmail(String clientEmail) {
        this.clientEmail = clientEmail;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public Instant getReviewedAt() {
        return reviewedAt;
    }

    public void setReviewedAt(Instant reviewedAt) {
        this.reviewedAt = reviewedAt;
    }
}
