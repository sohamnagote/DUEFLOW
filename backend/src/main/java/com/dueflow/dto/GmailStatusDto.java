package com.dueflow.dto;

import java.time.Instant;

public class GmailStatusDto {
    private boolean connected;
    private String email;
    private String status;
    private Instant tokenExpiry;

    public GmailStatusDto() {
    }

    public GmailStatusDto(boolean connected, String email, String status, Instant tokenExpiry) {
        this.connected = connected;
        this.email = email;
        this.status = status;
        this.tokenExpiry = tokenExpiry;
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
}
