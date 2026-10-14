package com.dueflow.service;

import com.dueflow.domain.*;
import com.dueflow.dto.InvoiceCsvRowDto;
import com.dueflow.dto.InvoiceImportResultDto;
import com.dueflow.dto.PaymentSettingsDto;
import com.dueflow.dto.UserProfileDto;
import com.dueflow.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
public class NewFeaturesAndReliabilityTest {

    private static final String USER_ID = "user-123";
    private static final String OTHER_USER_ID = "user-456";

    // Mocks for DataExportService & InvoiceService & UserProfileService
    @Mock private InvoiceRepository invoiceRepository;
    @Mock private ClientRepository clientRepository;
    @Mock private PaymentSettingsRepository paymentSettingsRepository;
    @Mock private ReminderHistoryRepository reminderHistoryRepository;
    @Mock private UserProfileRepository userProfileRepository;
    @Mock private UserProfileService userProfileService;
    @Mock private ScheduledReminderRepository scheduledReminderRepository;
    @Mock private ReminderScheduleCalculator reminderScheduleCalculator;
    @Mock private GmailIntegrationRepository gmailIntegrationRepository;

    private DataExportService dataExportService;
    private InvoiceService invoiceService;
    private UserProfileService realUserProfileService;

    @BeforeEach
    void setUp() {
        dataExportService = new DataExportService(
                invoiceRepository,
                clientRepository,
                paymentSettingsRepository,
                reminderHistoryRepository
        );

        invoiceService = new InvoiceService(
                invoiceRepository,
                clientRepository,
                userProfileRepository,
                userProfileService,
                reminderScheduleCalculator
        );

        realUserProfileService = new UserProfileService(
                userProfileRepository,
                paymentSettingsRepository,
                gmailIntegrationRepository,
                scheduledReminderRepository,
                invoiceRepository,
                reminderScheduleCalculator
        );
    }

    // ==========================================
    // 1. Data Export Tests & CSV Formula Injection
    // ==========================================
    @Test
    @DisplayName("Data Export: exportInvoicesCsv properly escapes formulas and quotes")
    void testDataExportInvoiceEscapesFormulas() {
        Client client = new Client(USER_ID, "=CMD('calc')", "safe@example.com");
        Invoice invoice = new Invoice();
        invoice.setUserId(USER_ID);
        invoice.setClient(client);
        invoice.setInvoiceNumber("INV-FORMULA");
        invoice.setTotalAmount(new BigDecimal("500.00"));
        invoice.setCurrency("USD");
        invoice.setIssueDate(LocalDate.now());
        invoice.setDueDate(LocalDate.now().plusDays(14));
        invoice.setStatus(InvoiceStatus.UNPAID);
        invoice.setDescription("@SUM(1,2)");

        when(invoiceRepository.findByUserIdOrderByCreatedAtDesc(USER_ID)).thenReturn(List.of(invoice));

        byte[] csvBytes = dataExportService.exportInvoicesCsv(USER_ID);
        String csv = new String(csvBytes, StandardCharsets.UTF_8);

        // Verify UTF-8 BOM
        assertTrue(csv.startsWith("\uFEFF"));
        // Verify formula injection sanitization: '=CMD' becomes ''=CMD'
        assertTrue(csv.contains("''=CMD('calc')") || csv.contains("'=CMD"));
        assertTrue(csv.contains("''@SUM(1,2)") || csv.contains("'@SUM"));
        assertTrue(csv.contains("INV-FORMULA"));
    }

    @Test
    @DisplayName("Data Export: User isolation is strictly enforced")
    void testDataExportUserIsolation() {
        dataExportService.exportInvoicesCsv(USER_ID);
        // Verify repo queried ONLY for USER_ID, not other users
        verify(invoiceRepository).findByUserIdOrderByCreatedAtDesc(USER_ID);
        verify(invoiceRepository, never()).findByUserIdOrderByCreatedAtDesc(OTHER_USER_ID);
    }

    // ==========================================
    // 2. CSV Invoice Import Tests
    // ==========================================
    @Test
    @DisplayName("CSV Import: Successfully imports valid rows, resolves client, and schedules reminders for unpaid invoices")
    void testCsvImportValidRow() {
        InvoiceCsvRowDto row = new InvoiceCsvRowDto();
        row.setInvoiceNumber("INV-CSV-001");
        row.setClientName("Acme Corp");
        row.setClientEmail("billing@acme.com");
        row.setAmount(new BigDecimal("1200.50"));
        row.setCurrency("USD");
        row.setIssueDate("2026-10-01");
        row.setDueDate("2026-10-20");
        row.setStatus("UNPAID");
        row.setDescription("Web Design Services");

        when(invoiceRepository.findByUserIdAndInvoiceNumber(USER_ID, "INV-CSV-001")).thenReturn(Optional.empty());
        when(clientRepository.findByUserIdAndNameIgnoreCase(USER_ID, "Acme Corp")).thenReturn(Optional.empty());
        when(clientRepository.findByUserIdAndEmailIgnoreCase(USER_ID, "billing@acme.com")).thenReturn(Optional.empty());

        Client savedClient = new Client(USER_ID, "Acme Corp", "billing@acme.com");
        when(clientRepository.save(any(Client.class))).thenReturn(savedClient);

        when(invoiceRepository.save(any(Invoice.class))).thenAnswer(invocation -> invocation.getArgument(0));

        InvoiceImportResultDto result = invoiceService.importInvoices(USER_ID, List.of(row));

        assertEquals(1, result.getImportedCount());
        assertEquals(0, result.getFailedCount());
        assertEquals(1, result.getImportedInvoices().size());

        // Verify reminders scheduled for unpaid invoice
        verify(reminderScheduleCalculator).scheduleRemindersForInvoice(any(Invoice.class));
    }

    @Test
    @DisplayName("CSV Import: Does not schedule reminders for PAID invoices")
    void testCsvImportPaidInvoiceNoReminders() {
        InvoiceCsvRowDto row = new InvoiceCsvRowDto();
        row.setInvoiceNumber("INV-CSV-PAID");
        row.setClientName("Beta LLC");
        row.setClientEmail("pay@beta.com");
        row.setAmount(new BigDecimal("300.00"));
        row.setCurrency("USD");
        row.setStatus("PAID");

        when(invoiceRepository.findByUserIdAndInvoiceNumber(USER_ID, "INV-CSV-PAID")).thenReturn(Optional.empty());
        when(clientRepository.findByUserIdAndNameIgnoreCase(USER_ID, "Beta LLC")).thenReturn(Optional.of(new Client(USER_ID, "Beta LLC", "pay@beta.com")));
        when(invoiceRepository.save(any(Invoice.class))).thenAnswer(invocation -> invocation.getArgument(0));

        InvoiceImportResultDto result = invoiceService.importInvoices(USER_ID, List.of(row));

        assertEquals(1, result.getImportedCount());
        // Verify reminder schedule calculator was NOT called for paid invoice
        verify(reminderScheduleCalculator, never()).scheduleRemindersForInvoice(any());
    }

    @Test
    @DisplayName("CSV Import: Rejects rows with missing client name or invalid amount")
    void testCsvImportValidationFailures() {
        InvoiceCsvRowDto row1 = new InvoiceCsvRowDto();
        row1.setClientName(""); // Missing client name
        row1.setAmount(new BigDecimal("100"));

        InvoiceCsvRowDto row2 = new InvoiceCsvRowDto();
        row2.setClientName("Valid Client");
        row2.setAmount(new BigDecimal("-50")); // Negative amount

        InvoiceImportResultDto result = invoiceService.importInvoices(USER_ID, List.of(row1, row2));

        assertEquals(0, result.getImportedCount());
        assertEquals(2, result.getFailedCount());
        assertEquals(2, result.getErrors().size());
    }

    // ==========================================
    // 3. User Preferences & Branding Tests
    // ==========================================
    @Test
    @DisplayName("Reminder Preference: Defaults to TRUE on newly created profile")
    void testReminderPreferenceDefaultTrue() {
        UserProfile newProfile = new UserProfile(USER_ID, "newuser@example.com");
        assertTrue(newProfile.isAutomatedRemindersEnabled(), "New profile must default automatedRemindersEnabled to true");
    }

    @Test
    @DisplayName("Payment Settings: Persists custom branding and footer terms")
    void testCustomBrandingPersistence() {
        PaymentSettings existing = new PaymentSettings(USER_ID);
        when(paymentSettingsRepository.findByUserId(USER_ID)).thenReturn(Optional.of(existing));
        when(paymentSettingsRepository.save(any(PaymentSettings.class))).thenAnswer(invocation -> invocation.getArgument(0));

        PaymentSettingsDto updateDto = new PaymentSettingsDto();
        updateDto.setBusinessName("Studio Design Co");
        updateDto.setBrandColor("#6366f1");
        updateDto.setBusinessAddress("100 Tech Way, Suite 4B");
        updateDto.setBusinessPhone("+1 (555) 234-5678");
        updateDto.setFooterTerms("Payment is due within 15 days of invoice date.");

        PaymentSettings updated = realUserProfileService.updatePaymentSettings(USER_ID, updateDto);

        assertNotNull(updated);
        assertEquals("Studio Design Co", updated.getBusinessName());
        assertEquals("#6366f1", updated.getBrandColor());
        assertEquals("100 Tech Way, Suite 4B", updated.getBusinessAddress());
        assertEquals("+1 (555) 234-5678", updated.getBusinessPhone());
        assertEquals("Payment is due within 15 days of invoice date.", updated.getFooterTerms());
    }

    @Test
    @DisplayName("Reminder Toggle: Disabling reminders pauses pending scheduled reminders")
    void testDisablingRemindersCancelsPending() {
        UserProfile profile = new UserProfile(USER_ID, "user@example.com");
        profile.setAutomatedRemindersEnabled(true);
        when(userProfileRepository.findById(USER_ID)).thenReturn(Optional.of(profile));
        when(userProfileRepository.save(any(UserProfile.class))).thenAnswer(invocation -> invocation.getArgument(0));

        UserProfileDto updateDto = new UserProfileDto();
        updateDto.setAutomatedRemindersEnabled(false);

        realUserProfileService.updateProfile(USER_ID, updateDto);

        // Verify scheduled reminders cancelled for this user
        verify(scheduledReminderRepository).cancelPendingForUser(USER_ID);
    }
}
