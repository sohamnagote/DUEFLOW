package com.dueflow.service;

import com.dueflow.domain.Client;
import com.dueflow.domain.Invoice;
import com.dueflow.domain.InvoiceStatus;
import com.dueflow.repository.ReminderRuleRepository;
import com.dueflow.repository.ScheduledReminderRepository;
import com.dueflow.repository.UserProfileRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.*;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ClientCommunicationPreferencesTest {

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
    void testFollowUpHoldPreventsReminderScheduling() {
        Invoice invoice = new Invoice();
        invoice.setId("inv-101");
        invoice.setUserId("user-1");
        invoice.setStatus(InvoiceStatus.UNPAID);
        invoice.setFollowUpStatus("PAUSED_FOR_REVIEW");

        calculator.scheduleRemindersForInvoice(invoice);

        // Should not query rules or schedule anything when follow-up hold is active
        verify(ruleRepository, never()).findByUserIdAndEnabledTrue(any());
        verify(scheduledReminderRepository, never()).save(any());
    }

    @Test
    void testClientDisabledRemindersPreventsScheduling() {
        Client client = new Client("user-1", "Acme Corp", "billing@acme.com");
        client.setAutomatedRemindersEnabled(false);

        Invoice invoice = new Invoice();
        invoice.setId("inv-102");
        invoice.setUserId("user-1");
        invoice.setStatus(InvoiceStatus.UNPAID);
        invoice.setClient(client);

        calculator.scheduleRemindersForInvoice(invoice);

        verify(ruleRepository, never()).findByUserIdAndEnabledTrue(any());
        verify(scheduledReminderRepository, never()).save(any());
    }

    @Test
    void testQuietHoursCrossingMidnightDefersToNextWindow() {
        Client client = new Client("user-1", "Acme Corp", "billing@acme.com");
        client.setCommunicationWindowStart("09:00");
        client.setCommunicationWindowEnd("18:00");
        client.setQuietHoursStart("21:00");
        client.setQuietHoursEnd("08:00");
        client.setAllowedDays("MONDAY,TUESDAY,WEDNESDAY,THURSDAY,FRIDAY");

        ZoneId zone = ZoneId.of("Asia/Kolkata");
        LocalDate wednesday = LocalDate.of(2026, 10, 21); // Wednesday
        LocalTime eveningTime = LocalTime.of(22, 30); // in quiet hours & after window

        ZonedDateTime result = calculator.adjustToAllowedWindowAndDays(wednesday, eveningTime, client, zone);

        // Should be deferred to Thursday at 09:00
        assertEquals(LocalDate.of(2026, 10, 22), result.toLocalDate());
        assertEquals(LocalTime.of(9, 0), result.toLocalTime());
    }

    @Test
    void testNonAllowedDaysRollsForwardToNextAllowedDay() {
        Client client = new Client("user-1", "Acme Corp", "billing@acme.com");
        client.setCommunicationWindowStart("10:00");
        client.setCommunicationWindowEnd("17:00");
        client.setAllowedDays("MONDAY,TUESDAY,WEDNESDAY,THURSDAY,FRIDAY"); // Weekdays only

        ZoneId zone = ZoneId.of("Asia/Kolkata");
        LocalDate saturday = LocalDate.of(2026, 10, 24); // Saturday
        LocalTime normalTime = LocalTime.of(11, 0);

        ZonedDateTime result = calculator.adjustToAllowedWindowAndDays(saturday, normalTime, client, zone);

        // Saturday should roll forward to Monday (2026-10-26)
        assertEquals(LocalDate.of(2026, 10, 26), result.toLocalDate());
        assertEquals(DayOfWeek.MONDAY, result.getDayOfWeek());
        assertEquals(LocalTime.of(10, 0), result.toLocalTime());
    }
}
