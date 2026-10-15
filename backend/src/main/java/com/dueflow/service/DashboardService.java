package com.dueflow.service;

import com.dueflow.domain.Invoice;
import com.dueflow.domain.InvoiceStatus;
import com.dueflow.domain.ReminderStatus;
import com.dueflow.dto.DashboardSummaryDto;
import com.dueflow.repository.ClientRepository;
import com.dueflow.repository.InvoiceRepository;
import com.dueflow.repository.NotificationRepository;
import com.dueflow.repository.ReminderHistoryRepository;
import com.dueflow.repository.ScheduledReminderRepository;
import org.springframework.beans.factory.annotation.Autowired;
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
    private final NotificationRepository notificationRepository;

    public DashboardService(
            InvoiceRepository invoiceRepository,
            ClientRepository clientRepository,
            ScheduledReminderRepository scheduledReminderRepository,
            ReminderHistoryRepository reminderHistoryRepository) {
        this(invoiceRepository, clientRepository, scheduledReminderRepository, reminderHistoryRepository, null);
    }

    @Autowired
    public DashboardService(
            InvoiceRepository invoiceRepository,
            ClientRepository clientRepository,
            ScheduledReminderRepository scheduledReminderRepository,
            ReminderHistoryRepository reminderHistoryRepository,
            @Autowired(required = false) NotificationRepository notificationRepository) {
        this.invoiceRepository = invoiceRepository;
        this.clientRepository = clientRepository;
        this.scheduledReminderRepository = scheduledReminderRepository;
        this.reminderHistoryRepository = reminderHistoryRepository;
        this.notificationRepository = notificationRepository;
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
                .filter(r -> r.getStatus() == ReminderStatus.PENDING &&
                        r.getInvoice() != null &&
                        r.getInvoice().getStatus() != InvoiceStatus.PAID &&
                        r.getInvoice().getStatus() != InvoiceStatus.CANCELLED)
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

    /**
     * Atomically clears all invoices, items, scheduled reminders, delivery history,
     * notifications, and clients belonging exclusively to the authenticated user.
     * Preserves profile, currency settings, payment configuration, and Gmail connection.
     */
    @Transactional
    public Map<String, Object> resetWorkspace(String userId) {
        // 1. Cancel and delete all scheduled reminders for user
        scheduledReminderRepository.cancelPendingForUser(userId);
        scheduledReminderRepository.deleteByUserId(userId);

        // 2. Delete all reminder delivery history for user
        reminderHistoryRepository.deleteByUserId(userId);

        // 3. Delete notifications for user
        if (notificationRepository != null) {
            notificationRepository.deleteByUserId(userId);
        }

        // 4. Delete invoices for user (cascades to invoice_items, and frees FK restraint on clients)
        List<Invoice> userInvoices = invoiceRepository.findByUserIdOrderByCreatedAtDesc(userId);
        int invoiceCount = userInvoices.size();
        invoiceRepository.deleteByUserId(userId);

        // 5. Delete clients for user
        long clientCount = clientRepository.countByUserId(userId);
        clientRepository.deleteByUserId(userId);

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", "Workspace reset successfully. All invoices, clients, and reminder activity have been cleared.");
        response.put("invoicesDeleted", invoiceCount);
        response.put("clientsDeleted", clientCount);
        return response;
    }
}
