package in.dueflow;

import in.dueflow.dto.DashboardDtos.DashboardStatsResponse;
import in.dueflow.entity.Invoice;
import in.dueflow.repository.InvoiceRepository;
import in.dueflow.repository.ReminderLogRepository;
import in.dueflow.service.DashboardService;
import in.dueflow.service.StatusService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

public class DashboardServiceTest {

    private InvoiceRepository invoiceRepository;
    private ReminderLogRepository reminderLogRepository;
    private StatusService statusService;
    private DashboardService dashboardService;

    @BeforeEach
    void setUp() {
        invoiceRepository = Mockito.mock(InvoiceRepository.class);
        reminderLogRepository = Mockito.mock(ReminderLogRepository.class);
        statusService = new StatusService();
        dashboardService = new DashboardService(invoiceRepository, reminderLogRepository, statusService);
    }

    @Test
    void testDashboardAggregatesCalculation() {
        UUID userId = UUID.randomUUID();

        Invoice invPaid = new Invoice();
        invPaid.setId(UUID.randomUUID());
        invPaid.setUserId(userId);
        invPaid.setAmount(new BigDecimal("10000.00"));
        invPaid.setStatus("paid");

        Invoice invOverdue = new Invoice();
        invOverdue.setId(UUID.randomUUID());
        invOverdue.setUserId(userId);
        invOverdue.setAmount(new BigDecimal("15000.00"));
        invOverdue.setStatus("unpaid");
        invOverdue.setDueDate(LocalDate.now().minusDays(5));
        invOverdue.setRemindersEnabled(true);

        Invoice invDueSoon = new Invoice();
        invDueSoon.setId(UUID.randomUUID());
        invDueSoon.setUserId(userId);
        invDueSoon.setAmount(new BigDecimal("20000.00"));
        invDueSoon.setStatus("unpaid");
        invDueSoon.setDueDate(LocalDate.now().plusDays(2));
        invDueSoon.setRemindersEnabled(true);

        when(invoiceRepository.findByUserIdOrderByCreatedAtDesc(userId))
                .thenReturn(List.of(invPaid, invOverdue, invDueSoon));
        when(reminderLogRepository.findByInvoiceIdInOrderByCreatedAtDesc(any(), any()))
                .thenReturn(List.of());

        DashboardStatsResponse stats = dashboardService.getDashboardStats(userId);

        assertEquals(3, stats.getTotalInvoices());
        assertEquals(new BigDecimal("10000.00"), stats.getTotalPaid());
        assertEquals(new BigDecimal("35000.00"), stats.getTotalOutstanding());
        assertEquals(new BigDecimal("15000.00"), stats.getTotalOverdue());
        assertEquals(1, stats.getOverdueCount());
        assertEquals(2, stats.getActiveCadenceCount());
    }
}
