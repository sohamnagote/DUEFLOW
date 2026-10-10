package com.dueflow.service;

import com.dueflow.domain.*;
import com.dueflow.repository.ReminderRuleRepository;
import com.dueflow.repository.ScheduledReminderRepository;
import com.dueflow.repository.UserProfileRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ReminderScheduleCalculatorTest {

    @Mock
    private ReminderRuleRepository ruleRepository;

    @Mock
    private ScheduledReminderRepository scheduledReminderRepository;

    @Mock
    private UserProfileRepository userProfileRepository;

    private ReminderScheduleCalculator calculator;

    @BeforeEach
    void setUp() {
        calculator = new ReminderScheduleCalculator(ruleRepository, scheduledReminderRepository, userProfileRepository);
    }

    @Test
    void testScheduleDefaultRemindersWhenNoCustomRules() {
        String userId = "user-abc";
        UserProfile profile = new UserProfile(userId, "test@example.com");
        profile.setAutomatedRemindersEnabled(true);
        profile.setTimezone("Asia/Kolkata");

        when(userProfileRepository.findById(userId)).thenReturn(Optional.of(profile));
        when(ruleRepository.findByUserIdAndEnabledTrue(userId)).thenReturn(Collections.emptyList());
        when(scheduledReminderRepository.existsByIdempotencyKey(any())).thenReturn(false);

        Invoice invoice = new Invoice();
        invoice.setId("inv-123");
        invoice.setUserId(userId);
        invoice.setInvoiceNumber("INV-2026-001");
        invoice.setDueDate(LocalDate.now().plusDays(10));
        invoice.setStatus(InvoiceStatus.UNPAID);
        invoice.setTotalAmount(new BigDecimal("10000.00"));

        calculator.scheduleRemindersForInvoice(invoice);

        // Should save default occurrences
        verify(scheduledReminderRepository, atLeastOnce()).save(any(ScheduledReminder.class));
    }

    @Test
    void testDoesNotScheduleWhenAutomatedRemindersDisabled() {
        String userId = "user-xyz";
        UserProfile profile = new UserProfile(userId, "disabled@example.com");
        profile.setAutomatedRemindersEnabled(false);

        when(userProfileRepository.findById(userId)).thenReturn(Optional.of(profile));

        Invoice invoice = new Invoice();
        invoice.setId("inv-456");
        invoice.setUserId(userId);
        invoice.setStatus(InvoiceStatus.UNPAID);

        calculator.scheduleRemindersForInvoice(invoice);

        verify(scheduledReminderRepository, never()).save(any(ScheduledReminder.class));
    }

    @Test
    void testCancelsRemindersWhenPaid() {
        String invoiceId = "inv-paid-1";
        Invoice invoice = new Invoice();
        invoice.setId(invoiceId);
        invoice.setStatus(InvoiceStatus.PAID);

        calculator.scheduleRemindersForInvoice(invoice);

        verify(scheduledReminderRepository).cancelPendingForInvoice(invoiceId);
    }
}
