package com.dueflow.domain;

public enum InvoiceStatus {
    DRAFT,
    UNPAID,
    OVERDUE,
    PAID,
    CANCELLED;

    public static InvoiceStatus fromString(String val) {
        if (val == null) return UNPAID;
        try {
            return InvoiceStatus.valueOf(val.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            if ("PENDING".equalsIgnoreCase(val)) return UNPAID;
            return UNPAID;
        }
    }
}
