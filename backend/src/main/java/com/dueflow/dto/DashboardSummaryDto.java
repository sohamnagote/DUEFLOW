package com.dueflow.dto;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.Map;

public class DashboardSummaryDto {
    private long totalInvoices;
    private long unpaidInvoices;
    private long overdueInvoices;
    private long paidInvoices;
    private long totalClients;
    private long upcomingReminders;
    private long failedReminders;

    // Currency-separated monetary totals (Strictly avoids mixing INR and USD)
    private Map<String, BigDecimal> totalOutstandingByCurrency = new HashMap<>();
    private Map<String, BigDecimal> totalCollectedByCurrency = new HashMap<>();

    public DashboardSummaryDto() {
    }

    public long getTotalInvoices() {
        return totalInvoices;
    }

    public void setTotalInvoices(long totalInvoices) {
        this.totalInvoices = totalInvoices;
    }

    public long getUnpaidInvoices() {
        return unpaidInvoices;
    }

    public void setUnpaidInvoices(long unpaidInvoices) {
        this.unpaidInvoices = unpaidInvoices;
    }

    public long getOverdueInvoices() {
        return overdueInvoices;
    }

    public void setOverdueInvoices(long overdueInvoices) {
        this.overdueInvoices = overdueInvoices;
    }

    public long getPaidInvoices() {
        return paidInvoices;
    }

    public void setPaidInvoices(long paidInvoices) {
        this.paidInvoices = paidInvoices;
    }

    public long getTotalClients() {
        return totalClients;
    }

    public void setTotalClients(long totalClients) {
        this.totalClients = totalClients;
    }

    public long getUpcomingReminders() {
        return upcomingReminders;
    }

    public void setUpcomingReminders(long upcomingReminders) {
        this.upcomingReminders = upcomingReminders;
    }

    public long getFailedReminders() {
        return failedReminders;
    }

    public void setFailedReminders(long failedReminders) {
        this.failedReminders = failedReminders;
    }

    public Map<String, BigDecimal> getTotalOutstandingByCurrency() {
        return totalOutstandingByCurrency;
    }

    public void setTotalOutstandingByCurrency(Map<String, BigDecimal> totalOutstandingByCurrency) {
        this.totalOutstandingByCurrency = totalOutstandingByCurrency;
    }

    public Map<String, BigDecimal> getTotalCollectedByCurrency() {
        return totalCollectedByCurrency;
    }

    public void setTotalCollectedByCurrency(Map<String, BigDecimal> totalCollectedByCurrency) {
        this.totalCollectedByCurrency = totalCollectedByCurrency;
    }
}
