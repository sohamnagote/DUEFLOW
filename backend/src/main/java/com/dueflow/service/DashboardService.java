package com.dueflow.service;

import com.dueflow.domain.Invoice;
import com.dueflow.domain.InvoiceStatus;
import com.dueflow.domain.ReminderStatus;
import com.dueflow.dto.DashboardSummaryDto;
import com.dueflow.repository.ClientRepository;
import com.dueflow.repository.InvoiceRepository;
import com.dueflow.repository.ReminderHistoryRepository;
import com.dueflow.repository.ScheduledReminderRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class DashboardService {

    private final InvoiceRepository invoiceRepository;
    private final ClientRepository clientRepository;
    private final ScheduledReminderRepository scheduledReminderRepository;
    private final ReminderHistoryRepository reminderHistoryRepository;

    public DashboardService(
            InvoiceRepository invoiceRepository,
            ClientRepository clientRepository,
            ScheduledReminderRepository scheduledReminderRepository,
            ReminderHistoryRepository reminderHistoryRepository) {
        this.invoiceRepository = invoiceRepository;
        this.clientRepository = clientRepository;
        this.scheduledReminderRepository = scheduledReminderRepository;
        this.reminderHistoryRepository = reminderHistoryRepository;
    }

    @Transactional(readOnly = true)
    public DashboardSummaryDto getDashboardSummary(String userId) {
        DashboardSummaryDto summary = new DashboardSummaryDto();

        List<Invoice> invoices = invoiceRepository.findByUserIdOrderByCreatedAtDesc(userId);
        LocalDate today = LocalDate.now();

        long totalCount = invoices.size();
        long unpaidCount = 0;
        long overdueCount = 0;
        long paidCount = 0;

        Map<String, BigDecimal> outstandingByCurrency = new HashMap<>();
        Map<String, BigDecimal> collectedByCurrency = new HashMap<>();

        for (Invoice invoice : invoices) {
            String currency = invoice.getCurrency() != null ? invoice.getCurrency().toUpperCase() : "INR";
            BigDecimal total = invoice.getTotalAmount() != null ? invoice.getTotalAmount() : BigDecimal.ZERO;

            if (invoice.getStatus() == InvoiceStatus.PAID) {
                paidCount++;
                collectedByCurrency.merge(currency, total, BigDecimal::add);
            } else if (invoice.getStatus() == InvoiceStatus.DRAFT) {
                // Drafts are not yet outstanding invoices
            } else if (invoice.getStatus() == InvoiceStatus.UNPAID || invoice.getStatus() == InvoiceStatus.OVERDUE) {
                unpaidCount++;
                if (invoice.getStatus() == InvoiceStatus.OVERDUE || (invoice.getDueDate() != null && invoice.getDueDate().isBefore(today))) {
                    overdueCount++;
                }
                outstandingByCurrency.merge(currency, total, BigDecimal::add);
            }
        }

        long totalClients = clientRepository.countByUserId(userId);
        long upcomingReminders = scheduledReminderRepository.findByUserIdOrderByScheduledAtAsc(userId).stream()
                .filter(r -> r.getStatus() == ReminderStatus.PENDING)
                .count();
        long failedReminders = reminderHistoryRepository.countByUserIdAndStatus(userId, "FAILED");

        summary.setTotalInvoices(totalCount);
        summary.setUnpaidInvoices(unpaidCount);
        summary.setOverdueInvoices(overdueCount);
        summary.setPaidInvoices(paidCount);
        summary.setTotalClients(totalClients);
        summary.setUpcomingReminders(upcomingReminders);
        summary.setFailedReminders(failedReminders);
        summary.setTotalOutstandingByCurrency(outstandingByCurrency);
        summary.setTotalCollectedByCurrency(collectedByCurrency);

        return summary;
    }
}
