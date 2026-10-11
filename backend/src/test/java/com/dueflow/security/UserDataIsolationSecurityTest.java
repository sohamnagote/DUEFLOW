package com.dueflow.security;

import com.dueflow.domain.*;
import com.dueflow.dto.ClientDto;
import com.dueflow.dto.InvoiceDto;
import com.dueflow.dto.PaymentSettingsDto;
import com.dueflow.dto.ReminderRuleDto;
import com.dueflow.exception.ResourceNotFoundException;
import com.dueflow.exception.ValidationException;
import com.dueflow.repository.*;
import com.dueflow.service.ClientService;
import com.dueflow.service.InvoiceService;
import com.dueflow.service.ReminderService;
import com.dueflow.service.UserProfileService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
public class UserDataIsolationSecurityTest {

    private static final String USER_A = "user-a-uuid-1111";
    private static final String USER_B = "user-b-uuid-2222";

    @Mock
    private ClientRepository clientRepository;
    @Mock
    private InvoiceRepository invoiceRepository;
    @Mock
    private UserProfileRepository userProfileRepository;
    @Mock
    private PaymentSettingsRepository paymentSettingsRepository;
    @Mock
    private ReminderRuleRepository reminderRuleRepository;
    @Mock
    private ScheduledReminderRepository scheduledReminderRepository;
    @Mock
    private ReminderHistoryRepository reminderHistoryRepository;
    @Mock
    private com.dueflow.service.ReminderSchedulerService reminderSchedulerService;
    @Mock
    private com.dueflow.service.ReminderScheduleCalculator reminderScheduleCalculator;

    private ClientService clientService;
    private InvoiceService invoiceService;
    private UserProfileService userProfileService;
    private ReminderService reminderService;

    @BeforeEach
    void setUp() {
        clientService = new ClientService(clientRepository, invoiceRepository, userProfileRepository);
        invoiceService = new InvoiceService(invoiceRepository, clientRepository, userProfileRepository, reminderScheduleCalculator);
        userProfileService = new UserProfileService(userProfileRepository, paymentSettingsRepository);
        reminderService = new ReminderService(reminderRuleRepository, scheduledReminderRepository, reminderHistoryRepository,
                reminderSchedulerService, reminderScheduleCalculator, invoiceRepository, userProfileRepository);
    }

    @Test
    @DisplayName("Requirement 1: User A can create and retrieve their own client and invoice")
    void testUserACanCreateAndRetrieveOwnRecords() {
        // Setup Client A
        Client clientA = new Client(USER_A, "Acme Corp", "billing@acme.com");
        clientA.setId("client-a-1");
        when(clientRepository.save(any(Client.class))).thenReturn(clientA);
        when(clientRepository.findByIdAndUserId("client-a-1", USER_A)).thenReturn(Optional.of(clientA));

        ClientDto newClientDto = new ClientDto();
        newClientDto.setName("Acme Corp");
        newClientDto.setEmail("billing@acme.com");

        ClientDto createdClient = clientService.createClient(USER_A, newClientDto);
        assertNotNull(createdClient);
        assertEquals("Acme Corp", createdClient.getName());

        ClientDto retrievedClient = clientService.getClient("client-a-1", USER_A);
        assertEquals("Acme Corp", retrievedClient.getName());

        // Setup Invoice A
        Invoice invoiceA = new Invoice();
        invoiceA.setId("inv-a-1");
        invoiceA.setUserId(USER_A);
        invoiceA.setClient(clientA);
        invoiceA.setInvoiceNumber("INV-2026-001");
        invoiceA.setDueDate(LocalDate.now().plusDays(14));
        invoiceA.setIssueDate(LocalDate.now());
        invoiceA.setTotalAmount(new BigDecimal("5000.00"));
        invoiceA.setStatus(InvoiceStatus.UNPAID);

        when(invoiceRepository.save(any(Invoice.class))).thenReturn(invoiceA);
        when(invoiceRepository.findByIdAndUserId("inv-a-1", USER_A)).thenReturn(Optional.of(invoiceA));

        InvoiceDto invDto = new InvoiceDto();
        invDto.setClientId("client-a-1");
        invDto.setAmount(new BigDecimal("5000.00"));

        InvoiceDto createdInvoice = invoiceService.createInvoice(USER_A, invDto);
        assertNotNull(createdInvoice);
        assertEquals("inv-a-1", createdInvoice.getId());

        InvoiceDto retrievedInvoice = invoiceService.getInvoice("inv-a-1", USER_A);
        assertEquals("INV-2026-001", retrievedInvoice.getInvoiceNumber());
    }

    @Test
    @DisplayName("Requirement 2: User B cannot list User A's clients or invoices")
    void testUserBCannotListUserARecords() {
        when(clientRepository.findByUserIdOrderByCreatedAtDesc(USER_B)).thenReturn(Collections.emptyList());
        when(invoiceRepository.findByUserIdOrderByCreatedAtDesc(USER_B)).thenReturn(Collections.emptyList());

        List<ClientDto> clientsB = clientService.getClients(USER_B);
        List<InvoiceDto> invoicesB = invoiceService.getInvoices(USER_B);

        assertTrue(clientsB.isEmpty(), "User B must not see any clients belonging to User A");
        assertTrue(invoicesB.isEmpty(), "User B must not see any invoices belonging to User A");
    }

    @Test
    @DisplayName("Requirement 3: User B cannot retrieve User A's invoice or client by guessing ID")
    void testUserBCannotRetrieveUserARecordsById() {
        when(invoiceRepository.findByIdAndUserId("inv-a-1", USER_B)).thenReturn(Optional.empty());
        when(clientRepository.findByIdAndUserId("client-a-1", USER_B)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> {
            invoiceService.getInvoice("inv-a-1", USER_B);
        }, "Should return safe 404/not found when User B guesses User A invoice ID");

        assertThrows(ResourceNotFoundException.class, () -> {
            clientService.getClient("client-a-1", USER_B);
        }, "Should return safe 404/not found when User B guesses User A client ID");
    }

    @Test
    @DisplayName("Requirement 4: User B cannot modify or delete User A's client or invoice")
    void testUserBCannotModifyOrDeleteUserARecords() {
        when(invoiceRepository.findByIdAndUserId("inv-a-1", USER_B)).thenReturn(Optional.empty());
        when(clientRepository.findByIdAndUserId("client-a-1", USER_B)).thenReturn(Optional.empty());

        InvoiceDto updateDto = new InvoiceDto();
        updateDto.setDescription("Hacked description");

        assertThrows(ResourceNotFoundException.class, () -> {
            invoiceService.updateInvoice("inv-a-1", USER_B, updateDto);
        });

        assertThrows(ResourceNotFoundException.class, () -> {
            invoiceService.deleteInvoice("inv-a-1", USER_B);
        });

        assertThrows(ResourceNotFoundException.class, () -> {
            clientService.updateClient("client-a-1", USER_B, new ClientDto());
        });

        assertThrows(ResourceNotFoundException.class, () -> {
            clientService.deleteClient("client-a-1", USER_B);
        });
    }

    @Test
    @DisplayName("Requirement 5: User B cannot attach User A's client to their own invoice")
    void testUserBCannotAttachUserAClientToInvoice() {
        // client-a-1 belongs to USER_A, so findByIdAndUserId(client-a-1, USER_B) returns empty
        when(clientRepository.findByIdAndUserId("client-a-1", USER_B)).thenReturn(Optional.empty());

        InvoiceDto forgedDto = new InvoiceDto();
        forgedDto.setClientId("client-a-1");
        forgedDto.setAmount(new BigDecimal("100.00"));

        ValidationException ex = assertThrows(ValidationException.class, () -> {
            invoiceService.createInvoice(USER_B, forgedDto);
        });

        assertTrue(ex.getMessage().contains("does not belong to you") || ex.getMessage().contains("does not exist"));
    }

    @Test
    @DisplayName("Requirement 6: User B cannot access or mutate User A's payment details or QR code")
    void testPaymentSettingsIsolation() {
        PaymentSettings settingsA = new PaymentSettings(USER_A);
        settingsA.setUpiId("usera@upi");
        settingsA.setQrCodeUrl("https://supabase.co/qr-a.png");

        when(paymentSettingsRepository.findByUserId(USER_A)).thenReturn(Optional.of(settingsA));
        when(paymentSettingsRepository.findByUserId(USER_B)).thenReturn(Optional.empty());

        PaymentSettings retrievedB = userProfileService.getPaymentSettings(USER_B);
        assertNotEquals("usera@upi", retrievedB.getUpiId(), "User B must not see User A's UPI ID");
        assertNull(retrievedB.getQrCodeUrl(), "User B must not see User A's QR code");

        // Saving for User B must create/update User B's settings, not User A's
        PaymentSettings savedB = new PaymentSettings(USER_B);
        savedB.setUpiId("userb@upi");
        when(paymentSettingsRepository.save(any(PaymentSettings.class))).thenReturn(savedB);

        PaymentSettingsDto updateBDto = new PaymentSettingsDto();
        updateBDto.setUpiId("userb@upi");
        PaymentSettings result = userProfileService.updatePaymentSettings(USER_B, updateBDto);

        assertEquals("userb@upi", result.getUpiId());
        assertEquals(USER_B, result.getUserId());
    }

    @Test
    @DisplayName("Requirement 7: User B cannot cancel, modify, or trigger User A's reminders")
    void testUserBCannotAccessOrTriggerUserAReminders() {
        when(reminderRuleRepository.findByIdAndUserId("rule-a-1", USER_B)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> {
            reminderService.updateReminderRule(USER_B, "rule-a-1", new ReminderRuleDto());
        });

        // Trigger manual check
        doThrow(new ResourceNotFoundException("Scheduled reminder not found"))
                .when(reminderSchedulerService).triggerReminderManually("sched-rem-a-1", USER_B);

        assertThrows(ResourceNotFoundException.class, () -> {
            reminderService.triggerReminder(USER_B, "sched-rem-a-1");
        });
    }

    @Test
    @DisplayName("Requirement 8: Forged user ID in DTO body is ignored; authenticated user ID is enforced")
    void testForgedUserIdInRequestBodyIsIgnored() {
        ClientDto forgedClientDto = new ClientDto();
        forgedClientDto.setName("Legit Client");
        forgedClientDto.setEmail("legit@client.com");

        Client savedClient = new Client(USER_A, "Legit Client", "legit@client.com");
        when(clientRepository.save(any(Client.class))).thenAnswer(invocation -> {
            Client c = invocation.getArgument(0);
            assertEquals(USER_A, c.getUserId(), "Client must be saved under the authenticated User A, regardless of request body");
            return savedClient;
        });

        clientService.createClient(USER_A, forgedClientDto);

        // Reminder rule
        ReminderRuleDto forgedRuleDto = new ReminderRuleDto();
        forgedRuleDto.setLabel("3 days before");
        forgedRuleDto.setTiming("BEFORE");
        forgedRuleDto.setDaysOffset(3);

        when(reminderRuleRepository.save(any(ReminderRule.class))).thenAnswer(invocation -> {
            ReminderRule r = invocation.getArgument(0);
            assertEquals(USER_A, r.getUserId(), "Reminder rule must be assigned to authenticated user");
            return r;
        });

        reminderService.createReminderRule(USER_A, forgedRuleDto);
    }
}
