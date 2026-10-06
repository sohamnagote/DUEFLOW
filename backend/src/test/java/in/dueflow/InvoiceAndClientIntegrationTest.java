package in.dueflow;

import in.dueflow.dto.ClientDtos.CreateClientRequest;
import in.dueflow.dto.InvoiceDtos.CreateInvoiceRequest;
import in.dueflow.dto.InvoiceDtos.InvoiceDetailResponse;
import in.dueflow.dto.InvoiceDtos.InvoiceListResponse;
import in.dueflow.dto.InvoiceDtos.InvoiceResponseDto;
import in.dueflow.entity.Client;
import in.dueflow.entity.ReminderRule;
import in.dueflow.exception.DuplicateResourceException;
import in.dueflow.exception.ResourceNotFoundException;
import in.dueflow.service.ClientService;
import in.dueflow.service.InvoiceService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@Transactional
public class InvoiceAndClientIntegrationTest {

    @Autowired
    private ClientService clientService;

    @Autowired
    private InvoiceService invoiceService;

    @Test
    void testClientCrudAndTenantIsolation() {
        UUID userA = UUID.randomUUID();
        UUID userB = UUID.randomUUID();

        // 1. Create client for User A
        CreateClientRequest req = new CreateClientRequest();
        req.setName("Innovate Labs");
        req.setEmail("contact@innovate.in");
        req.setNotes("Premier tech client");
        Client created = clientService.createClient(userA, req);

        assertNotNull(created.getId());
        assertEquals("Innovate Labs", created.getName());
        assertEquals("contact@innovate.in", created.getEmail());

        // 2. User A can list and retrieve
        var userAClients = clientService.listClients(userA);
        assertEquals(1, userAClients.size());
        assertEquals(created.getId(), userAClients.get(0).getId());

        // 3. User B cannot access User A's client (Tenant isolation)
        var userBClientOpt = clientService.getClient(userB, created.getId());
        assertTrue(userBClientOpt.isEmpty(), "User B must not be able to retrieve User A's client");

        var userBClients = clientService.listClients(userB);
        assertEquals(0, userBClients.size(), "User B client list must be empty");

        // 4. User B cannot delete User A's client
        boolean deletedByB = clientService.deleteClient(userB, created.getId());
        assertFalse(deletedByB, "User B deletion of User A client must fail");

        // 5. User A deletes client successfully
        boolean deletedByA = clientService.deleteClient(userA, created.getId());
        assertTrue(deletedByA);
    }

    @Test
    void testInvoiceLifecycleAndCadenceGeneration() {
        UUID userA = UUID.randomUUID();
        UUID userB = UUID.randomUUID();

        CreateInvoiceRequest invReq = new CreateInvoiceRequest();
        invReq.setInvoice_number("INV-2026-TEST");
        invReq.setClient_name("Cloudworks Ltd");
        invReq.setClient_email("accounts@cloudworks.io");
        invReq.setAmount(new BigDecimal("50000.00"));
        invReq.setCurrency("INR");
        invReq.setIssue_date(LocalDate.now());
        invReq.setDue_date(LocalDate.now().plusDays(10));
        invReq.setNotes("Software consulting retainer");
        invReq.setReminders_enabled(true);

        // 1. Create invoice
        InvoiceResponseDto created = invoiceService.createInvoice(userA, invReq);
        assertNotNull(created.getId());
        assertEquals("unpaid", created.getStatus());

        // 4 deterministic cadence rules should be created (-3d, 0d, +3d, +7d)
        assertNotNull(created.getRules());
        assertEquals(4, created.getRules().size());

        // 2. Duplicate invoice number rejection
        assertThrows(DuplicateResourceException.class, () -> {
            invoiceService.createInvoice(userA, invReq);
        }, "Should throw DuplicateResourceException on duplicate invoice number for same user");

        // 3. Cross-user isolation: User B cannot retrieve User A's invoice
        assertThrows(ResourceNotFoundException.class, () -> {
            invoiceService.getInvoiceDetail(userB, created.getId());
        }, "User B must get ResourceNotFoundException when accessing User A's invoice");

        // 4. Mark Paid cancels all pending future reminder rules
        InvoiceResponseDto paidInvoice = invoiceService.markInvoicePaid(userA, created.getId());
        assertEquals("paid", paidInvoice.getStatus());
        assertNotNull(paidInvoice.getPaid_at());

        InvoiceDetailResponse detailAfterPaid = invoiceService.getInvoiceDetail(userA, created.getId());
        for (ReminderRule rule : detailAfterPaid.getRules()) {
            assertEquals("cancelled", rule.getStatus(), "All reminder rules must be cancelled when invoice is paid");
            assertFalse(rule.getEnabled());
        }

        // 5. Mark Unpaid recomputes reminder schedule
        InvoiceResponseDto unpaidInvoice = invoiceService.markInvoiceUnpaid(userA, created.getId());
        assertEquals("unpaid", unpaidInvoice.getStatus());
        assertNull(unpaidInvoice.getPaid_at());

        InvoiceDetailResponse detailAfterUnpaid = invoiceService.getInvoiceDetail(userA, created.getId());
        assertTrue(detailAfterUnpaid.getRules().stream().anyMatch(r -> "pending".equals(r.getStatus())));
    }
}
