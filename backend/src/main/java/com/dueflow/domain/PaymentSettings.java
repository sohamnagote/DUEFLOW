package com.dueflow.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "payment_settings")
public class PaymentSettings {

    @Id
    @Column(name = "id", length = 64, nullable = false)
    private String id = UUID.randomUUID().toString();

    @Column(name = "user_id", length = 64, nullable = false, unique = true)
    private String userId;

    @Column(name = "upi_id")
    private String upiId;

    @Column(name = "beneficiary_name")
    private String beneficiaryName;

    @Column(name = "bank_name")
    private String bankName;

    @Column(name = "account_number", length = 100)
    private String accountNumber;

    @Column(name = "routing_number", length = 100)
    private String routingNumber;

    @Column(name = "payment_instructions", columnDefinition = "TEXT")
    private String paymentInstructions;

    @Column(name = "qr_code_url", columnDefinition = "TEXT")
    private String qrCodeUrl;

    @Column(name = "qr_code_storage_path", length = 500)
    private String qrCodeStoragePath;

    @Column(name = "business_name")
    private String businessName;

    @Column(name = "logo_url", columnDefinition = "TEXT")
    private String logoUrl;

    @Column(name = "logo_storage_path", length = 500)
    private String logoStoragePath;

    @Column(name = "business_email")
    private String businessEmail;

    @Column(name = "business_phone", length = 50)
    private String businessPhone;

    @Column(name = "business_address", columnDefinition = "TEXT")
    private String businessAddress;

    @Column(name = "brand_color", length = 20)
    private String brandColor = "#001126";

    @Column(name = "footer_terms", columnDefinition = "TEXT")
    private String footerTerms;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    public PaymentSettings() {
    }

    public PaymentSettings(String userId) {
        this.userId = userId;
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

    public String getUpiId() {
        return upiId;
    }

    public void setUpiId(String upiId) {
        this.upiId = upiId;
    }

    public String getBeneficiaryName() {
        return beneficiaryName;
    }

    public void setBeneficiaryName(String beneficiaryName) {
        this.beneficiaryName = beneficiaryName;
    }

    public String getBankName() {
        return bankName;
    }

    public void setBankName(String bankName) {
        this.bankName = bankName;
    }

    public String getAccountNumber() {
        return accountNumber;
    }

    public void setAccountNumber(String accountNumber) {
        this.accountNumber = accountNumber;
    }

    public String getRoutingNumber() {
        return routingNumber;
    }

    public void setRoutingNumber(String routingNumber) {
        this.routingNumber = routingNumber;
    }

    public String getPaymentInstructions() {
        return paymentInstructions;
    }

    public void setPaymentInstructions(String paymentInstructions) {
        this.paymentInstructions = paymentInstructions;
    }

    public String getQrCodeUrl() {
        return qrCodeUrl;
    }

    public void setQrCodeUrl(String qrCodeUrl) {
        this.qrCodeUrl = qrCodeUrl;
    }

    public String getQrCodeStoragePath() {
        return qrCodeStoragePath;
    }

    public void setQrCodeStoragePath(String qrCodeStoragePath) {
        this.qrCodeStoragePath = qrCodeStoragePath;
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

    public String getBusinessName() {
        return businessName;
    }

    public void setBusinessName(String businessName) {
        this.businessName = businessName;
    }

    public String getLogoUrl() {
        return logoUrl;
    }

    public void setLogoUrl(String logoUrl) {
        this.logoUrl = logoUrl;
    }

    public String getLogoStoragePath() {
        return logoStoragePath;
    }

    public void setLogoStoragePath(String logoStoragePath) {
        this.logoStoragePath = logoStoragePath;
    }

    public String getBusinessEmail() {
        return businessEmail;
    }

    public void setBusinessEmail(String businessEmail) {
        this.businessEmail = businessEmail;
    }

    public String getBusinessPhone() {
        return businessPhone;
    }

    public void setBusinessPhone(String businessPhone) {
        this.businessPhone = businessPhone;
    }

    public String getBusinessAddress() {
        return businessAddress;
    }

    public void setBusinessAddress(String businessAddress) {
        this.businessAddress = businessAddress;
    }

    public String getBrandColor() {
        return brandColor != null && !brandColor.isBlank() ? brandColor : "#001126";
    }

    public void setBrandColor(String brandColor) {
        this.brandColor = brandColor;
    }

    public String getFooterTerms() {
        return footerTerms;
    }

    public void setFooterTerms(String footerTerms) {
        this.footerTerms = footerTerms;
    }
}
