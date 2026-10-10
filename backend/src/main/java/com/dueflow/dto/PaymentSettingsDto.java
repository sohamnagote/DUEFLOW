package com.dueflow.dto;

import com.dueflow.domain.PaymentSettings;

public class PaymentSettingsDto {
    private String upiId;
    private String beneficiaryName;
    private String bankName;
    private String accountNumber;
    private String routingNumber;
    private String paymentInstructions;
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
}
