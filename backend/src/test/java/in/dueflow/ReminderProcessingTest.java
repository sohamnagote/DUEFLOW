package in.dueflow;

import in.dueflow.entity.Invoice;
import in.dueflow.entity.ReminderRule;
import in.dueflow.repository.InvoiceRepository;
import in.dueflow.repository.ProfileRepository;
import in.dueflow.repository.ReminderLogRepository;
import in.dueflow.repository.ReminderRuleRepository;
import in.dueflow.service.EmailService;
import in.dueflow.service.ReminderService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class ReminderProcessingTest {

    @Mock
    private ReminderRuleRepository reminderRuleRepository;
    @Mock
    private ReminderLogRepository reminderLogRepository;
    @Mock
    private InvoiceRepository invoiceRepository;
    @Mock
    private ProfileRepository profileRepository;
    @Mock
    private EmailService emailService;

    private in.dueflow.service.PdfInvoiceService pdfInvoiceService = new in.dueflow.service.PdfInvoiceService();
    private ReminderService reminderService;

    @BeforeEach
    void setUp() {
        reminderService = new ReminderService(
                reminderRuleRepository,
                reminderLogRepository,
                invoiceRepository,
                profileRepository,
                emailService,
                pdfInvoiceService
        );
    }

    @Test
    void testPaidInvoiceCancelsRuleAndNeverSends() {
        UUID invoiceId = UUID.randomUUID();
        UUID ruleId = UUID.randomUUID();

        ReminderRule rule = new ReminderRule();
        rule.setId(ruleId);
        rule.setInvoiceId(invoiceId);
        rule.setStatus("pending");
        rule.setEnabled(true);
        rule.setScheduledFor(Instant.now().minusSeconds(60));
        rule.setOccurrenceKey("stage_1_3_days_before");

        Invoice paidInvoice = new Invoice();
        paidInvoice.setId(invoiceId);
        paidInvoice.setInvoiceNumber("INV-2026-PAID");
        paidInvoice.setStatus("paid"); // Marked as paid!
        paidInvoice.setRemindersEnabled(true);

        when(reminderRuleRepository.recoverStuckProcessingRules(any(Instant.class), any(Instant.class)))
                .thenReturn(0);
        when(reminderRuleRepository.findByStatusAndEnabledTrueAndScheduledForLessThanEqualOrderByScheduledForAsc(eq("pending"), any(Instant.class)))
                .thenReturn(List.of(rule));
        when(reminderRuleRepository.claimRuleForProcessing(eq(ruleId), any(Instant.class)))
                .thenReturn(1);
        when(reminderRuleRepository.findById(ruleId))
                .thenReturn(Optional.of(rule));
        when(invoiceRepository.findById(invoiceId))
                .thenReturn(Optional.of(paidInvoice));

        Map<String, Object> result = reminderService.processPendingReminders();

        assertEquals(1, (int) result.get("processed_count"));
        // Rule should be set to cancelled and disabled
        assertEquals("cancelled", rule.getStatus());
        assertFalse(rule.getEnabled());
        verify(reminderRuleRepository).save(rule);

        // Crucial: emailService must NEVER be called for paid invoices
        verifyNoInteractions(emailService);
    }

    @Test
    void testDisabledRemindersInvoiceCancelsRuleAndNeverSends() {
        UUID invoiceId = UUID.randomUUID();
        UUID ruleId = UUID.randomUUID();

        ReminderRule rule = new ReminderRule();
        rule.setId(ruleId);
        rule.setInvoiceId(invoiceId);
        rule.setStatus("pending");
        rule.setEnabled(true);
        rule.setScheduledFor(Instant.now().minusSeconds(60));

        Invoice invoiceWithRemindersOff = new Invoice();
        invoiceWithRemindersOff.setId(invoiceId);
        invoiceWithRemindersOff.setInvoiceNumber("INV-2026-OFF");
        invoiceWithRemindersOff.setStatus("unpaid");
        invoiceWithRemindersOff.setRemindersEnabled(false); // Reminders turned off!

        when(reminderRuleRepository.recoverStuckProcessingRules(any(Instant.class), any(Instant.class)))
                .thenReturn(0);
        when(reminderRuleRepository.findByStatusAndEnabledTrueAndScheduledForLessThanEqualOrderByScheduledForAsc(eq("pending"), any(Instant.class)))
                .thenReturn(List.of(rule));
        when(reminderRuleRepository.claimRuleForProcessing(eq(ruleId), any(Instant.class)))
                .thenReturn(1);
        when(reminderRuleRepository.findById(ruleId))
                .thenReturn(Optional.of(rule));
        when(invoiceRepository.findById(invoiceId))
                .thenReturn(Optional.of(invoiceWithRemindersOff));

        Map<String, Object> result = reminderService.processPendingReminders();

        assertEquals(1, (int) result.get("processed_count"));
        assertEquals("cancelled", rule.getStatus());
        assertFalse(rule.getEnabled());
        verify(reminderRuleRepository).save(rule);
        verifyNoInteractions(emailService);
    }

    @Test
    void testAtomicClaimPreventionPreventsConcurrentExecution() {
        UUID ruleId = UUID.randomUUID();

        ReminderRule rule = new ReminderRule();
        rule.setId(ruleId);
        rule.setStatus("pending");
        rule.setEnabled(true);

        when(reminderRuleRepository.recoverStuckProcessingRules(any(Instant.class), any(Instant.class)))
                .thenReturn(0);
        when(reminderRuleRepository.findByStatusAndEnabledTrueAndScheduledForLessThanEqualOrderByScheduledForAsc(eq("pending"), any(Instant.class)))
                .thenReturn(List.of(rule));
        // Simulate another concurrent worker already claimed the row
        when(reminderRuleRepository.claimRuleForProcessing(eq(ruleId), any(Instant.class)))
                .thenReturn(0);

        Map<String, Object> result = reminderService.processPendingReminders();

        assertEquals(0, (int) result.get("processed_count"), "Unclaimed rule must not be processed");
        verify(reminderRuleRepository, never()).save(any());
        verifyNoInteractions(invoiceRepository);
        verifyNoInteractions(emailService);
    }

    @Test
    void testSchedulerMetricsReporting() {
        when(reminderRuleRepository.count()).thenReturn(5L);

        Map<String, Object> metrics = reminderService.getSchedulerMetrics();
        assertNotNull(metrics);
        assertTrue(metrics.containsKey("total_runs"));
        assertTrue(metrics.containsKey("total_accepted_sends"));
        assertTrue(metrics.containsKey("total_failed_sends"));
        assertTrue(metrics.containsKey("last_run"));
        assertTrue(metrics.containsKey("last_successful_processing"));
        assertTrue(metrics.containsKey("pending_occurrences"));
        assertEquals(5L, metrics.get("pending_occurrences"));
    }
}
