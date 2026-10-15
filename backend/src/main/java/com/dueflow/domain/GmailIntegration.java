package com.dueflow.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "gmail_integrations")
public class GmailIntegration {

    @Id
    @Column(name = "id", length = 64, nullable = false)
    private String id = UUID.randomUUID().toString();

    @Column(name = "user_id", length = 64, nullable = false, unique = true)
    private String userId;

    @Column(name = "gmail_email", nullable = false)
    private String gmailEmail;

    @Column(name = "encrypted_refresh_token", columnDefinition = "TEXT", nullable = false)
    private String encryptedRefreshToken;

    @Column(name = "token_expiry")
    private Instant tokenExpiry;

    @Column(name = "granted_scopes", columnDefinition = "TEXT")
    private String grantedScopes;

    @Column(name = "connection_status", length = 30, nullable = false)
    private String connectionStatus = "CONNECTED"; // CONNECTED, DISCONNECTED, ERROR

    @Column(name = "last_history_id", length = 100)
    private String lastHistoryId;

    @Column(name = "last_sync_at")
    private Instant lastSyncAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    public GmailIntegration() {
    }

    public GmailIntegration(String userId, String gmailEmail, String encryptedRefreshToken) {
        this.userId = userId;
        this.gmailEmail = gmailEmail;
        this.encryptedRefreshToken = encryptedRefreshToken;
    }

    @PreUpdate
    public void onUpdate() {
        this.updatedAt = Instant.now();
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

    public String getGmailEmail() {
        return gmailEmail;
    }

    public void setGmailEmail(String gmailEmail) {
        this.gmailEmail = gmailEmail;
    }

    public String getEncryptedRefreshToken() {
        return encryptedRefreshToken;
    }

    public void setEncryptedRefreshToken(String encryptedRefreshToken) {
        this.encryptedRefreshToken = encryptedRefreshToken;
    }

    public Instant getTokenExpiry() {
        return tokenExpiry;
    }

    public void setTokenExpiry(Instant tokenExpiry) {
        this.tokenExpiry = tokenExpiry;
    }

    public String getGrantedScopes() {
        return grantedScopes;
    }

    public void setGrantedScopes(String grantedScopes) {
        this.grantedScopes = grantedScopes;
    }

    public String getConnectionStatus() {
        return connectionStatus;
    }

    public void setConnectionStatus(String connectionStatus) {
        this.connectionStatus = connectionStatus;
    }

    public String getLastHistoryId() {
        return lastHistoryId;
    }

    public void setLastHistoryId(String lastHistoryId) {
        this.lastHistoryId = lastHistoryId;
    }

    public Instant getLastSyncAt() {
        return lastSyncAt;
    }

    public void setLastSyncAt(Instant lastSyncAt) {
        this.lastSyncAt = lastSyncAt;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = updatedAt;
    }
}
