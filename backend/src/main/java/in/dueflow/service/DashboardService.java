package in.dueflow.service;

import in.dueflow.dto.DashboardDtos.DashboardStatsResponse;
import in.dueflow.entity.Invoice;
import in.dueflow.entity.ReminderLog;
import in.dueflow.repository.InvoiceRepository;
import in.dueflow.repository.ReminderLogRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class DashboardService {

    private final InvoiceRepository invoiceRepository;
    private final ReminderLogRepository reminderLogRepository;
    private final StatusService statusService;

    public DashboardService(InvoiceRepository invoiceRepository,
                            ReminderLogRepository reminderLogRepository,
                            StatusService statusService) {
        this.invoiceRepository = invoiceRepository;
        this.reminderLogRepository = reminderLogRepository;
        this.statusService = statusService;
    }

    public DashboardStatsResponse getDashboardStats(UUID userId) {
        List<Invoice> invoices = invoiceRepository.findByUserIdOrderByCreatedAtDesc(userId);

        BigDecimal totalOutstanding = BigDecimal.ZERO;
        BigDecimal totalOverdue = BigDecimal.ZERO;
        BigDecimal totalPaid = BigDecimal.ZERO;
        long overdueCount = 0;
        long activeCadenceCount = 0;

        for (Invoice inv : invoices) {
            String opStatus = statusService.deriveOperationalStatus(inv);
            if ("paid".equalsIgnoreCase(opStatus)) {
                totalPaid = totalPaid.add(inv.getAmount());
            } else {
                totalOutstanding = totalOutstanding.add(inv.getAmount());
                if ("overdue".equalsIgnoreCase(opStatus)) {
                    totalOverdue = totalOverdue.add(inv.getAmount());
                    overdueCount++;
                }
                if (Boolean.TRUE.equals(inv.getRemindersEnabled())) {
                    activeCadenceCount++;
                }
            }
        }

        List<ReminderLog> recentLogs = new ArrayList<>();
        List<UUID> invoiceIds = invoices.stream().map(Invoice::getId).collect(Collectors.toList());
        if (!invoiceIds.isEmpty()) {
            recentLogs = reminderLogRepository.findByInvoiceIdInOrderByCreatedAtDesc(
                    invoiceIds, PageRequest.of(0, 10)
            );
        }

        return new DashboardStatsResponse(
                totalOutstanding,
                totalOverdue,
                totalPaid,
                invoices.size(),
                overdueCount,
                activeCadenceCount,
                recentLogs
        );
    }
}
