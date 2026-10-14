package com.dueflow.dto;

import com.dueflow.domain.PaymentSettings;
import com.fasterxml.jackson.annotation.JsonAlias;

public class PaymentSettingsDto {
    @JsonAlias({"upi_id"})
    private String upiId;

    @JsonAlias({"beneficiary_name"})
    private String beneficiaryName;

    @JsonAlias({"bank_name"})
    private String bankName;

    @JsonAlias({"account_number"})
    private String accountNumber;

    @JsonAlias({"routing_number", "ifsc", "ifsc_code", "bank_ifsc"})
    private String routingNumber;

    @JsonAlias({"payment_instructions", "notes", "payment_notes"})
    private String paymentInstructions;

    @JsonAlias({"qrCodeUrl", "payment_qr_url", "qr_code_url"})
    private String paymentQrUrl;

    @JsonAlias({"business_name", "company_name", "display_name", "brandName", "brand_name"})
    private String businessName;

    @JsonAlias({"logo_url", "businessLogoUrl", "business_logo_url"})
    private String logoUrl;

    @JsonAlias({"business_email", "company_email", "brand_email"})
    private String businessEmail;

    @JsonAlias({"business_phone", "company_phone", "brand_phone"})
    private String businessPhone;

    @JsonAlias({"business_address", "company_address", "brand_address", "address"})
    private String businessAddress;

    @JsonAlias({"brand_color", "accent_color", "accentColor"})
    private String brandColor;

    @JsonAlias({"footer_terms", "payment_terms", "footerText", "footer_text"})
    private String footerTerms;

    public PaymentSettingsDto() {
    }

    public static PaymentSettingsDto fromEntity(PaymentSettings s) {
        if (s == null) return new PaymentSettingsDto();
        PaymentSettingsDto dto = new PaymentSettingsDto();
        dto.setUpiId(s.getUpiId());
        dto.setBeneficiaryName(s.getBeneficiaryName());
        dto.setBankName(s.getBankName());
        dto.setAccountNumber(s.getAccountNumber());
        dto.setRoutingNumber(s.getRoutingNumber());
        dto.setPaymentInstructions(s.getPaymentInstructions());
        dto.setPaymentQrUrl(s.getQrCodeUrl());
        dto.setBusinessName(s.getBusinessName());
        dto.setLogoUrl(s.getLogoUrl());
        dto.setBusinessEmail(s.getBusinessEmail());
        dto.setBusinessPhone(s.getBusinessPhone());
        dto.setBusinessAddress(s.getBusinessAddress());
        dto.setBrandColor(s.getBrandColor());
        dto.setFooterTerms(s.getFooterTerms());
        return dto;
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

    public String getPaymentQrUrl() {
        return paymentQrUrl;
    }

    public void setPaymentQrUrl(String paymentQrUrl) {
        this.paymentQrUrl = paymentQrUrl;
    }

    public String getQrCodeUrl() {
        return paymentQrUrl;
    }

    public void setQrCodeUrl(String qrCodeUrl) {
        this.paymentQrUrl = qrCodeUrl;
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
        return brandColor;
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
