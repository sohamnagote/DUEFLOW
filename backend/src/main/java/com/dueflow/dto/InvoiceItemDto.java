package com.dueflow.dto;

import com.dueflow.domain.InvoiceItem;
import com.fasterxml.jackson.annotation.JsonAlias;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;

public class InvoiceItemDto {
    private String id;

    @NotBlank(message = "Item description is required")
    private String description;

    @NotNull(message = "Item quantity is required")
    @Positive(message = "Quantity must be greater than zero")
    private BigDecimal quantity = BigDecimal.ONE;

    @NotNull(message = "Item unit price is required")
    @JsonAlias({"unit_price", "unitPrice", "rate"})
    private BigDecimal unitPrice = BigDecimal.ZERO;

    private BigDecimal amount = BigDecimal.ZERO;

    public InvoiceItemDto() {
    }

    public static InvoiceItemDto fromEntity(InvoiceItem item) {
        if (item == null) return null;
        InvoiceItemDto dto = new InvoiceItemDto();
        dto.setId(item.getId());
        dto.setDescription(item.getDescription());
        dto.setQuantity(item.getQuantity());
        dto.setUnitPrice(item.getUnitPrice());
        dto.setAmount(item.getAmount());
        return dto;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public BigDecimal getQuantity() {
        return quantity;
    }

    public void setQuantity(BigDecimal quantity) {
        this.quantity = quantity;
    }

    public BigDecimal getUnitPrice() {
        return unitPrice;
    }

    public void setUnitPrice(BigDecimal unitPrice) {
        this.unitPrice = unitPrice;
    }

    public BigDecimal getAmount() {
        return amount;
    }

    public void setAmount(BigDecimal amount) {
        this.amount = amount;
    }
}
