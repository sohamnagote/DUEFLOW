package com.dueflow.domain;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.*;

class InvoiceCalculationTest {

    @Test
    void testRecalculateTotalsWithSingleItem() {
        Invoice invoice = new Invoice();
        invoice.setUserId("user-1");
        invoice.setInvoiceNumber("INV-2026-001");
        invoice.setIssueDate(LocalDate.now());
        invoice.setDueDate(LocalDate.now().plusDays(15));
        invoice.setCurrency("INR");

        invoice.addItem(new InvoiceItem("Frontend Development", new BigDecimal("40.0"), new BigDecimal("1250.00")));
        invoice.recalculateTotals();

        assertEquals(new BigDecimal("50000.00"), invoice.getSubtotal());
        assertEquals(new BigDecimal("50000.00"), invoice.getTotalAmount());
    }

    @Test
    void testRecalculateTotalsWithMultipleItemsTaxAndDiscount() {
        Invoice invoice = new Invoice();
        invoice.setUserId("user-1");
        invoice.setInvoiceNumber("INV-2026-002");
        invoice.setCurrency("INR");

        // Item 1: 10 hrs * 1500 = 15000
        invoice.addItem(new InvoiceItem("Design", new BigDecimal("10"), new BigDecimal("1500.00")));
        // Item 2: 20 hrs * 2000 = 40000
        invoice.addItem(new InvoiceItem("Development", new BigDecimal("20"), new BigDecimal("2000.00")));

        // Subtotal = 55000.00
        // 18% GST = 9900.00
        invoice.setTaxAmount(new BigDecimal("9900.00"));
        // Discount = 2500.00
        invoice.setDiscountAmount(new BigDecimal("2500.00"));

        invoice.recalculateTotals();

        assertEquals(new BigDecimal("55000.00"), invoice.getSubtotal());
        // Total = 55000 + 9900 - 2500 = 62400.00
        assertEquals(new BigDecimal("62400.00"), invoice.getTotalAmount());
    }

    @Test
    void testDecimalSafeFractionsRounding() {
        Invoice invoice = new Invoice();
        invoice.setUserId("user-1");
        invoice.setCurrency("USD");

        // 3.333 units * 33.33
        invoice.addItem(new InvoiceItem("Consulting", new BigDecimal("3.33"), new BigDecimal("33.33")));
        invoice.recalculateTotals();

        // 3.33 * 33.33 = 110.9889 -> rounded to 110.99
        assertEquals(new BigDecimal("110.99"), invoice.getSubtotal());
        assertEquals(new BigDecimal("110.99"), invoice.getTotalAmount());
    }
}
