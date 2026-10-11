package com.dueflow.service;

import com.dueflow.domain.*;
import com.dueflow.exception.ResourceNotFoundException;
import com.dueflow.exception.ValidationException;
import com.dueflow.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ReminderManualTriggerTest {

    @Mock
    private ScheduledReminderRepository scheduledReminderRepository;

    @Mock
    private ReminderHistoryRepository reminderHistoryRepository;

    @Mock
    private NotificationRepository notificationRepository;

    @Mock
    private GmailSenderService gmailSenderService;

    @Mock
    private GmailOAuthService gmailOAuthService;

    @Mock
    private InvoiceRepository invoiceRepository;

    private ReminderSchedulerService schedulerService;

    private final String userId = "user-test-123";
    private Invoice testInvoice;

    @BeforeEach
    void setUp() {
        schedulerService = new ReminderSchedulerService(
                scheduledReminderRepository,
                reminderHistoryRepository,
                notificationRepository,
                gmailSenderService,
                gmailOAuthService,
                invoiceRepository,
                true
        );

        Client client = new Client(userId, "Acme Corp", "acme@example.com");
        testInvoice = new Invoice();
        testInvoice.setId("inv-1001");
        testInvoice.setUserId(userId);
        testInvoice.setInvoiceNumber("INV-1001");
        testInvoice.setStatus(InvoiceStatus.UNPAID);
        testInvoice.setDueDate(LocalDate.now().plusDays(5));
        testInvoice.setTotalAmount(new BigDecimal("5000.00"));
        testInvoice.setClient(client);
        testInvoice.setRemindersSentCount(0);
    }

    @Test
    void testSuccessfulManualTriggerForEligibleInvoice() {
        when(scheduledReminderRepository.findById("inv-1001")).thenReturn(Optional.empty());
        when(invoiceRepository.findById("inv-1001")).thenReturn(Optional.of(testInvoice));
        when(gmailOAuthService.getDecryptedRefreshToken(userId)).thenReturn("mock-valid-refresh-token");
        when(gmailSenderService.sendInvoiceReminder(eq(testInvoice), any(), any())).thenReturn("msg-id-12345");

        schedulerService.triggerReminderManually("inv-1001", userId);

        // Verify email was sent
        verify(gmailSenderService, times(1)).sendInvoiceReminder(eq(testInvoice), any(), any());

        // Verify reminder history recorded
        ArgumentCaptor<ReminderHistory> historyCaptor = ArgumentCaptor.forClass(ReminderHistory.class);
        verify(reminderHistoryRepository, times(1)).save(historyCaptor.capture());
        ReminderHistory savedHistory = historyCaptor.getValue();
        assertEquals(userId, savedHistory.getUserId());
        assertEquals("inv-1001", savedHistory.getInvoiceId());
        assertEquals("SENT", savedHistory.getStatus());
        assertEquals("msg-id-12345", savedHistory.getProviderMessageId());

        // Verify notification created
        verify(notificationRepository, times(1)).save(any(Notification.class));

        // Verify invoice reminder sent count incremented
        assertEquals(1, testInvoice.getRemindersSentCount());
        verify(invoiceRepository, times(1)).save(testInvoice);
    }

    @Test
    void testRejectPaidInvoice() {
        testInvoice.setStatus(InvoiceStatus.PAID);
        when(scheduledReminderRepository.findById("inv-1001")).thenReturn(Optional.empty());
        when(invoiceRepository.findById("inv-1001")).thenReturn(Optional.of(testInvoice));

        ValidationException ex = assertThrows(ValidationException.class,
                () -> schedulerService.triggerReminderManually("inv-1001", userId));
        assertTrue(ex.getMessage().contains("already paid"));
        verifyNoInteractions(gmailSenderService);
    }

    @Test
    void testRejectCancelledInvoice() {
        testInvoice.setStatus(InvoiceStatus.CANCELLED);
        when(scheduledReminderRepository.findById("inv-1001")).thenReturn(Optional.empty());
        when(invoiceRepository.findById("inv-1001")).thenReturn(Optional.of(testInvoice));

        ValidationException ex = assertThrows(ValidationException.class,
                () -> schedulerService.triggerReminderManually("inv-1001", userId));
        assertTrue(ex.getMessage().contains("cancelled"));
        verifyNoInteractions(gmailSenderService);
    }

    @Test
    void testRejectDisconnectedGmail() {
        when(scheduledReminderRepository.findById("inv-1001")).thenReturn(Optional.empty());
        when(invoiceRepository.findById("inv-1001")).thenReturn(Optional.of(testInvoice));
        when(gmailOAuthService.getDecryptedRefreshToken(userId)).thenReturn(null);

        ValidationException ex = assertThrows(ValidationException.class,
                () -> schedulerService.triggerReminderManually("inv-1001", userId));
        assertTrue(ex.getMessage().contains("Gmail is not connected"));
        verifyNoInteractions(gmailSenderService);
    }

    @Test
    void testRejectCrossTenantAccess() {
        // Invoice belongs to other user
        testInvoice.setUserId("other-user-999");
        when(scheduledReminderRepository.findById("inv-1001")).thenReturn(Optional.empty());
        when(invoiceRepository.findById("inv-1001")).thenReturn(Optional.of(testInvoice));

        assertThrows(ResourceNotFoundException.class,
                () -> schedulerService.triggerReminderManually("inv-1001", userId));
        verifyNoInteractions(gmailSenderService);
    }
}
