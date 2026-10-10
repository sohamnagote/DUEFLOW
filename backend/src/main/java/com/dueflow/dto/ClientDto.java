package com.dueflow.dto;

import com.dueflow.domain.Client;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.Instant;

public class ClientDto {
    private String id;

    @NotBlank(message = "Client name is required")
    @Size(max = 255, message = "Client name cannot exceed 255 characters")
    private String name;

    @NotBlank(message = "Client email is required")
    @Email(message = "Valid email address is required")
    private String email;

    private String phone;
    private String billingAddress;
    private String taxIdentifier;
    private String internalNotes;
    private BigDecimal totalInvoiced = BigDecimal.ZERO;
    private BigDecimal totalOutstanding = BigDecimal.ZERO;
    private int invoicesCount = 0;
    private Instant createdAt;

    public ClientDto() {
    }

    public static ClientDto fromEntity(Client c) {
        if (c == null) return null;
        ClientDto dto = new ClientDto();
        dto.setId(c.getId());
        dto.setName(c.getName());
        dto.setEmail(c.getEmail());
        dto.setPhone(c.getPhone());
        dto.setBillingAddress(c.getBillingAddress());
        dto.setTaxIdentifier(c.getTaxIdentifier());
        dto.setInternalNotes(c.getInternalNotes());
        dto.setCreatedAt(c.getCreatedAt());
        return dto;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPhone() {
        return phone;
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }

    public String getBillingAddress() {
        return billingAddress;
    }

    public void setBillingAddress(String billingAddress) {
        this.billingAddress = billingAddress;
    }

    public String getTaxIdentifier() {
        return taxIdentifier;
    }

    public void setTaxIdentifier(String taxIdentifier) {
        this.taxIdentifier = taxIdentifier;
    }

    public String getInternalNotes() {
        return internalNotes;
    }

    public void setInternalNotes(String internalNotes) {
        this.internalNotes = internalNotes;
    }

    public BigDecimal getTotalInvoiced() {
        return totalInvoiced;
    }

    public void setTotalInvoiced(BigDecimal totalInvoiced) {
        this.totalInvoiced = totalInvoiced;
    }

    public BigDecimal getTotalOutstanding() {
        return totalOutstanding;
    }

    public void setTotalOutstanding(BigDecimal totalOutstanding) {
        this.totalOutstanding = totalOutstanding;
    }

    public int getInvoicesCount() {
        return invoicesCount;
    }

    public void setInvoicesCount(int invoicesCount) {
        this.invoicesCount = invoicesCount;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }
}
