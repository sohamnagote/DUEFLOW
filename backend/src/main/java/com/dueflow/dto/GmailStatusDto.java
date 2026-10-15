package com.dueflow.dto;

import java.time.Instant;

public class GmailStatusDto {
    private boolean connected;
    private String email;
    private String status;
    private Instant tokenExpiry;
    private boolean hasReplyDetectionScope;
    private Instant lastSyncAt;

    public GmailStatusDto() {
    }

    public GmailStatusDto(boolean connected, String email, String status, Instant tokenExpiry) {
        this.connected = connected;
        this.email = email;
        this.status = status;
        this.tokenExpiry = tokenExpiry;
    }

    public GmailStatusDto(boolean connected, String email, String status, Instant tokenExpiry, boolean hasReplyDetectionScope, Instant lastSyncAt) {
        this.connected = connected;
        this.email = email;
        this.status = status;
        this.tokenExpiry = tokenExpiry;
        this.hasReplyDetectionScope = hasReplyDetectionScope;
        this.lastSyncAt = lastSyncAt;
    }


    public boolean isConnected() {
        return connected;
    }

    public void setConnected(boolean connected) {
        this.connected = connected;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public Instant getTokenExpiry() {
        return tokenExpiry;
    }

    public void setTokenExpiry(Instant tokenExpiry) {
        this.tokenExpiry = tokenExpiry;
    }

    public boolean isHasReplyDetectionScope() {
        return hasReplyDetectionScope;
    }

    public void setHasReplyDetectionScope(boolean hasReplyDetectionScope) {
        this.hasReplyDetectionScope = hasReplyDetectionScope;
    }

    public Instant getLastSyncAt() {
        return lastSyncAt;
    }

    public void setLastSyncAt(Instant lastSyncAt) {
        this.lastSyncAt = lastSyncAt;
    }
}

