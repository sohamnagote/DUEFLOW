package in.dueflow;

import in.dueflow.entity.ReminderRule;
import in.dueflow.service.SchedulerService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.List;
import java.util.Set;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

public class SchedulerServiceTest {

    private SchedulerService schedulerService;

    @BeforeEach
    void setUp() {
        schedulerService = new SchedulerService();
    }

    @Test
    void testScheduleGenerationExactCadence() {
        UUID invoiceId = UUID.randomUUID();
        LocalDate dueDate = LocalDate.now().plusDays(10);

        List<ReminderRule> rules = schedulerService.calculateReminderRules(
                invoiceId, dueDate, "Asia/Kolkata", "unpaid", List.of("email")
        );

        assertEquals(4, rules.size());

        // Stage 1: 3 days before
        assertEquals(3, rules.get(0).getOffsetDays());
        assertEquals("before", rules.get(0).getDirection());
        assertEquals("stage_1_3_days_before", rules.get(0).getOccurrenceKey());
        assertEquals("pending", rules.get(0).getStatus());

        // Stage 2: on due date
        assertEquals(0, rules.get(1).getOffsetDays());
        assertEquals("on", rules.get(1).getDirection());
        assertEquals("stage_2_on_due_date", rules.get(1).getOccurrenceKey());

        // Stage 3: 3 days overdue
        assertEquals(3, rules.get(2).getOffsetDays());
        assertEquals("after", rules.get(2).getDirection());
        assertEquals("stage_3_3_days_overdue", rules.get(2).getOccurrenceKey());

        // Stage 4: 7 days overdue
        assertEquals(7, rules.get(3).getOffsetDays());
        assertEquals("after", rules.get(3).getDirection());
        assertEquals("stage_4_7_days_overdue", rules.get(3).getOccurrenceKey());
    }

    @Test
    void testPaidInvoiceInitializesCancelledRules() {
        UUID invoiceId = UUID.randomUUID();
        LocalDate dueDate = LocalDate.now().plusDays(5);

        List<ReminderRule> rules = schedulerService.calculateReminderRules(
                invoiceId, dueDate, "Asia/Kolkata", "paid", List.of("email")
        );

        for (ReminderRule rule : rules) {
            assertEquals("cancelled", rule.getStatus());
            assertFalse(rule.getEnabled());
        }
    }

    @Test
    void testRecomputeRulesForUnpaidPreservesSentHistory() {
        UUID invoiceId = UUID.randomUUID();
        LocalDate dueDate = LocalDate.now().plusDays(5);

        // Stage 1 was already sent
        Set<String> sentKeys = Set.of("stage_1_3_days_before");

        List<ReminderRule> recomputed = schedulerService.recomputeRulesForUnpaid(
                invoiceId, dueDate, sentKeys, "Asia/Kolkata", List.of("email")
        );

        ReminderRule stage1 = recomputed.stream()
                .filter(r -> "stage_1_3_days_before".equals(r.getOccurrenceKey()))
                .findFirst().orElseThrow();
        assertEquals("sent", stage1.getStatus());
        assertFalse(stage1.getEnabled());

        ReminderRule stage2 = recomputed.stream()
                .filter(r -> "stage_2_on_due_date".equals(r.getOccurrenceKey()))
                .findFirst().orElseThrow();
        assertEquals("pending", stage2.getStatus());
        assertTrue(stage2.getEnabled());
    }
}
