package com.dueflow.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public class PublicClientResponseSubmitDto {

    @NotBlank(message = "Response type is required")
    @JsonAlias({"response_type", "responseType"})
    private String responseType; // PAYMENT_REPORTED, NEED_MORE_TIME, QUESTION, CORRECTION_REQUESTED

    @Size(max = 2000, message = "Message must not exceed 2000 characters")
    @JsonAlias({"response_text", "responseText", "message"})
    private String responseText;

    @JsonAlias({"proposed_payment_date", "proposedPaymentDate"})
    private LocalDate proposedPaymentDate;

    @JsonAlias({"client_email", "clientEmail"})
    private String clientEmail;

    @JsonAlias({"idempotency_key", "idempotencyKey"})
    private String idempotencyKey;

    public PublicClientResponseSubmitDto() {
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
}
