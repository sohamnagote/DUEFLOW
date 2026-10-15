package com.dueflow.service;

import com.dueflow.domain.Client;
import com.dueflow.domain.ClientResponse;
import com.dueflow.domain.Invoice;
import com.dueflow.domain.InvoiceStatus;
import com.dueflow.dto.ClientResponseDto;
import com.dueflow.dto.PublicClientResponseSubmitDto;
import com.dueflow.dto.PublicInvoiceViewDto;
import com.dueflow.exception.ValidationException;
import com.dueflow.repository.ClientResponseRepository;
import com.dueflow.repository.InvoiceRepository;
import com.dueflow.repository.ScheduledReminderRepository;
import com.dueflow.repository.UserProfileRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ClientResponseServiceTest {

    @Mock
    private ClientResponseRepository clientResponseRepository;

    @Mock
    private InvoiceRepository invoiceRepository;

    @Mock
    private ScheduledReminderRepository scheduledReminderRepository;

    @Mock
    private NotificationService notificationService;

    @Mock
    private UserProfileRepository userProfileRepository;

    private ClientResponseService service;

    @BeforeEach
    void setUp() {
        service = new ClientResponseService(
                clientResponseRepository,
                invoiceRepository,
                scheduledReminderRepository,
                notificationService,
                userProfileRepository
        );
    }

    @Test
    void testGetPublicInvoiceDoesNotExposeSensitiveData() {
        Client client = new Client("user-1", "Mega Corp", "ap@megacorp.com");
        Invoice invoice = new Invoice();
        invoice.setId("inv-999");
        invoice.setUserId("user-1");
        invoice.setInvoiceNumber("INV-2026-001");
        invoice.setTotalAmount(new BigDecimal("1500.00"));
        invoice.setCurrency("USD");
        invoice.setDueDate(LocalDate.of(2026, 11, 15));
        invoice.setClient(client);
        invoice.setStatus(InvoiceStatus.UNPAID);
        invoice.setResponseToken("token-secret-xyz");
        invoice.setResponseTokenExpiry(Instant.now().plusSeconds(86400));
        invoice.setNotes("SECRET INTERNAL NOTE DO NOT SHARE");

        when(invoiceRepository.findByResponseToken("token-secret-xyz")).thenReturn(Optional.of(invoice));

        PublicInvoiceViewDto result = service.getPublicInvoice("token-secret-xyz");

        assertNotNull(result);
        assertEquals("INV-2026-001", result.getInvoiceNumber());
        assertEquals("Mega Corp", result.getClientName());
        assertEquals(new BigDecimal("1500.00"), result.getTotalAmount());
        // Verify public DTO does not leak notes
        assertFalse(result.toString().contains("SECRET INTERNAL NOTE"));
    }

    @Test
    void testExpiredResponseTokenIsRejected() {
        Invoice invoice = new Invoice();
        invoice.setResponseToken("expired-token");
        invoice.setResponseTokenExpiry(Instant.now().minusSeconds(3600));

        when(invoiceRepository.findByResponseToken("expired-token")).thenReturn(Optional.of(invoice));

        assertThrows(ValidationException.class, () -> service.getPublicInvoice("expired-token"));
    }

    @Test
    void testPaymentReportedDoesNotMarkInvoicePaid() {
        Client client = new Client("user-1", "Acme", "billing@acme.com");
        Invoice invoice = new Invoice();
        invoice.setId("inv-100");
        invoice.setUserId("user-1");
        invoice.setInvoiceNumber("INV-100");
        invoice.setClient(client);
        invoice.setStatus(InvoiceStatus.UNPAID);
        invoice.setFollowUpStatus("ACTIVE");
        invoice.setResponseToken("valid-token");
        invoice.setResponseTokenExpiry(Instant.now().plusSeconds(86400));

        when(invoiceRepository.findByResponseToken("valid-token")).thenReturn(Optional.of(invoice));
        when(clientResponseRepository.save(any(ClientResponse.class))).thenAnswer(i -> i.getArgument(0));

        PublicClientResponseSubmitDto submitDto = new PublicClientResponseSubmitDto();
        submitDto.setResponseType("PAYMENT_REPORTED");
        submitDto.setResponseText("Wire transfer sent reference #TX123456");

        ClientResponseDto response = service.submitClientResponse("valid-token", submitDto);

        assertNotNull(response);
        assertEquals("PAYMENT_REPORTED", response.getResponseType());

        // CRITICAL INVARIANT: Invoice status must STILL be UNPAID!
        assertEquals(InvoiceStatus.UNPAID, invoice.getStatus());

        // Follow-up status should be paused for review
        assertEquals("PAUSED_FOR_REVIEW", invoice.getFollowUpStatus());

        // Verify reminder pause called
        verify(scheduledReminderRepository, times(1)).cancelPendingForInvoice("inv-100");

        // Verify freelancer notified
        verify(notificationService, times(1)).createNotification(
                eq("user-1"), anyString(), anyString(), eq("CLIENT_RESPONSE"), eq("inv-100")
        );
    }
}
