package com.dueflow.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "processed_gmail_messages")
public class ProcessedGmailMessage {

    @Id
    @Column(name = "id", length = 64, nullable = false)
    private String id = UUID.randomUUID().toString();

    @Column(name = "user_id", length = 64, nullable = false)
    private String userId;

    @Column(name = "gmail_message_id", length = 255, nullable = false, unique = true)
    private String gmailMessageId;

    @Column(name = "gmail_thread_id", length = 255)
    private String gmailThreadId;

    @Column(name = "invoice_id", length = 64)
    private String invoiceId;

    @Column(name = "sender_email", length = 255)
    private String senderEmail;

    @Column(name = "subject", columnDefinition = "TEXT")
    private String subject;

    @Column(name = "snippet", columnDefinition = "TEXT")
    private String snippet;

    @Column(name = "classification", length = 100)
    private String classification;

    @Column(name = "action_taken", length = 100)
    private String actionTaken;

    @Column(name = "processed_at")
    private Instant processedAt = Instant.now();

    public ProcessedGmailMessage() {
    }

    public ProcessedGmailMessage(String userId, String gmailMessageId, String gmailThreadId, String invoiceId, String senderEmail, String subject, String snippet, String classification, String actionTaken) {
        this.userId = userId;
        this.gmailMessageId = gmailMessageId;
        this.gmailThreadId = gmailThreadId;
        this.invoiceId = invoiceId;
        this.senderEmail = senderEmail;
        this.subject = subject;
        this.snippet = snippet;
        this.classification = classification;
        this.actionTaken = actionTaken;
        this.processedAt = Instant.now();
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getUserId() {
        return userId;
    }

    public void setUserId(String userId) {
        this.userId = userId;
    }

    public String getGmailMessageId() {
        return gmailMessageId;
    }

    public void setGmailMessageId(String gmailMessageId) {
        this.gmailMessageId = gmailMessageId;
    }

    public String getGmailThreadId() {
        return gmailThreadId;
    }

    public void setGmailThreadId(String gmailThreadId) {
        this.gmailThreadId = gmailThreadId;
    }

    public String getInvoiceId() {
        return invoiceId;
    }

    public void setInvoiceId(String invoiceId) {
        this.invoiceId = invoiceId;
    }

    public String getSenderEmail() {
        return senderEmail;
    }

    public void setSenderEmail(String senderEmail) {
        this.senderEmail = senderEmail;
    }

    public String getSubject() {
        return subject;
    }

    public void setSubject(String subject) {
        this.subject = subject;
    }

    public String getSnippet() {
        return snippet;
    }

    public void setSnippet(String snippet) {
        this.snippet = snippet;
    }

    public String getClassification() {
        return classification;
    }

    public void setClassification(String classification) {
        this.classification = classification;
    }

    public String getActionTaken() {
        return actionTaken;
    }

    public void setActionTaken(String actionTaken) {
        this.actionTaken = actionTaken;
    }

    public Instant getProcessedAt() {
        return processedAt;
    }

    public void setProcessedAt(Instant processedAt) {
        this.processedAt = processedAt;
    }
}
