package com.dueflow.service;

import com.dueflow.domain.Client;
import com.dueflow.domain.Invoice;
import com.dueflow.domain.InvoiceStatus;
import com.dueflow.domain.UserProfile;
import com.dueflow.dto.ClientDto;
import com.dueflow.exception.ResourceNotFoundException;
import com.dueflow.exception.ValidationException;
import com.dueflow.repository.ClientRepository;
import com.dueflow.repository.InvoiceRepository;
import com.dueflow.repository.UserProfileRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.math.BigDecimal;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
public class ClientServiceTest {

    private static final String USER_ID = "user-test-uuid-123";
    private static final String OTHER_USER_ID = "user-other-uuid-456";

    @Mock
    private ClientRepository clientRepository;

    @Mock
    private InvoiceRepository invoiceRepository;

    @Mock
    private UserProfileRepository userProfileRepository;

    @Mock
    private UserProfileService userProfileService;

    private ClientService clientService;

    @BeforeEach
    void setUp() {
        clientService = new ClientService(clientRepository, invoiceRepository, userProfileRepository, userProfileService);
    }

    @Test
    @DisplayName("Create client auto-provisions user profile if not yet present in database")
    void testCreateClientAutoProvisionsUserProfile() {
        // Given user profile does not exist
        when(userProfileRepository.existsById(USER_ID)).thenReturn(false);

        Client savedClient = new Client(USER_ID, "Acme Studio", "billing@acme.com");
        savedClient.setId("client-uuid-1");
        when(clientRepository.save(any(Client.class))).thenReturn(savedClient);
        when(invoiceRepository.findByUserIdAndClientId(USER_ID, "client-uuid-1")).thenReturn(Collections.emptyList());

        ClientDto input = new ClientDto();
        input.setName("Acme Studio");
        input.setEmail("billing@acme.com");

        // When
        ClientDto result = clientService.createClient(USER_ID, input);

        // Then: user profile must be ensured to avoid PostgreSQL FK constraint failure
        verify(userProfileService, times(1)).ensureProfileExists(USER_ID);
        assertNotNull(result);
        assertEquals("client-uuid-1", result.getId());
        assertEquals("Acme Studio", result.getName());
        assertEquals("billing@acme.com", result.getEmail());
        assertEquals(0, result.getInvoicesCount());
        assertEquals(BigDecimal.ZERO, result.getTotalInvoiced());
    }

    @Test
    @DisplayName("Create client validates name and email requirement")
    void testCreateClientValidationFailures() {
        ClientDto noName = new ClientDto();
        noName.setEmail("valid@example.com");

        assertThrows(ValidationException.class, () -> clientService.createClient(USER_ID, noName));

        ClientDto noEmail = new ClientDto();
        noEmail.setName("Valid Name");

        assertThrows(ValidationException.class, () -> clientService.createClient(USER_ID, noEmail));
    }

    @Test
    @DisplayName("Create client enriches stats and persists all optional fields")
    void testCreateClientWithOptionalFields() {
        when(userProfileRepository.existsById(USER_ID)).thenReturn(true);

        Client savedClient = new Client(USER_ID, "Globex", "info@globex.com");
        savedClient.setId("client-uuid-2");
        savedClient.setPhone("+1 555 123 4567");
        savedClient.setBillingAddress("100 Market St");
        savedClient.setInternalNotes("Net 30");

        when(clientRepository.save(any(Client.class))).thenReturn(savedClient);
        when(invoiceRepository.findByUserIdAndClientId(USER_ID, "client-uuid-2")).thenReturn(Collections.emptyList());

        ClientDto input = new ClientDto();
        input.setName("Globex");
        input.setEmail("info@globex.com");
        input.setPhone("+1 555 123 4567");
        input.setBillingAddress("100 Market St");
        input.setInternalNotes("Net 30");

        ClientDto result = clientService.createClient(USER_ID, input);

        assertNotNull(result);
        assertEquals("+1 555 123 4567", result.getPhone());
        assertEquals("100 Market St", result.getBillingAddress());
        assertEquals("Net 30", result.getInternalNotes());
    }

    @Test
    @DisplayName("Enrich client stats calculates total invoiced and outstanding amounts")
    void testClientStatsEnrichment() {
        Client client = new Client(USER_ID, "Stark Industries", "tony@stark.com");
        client.setId("stark-1");

        when(clientRepository.findByIdAndUserId("stark-1", USER_ID)).thenReturn(Optional.of(client));

        Invoice unpaidInv = new Invoice();
        unpaidInv.setTotalAmount(new BigDecimal("1500.00"));
        unpaidInv.setStatus(InvoiceStatus.UNPAID);

        Invoice paidInv = new Invoice();
        paidInv.setTotalAmount(new BigDecimal("500.00"));
        paidInv.setStatus(InvoiceStatus.PAID);

        when(invoiceRepository.findByUserIdAndClientId(USER_ID, "stark-1"))
                .thenReturn(List.of(unpaidInv, paidInv));

        ClientDto retrieved = clientService.getClient("stark-1", USER_ID);

        assertEquals(2, retrieved.getInvoicesCount());
        assertEquals(new BigDecimal("2000.00"), retrieved.getTotalInvoiced());
        assertEquals(new BigDecimal("1500.00"), retrieved.getTotalOutstanding());
    }

    @Test
    @DisplayName("Cross-user isolation: User B cannot retrieve User A client")
    void testCrossUserAccessRejection() {
        when(clientRepository.findByIdAndUserId("client-a", OTHER_USER_ID)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> clientService.getClient("client-a", OTHER_USER_ID));
    }

    @Test
    @DisplayName("Delete client prevents deletion if active invoices exist")
    void testDeleteClientWithActiveInvoicesBlocked() {
        Client client = new Client(USER_ID, "Client With Invoices", "inv@client.com");
        client.setId("client-inv");

        when(clientRepository.findByIdAndUserId("client-inv", USER_ID)).thenReturn(Optional.of(client));
        when(invoiceRepository.existsByClientId("client-inv")).thenReturn(true);

        ValidationException ex = assertThrows(ValidationException.class,
                () -> clientService.deleteClient("client-inv", USER_ID));
        assertTrue(ex.getMessage().contains("Cannot delete client with active invoices"));
        verify(clientRepository, never()).delete(any());
    }
}
