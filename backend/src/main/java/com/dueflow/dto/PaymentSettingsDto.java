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
}
