package in.dueflow.dto;

import in.dueflow.entity.ReminderLog;
import java.math.BigDecimal;
import java.util.List;

public class DashboardDtos {

    public static class DashboardStatsResponse {
        private BigDecimal totalOutstanding;
        private BigDecimal totalOverdue;
        private BigDecimal totalPaid;
        private long totalInvoices;
        private long overdueCount;
        private long activeCadenceCount;
        private List<ReminderLog> recentLogs;

        public DashboardStatsResponse(BigDecimal totalOutstanding, BigDecimal totalOverdue, BigDecimal totalPaid,
                                      long totalInvoices, long overdueCount, long activeCadenceCount,
                                      List<ReminderLog> recentLogs) {
            this.totalOutstanding = totalOutstanding;
            this.totalOverdue = totalOverdue;
            this.totalPaid = totalPaid;
            this.totalInvoices = totalInvoices;
            this.overdueCount = overdueCount;
            this.activeCadenceCount = activeCadenceCount;
            this.recentLogs = recentLogs;
        }

        public BigDecimal getTotalOutstanding() { return totalOutstanding; }
        public BigDecimal getTotalOverdue() { return totalOverdue; }
        public BigDecimal getTotalPaid() { return totalPaid; }
        public long getTotalInvoices() { return totalInvoices; }
        public long getOverdueCount() { return overdueCount; }
        public long getActiveCadenceCount() { return activeCadenceCount; }
        public List<ReminderLog> getRecentLogs() { return recentLogs; }
    }
}
