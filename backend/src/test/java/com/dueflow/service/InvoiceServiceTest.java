package com.dueflow.service;

import com.dueflow.domain.Client;
import com.dueflow.domain.Invoice;
import com.dueflow.domain.InvoiceItem;
import com.dueflow.domain.InvoiceStatus;
import com.dueflow.dto.InvoiceDto;
import com.dueflow.dto.InvoiceItemDto;
import com.dueflow.exception.ResourceNotFoundException;
import com.dueflow.exception.ValidationException;
import com.dueflow.repository.ClientRepository;
import com.dueflow.repository.InvoiceRepository;
import com.dueflow.repository.UserProfileRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
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
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
public class InvoiceServiceTest {

    private static final String USER_ID = "user-test-uuid-111";
    private static final String OTHER_USER_ID = "user-other-uuid-222";

    @Mock
    private InvoiceRepository invoiceRepository;

    @Mock
    private ClientRepository clientRepository;

    @Mock
    private UserProfileRepository userProfileRepository;

    @Mock
    private UserProfileService userProfileService;

    @Mock
    private ReminderScheduleCalculator reminderScheduleCalculator;

    private InvoiceService invoiceService;

    @BeforeEach
    void setUp() {
        invoiceService = new InvoiceService(
                invoiceRepository,
                clientRepository,
                userProfileRepository,
                userProfileService,
                reminderScheduleCalculator
        );
    }

    @Test
    @DisplayName("Create invoice with valid existing client persists invoice and recalculates totals")
    void testCreateInvoiceWithExistingClientSuccess() {
        Client client = new Client(USER_ID, "Stripe Inc", "billing@stripe.com");
        client.setId("client-uuid-1");
        when(clientRepository.findByIdAndUserId("client-uuid-1", USER_ID)).thenReturn(Optional.of(client));

        InvoiceDto dto = new InvoiceDto();
        dto.setClientId("client-uuid-1");
        dto.setAmount(new BigDecimal("5000.00"));
        dto.setCurrency("USD");
        dto.setDescription("Consulting Q3");

        InvoiceItemDto itemDto = new InvoiceItemDto();
        itemDto.setDescription("Sprint 1");
        itemDto.setQuantity(new BigDecimal("2"));
        itemDto.setUnitPrice(new BigDecimal("2500.00"));
        dto.setItems(List.of(itemDto));

        when(invoiceRepository.save(any(Invoice.class))).thenAnswer(invocation -> {
            Invoice inv = invocation.getArgument(0);
            inv.setId("inv-created-1");
            return inv;
        });

        InvoiceDto result = invoiceService.createInvoice(USER_ID, dto);

        assertNotNull(result);
        assertEquals("inv-created-1", result.getId());
        assertEquals("USD", result.getCurrency());
        assertEquals(new BigDecimal("5000.00"), result.getTotalAmount());
        verify(userProfileService).ensureProfileExists(USER_ID);
        verify(reminderScheduleCalculator).scheduleRemindersForInvoice(any(Invoice.class));
    }

    @Test
    @DisplayName("Create invoice with client name auto-provisions client when client ID is omitted")
    void testCreateInvoiceWithNewClientNameAutoCreatesClient() {
        when(clientRepository.findByUserId(USER_ID)).thenReturn(Collections.emptyList());

        Client savedNewClient = new Client(USER_ID, "New Ventures Corp", "contact@newventures.com");
        savedNewClient.setId("client-auto-1");
        when(clientRepository.save(any(Client.class))).thenReturn(savedNewClient);

        InvoiceDto dto = new InvoiceDto();
        dto.setClientName("New Ventures Corp");
        dto.setClientEmail("contact@newventures.com");
        dto.setAmount(new BigDecimal("15000.00"));

        when(invoiceRepository.save(any(Invoice.class))).thenAnswer(invocation -> {
            Invoice inv = invocation.getArgument(0);
            inv.setId("inv-auto-1");
            return inv;
        });

        InvoiceDto result = invoiceService.createInvoice(USER_ID, dto);

        assertNotNull(result);
        assertEquals("inv-auto-1", result.getId());
        assertEquals("New Ventures Corp", result.getClientName());
        verify(clientRepository).save(any(Client.class));
    }

    @Test
    @DisplayName("Create invoice fails with ValidationException when neither client ID nor client name is provided")
    void testCreateInvoiceWithoutClientThrowsValidationException() {
        InvoiceDto dto = new InvoiceDto();
        dto.setAmount(new BigDecimal("1000.00"));

        assertThrows(ValidationException.class, () -> invoiceService.createInvoice(USER_ID, dto));
        verify(invoiceRepository, never()).save(any());
    }

    @Test
    @DisplayName("Create invoice rejects foreign-owned client ID ensuring tenant isolation")
    void testCreateInvoiceWithForeignClientThrowsValidationException() {
        when(clientRepository.findByIdAndUserId("client-foreign-999", USER_ID)).thenReturn(Optional.empty());

        InvoiceDto dto = new InvoiceDto();
        dto.setClientId("client-foreign-999");
        dto.setAmount(new BigDecimal("1000.00"));

        assertThrows(ValidationException.class, () -> invoiceService.createInvoice(USER_ID, dto));
        verify(invoiceRepository, never()).save(any());
    }

    @Test
    @DisplayName("Create invoice auto-resolves duplicate auto-suggested invoice number without failing")
    void testCreateInvoiceDuplicateNumberAutoResolves() {
        Client client = new Client(USER_ID, "Acme", "a@a.com");
        client.setId("client-1");
        when(clientRepository.findByIdAndUserId("client-1", USER_ID)).thenReturn(Optional.of(client));

        when(invoiceRepository.existsByUserIdAndInvoiceNumber(USER_ID, "INV-2026-001")).thenReturn(true);
        when(invoiceRepository.countByUserId(USER_ID)).thenReturn(1L);
        when(invoiceRepository.existsByUserIdAndInvoiceNumber(USER_ID, "INV-2026-002")).thenReturn(false);

        InvoiceDto dto = new InvoiceDto();
        dto.setClientId("client-1");
        dto.setInvoiceNumber("INV-2026-001");
        dto.setAmount(new BigDecimal("300.00"));

        when(invoiceRepository.save(any(Invoice.class))).thenAnswer(invocation -> {
            Invoice inv = invocation.getArgument(0);
            inv.setId("inv-resolved");
            return inv;
        });

        InvoiceDto result = invoiceService.createInvoice(USER_ID, dto);
        assertNotNull(result);
        assertNotEquals("INV-2026-001", result.getInvoiceNumber());
        assertTrue(result.getInvoiceNumber().startsWith("INV-"));
    }

    @Test
    @DisplayName("Tenant isolation: User cannot access other user's invoice")
    void testTenantIsolationCannotAccessOtherUserInvoice() {
        when(invoiceRepository.findByIdAndUserId("inv-123", OTHER_USER_ID)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> invoiceService.getInvoice("inv-123", OTHER_USER_ID));
    }
}
