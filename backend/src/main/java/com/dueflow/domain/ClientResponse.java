package com.dueflow.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "client_responses")
public class ClientResponse {

    @Id
    @Column(name = "id", length = 64, nullable = false)
    private String id = UUID.randomUUID().toString();

    @Column(name = "invoice_id", length = 64, nullable = false)
    private String invoiceId;

    @Column(name = "user_id", length = 64, nullable = false)
    private String userId;

    @Column(name = "client_id", length = 64)
    private String clientId;

    @Column(name = "response_type", length = 50, nullable = false)
    private String responseType; // PAYMENT_REPORTED, NEED_MORE_TIME, QUESTION, CORRECTION_REQUESTED

    @Column(name = "response_text", columnDefinition = "TEXT")
    private String responseText;

    @Column(name = "proposed_payment_date")
    private LocalDate proposedPaymentDate;

    @Column(name = "review_status", length = 50)
    private String reviewStatus = "PENDING_REVIEW"; // PENDING_REVIEW, RESOLVED, DISMISSED

    @Column(name = "client_email")
    private String clientEmail;

    @Column(name = "idempotency_key", unique = true)
    private String idempotencyKey;

    @Column(name = "created_at")
    private Instant createdAt = Instant.now();

    @Column(name = "reviewed_at")
    private Instant reviewedAt;

    public ClientResponse() {
    }

    public ClientResponse(String invoiceId, String userId, String clientId, String responseType, String responseText, String clientEmail) {
        this.invoiceId = invoiceId;
        this.userId = userId;
        this.clientId = clientId;
        this.responseType = responseType;
        this.responseText = responseText;
        this.clientEmail = clientEmail;
        this.createdAt = Instant.now();
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

    public String getIdempotencyKey() {
        return idempotencyKey;
    }

    public void setIdempotencyKey(String idempotencyKey) {
        this.idempotencyKey = idempotencyKey;
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
