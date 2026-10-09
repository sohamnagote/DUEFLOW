package in.dueflow;

import in.dueflow.entity.Invoice;
import in.dueflow.entity.Profile;
import in.dueflow.service.PdfInvoiceService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

public class PdfInvoiceServiceTest {

    private PdfInvoiceService pdfInvoiceService;

    @BeforeEach
    void setUp() {
        pdfInvoiceService = new PdfInvoiceService();
    }

    @Test
    void testGenerateInvoicePdfProducesValidA4Pdf() {
        Invoice invoice = new Invoice();
        invoice.setId(UUID.randomUUID());
        invoice.setInvoiceNumber("INV-1000");
        invoice.setAmount(new BigDecimal("10000.00"));
        invoice.setIssueDate(LocalDate.of(2026, 10, 1));
        invoice.setDueDate(LocalDate.of(2026, 10, 23));
        invoice.setClientNameSnapshot("Mesh Enterprises");
        invoice.setClientEmailSnapshot("mesh@example.com");
        invoice.setNotes("Software development deliverables Phase 1");
        invoice.setStatus("unpaid");

        Profile profile = new Profile(UUID.randomUUID(), "test@agentix.in");
        profile.setFullName("Agentix Founder");
        profile.setBusinessName("AGENTIX CORP");
        profile.setPhone("+91 9876543210");
        profile.setUpiId("agentix@okhdfcbank");
        profile.setBankAccount("123456789012");
        profile.setBankIfsc("HDFC0001234");
        profile.setBankName("HDFC Bank");
        profile.setPaymentNotes("Please mention invoice number in the payment remarks.");

        PdfInvoiceService.PdfGenerationResult result = pdfInvoiceService.generateInvoicePdf(invoice, profile);

        assertNotNull(result);
        assertNotNull(result.pdfBytes);
        assertTrue(result.pdfBytes.length > 500, "PDF bytes should be non-trivial");
        assertEquals("Invoice-INV-1000.pdf", result.filename);

        // Verify PDF Magic Bytes (%PDF-)
        String header = new String(result.pdfBytes, 0, 5);
        assertEquals("%PDF-", header, "Should start with standard PDF header magic bytes");
    }

    @Test
    void testSafeFilenameSanitization() {
        Invoice invoice = new Invoice();
        invoice.setId(UUID.randomUUID());
        invoice.setInvoiceNumber("#INV/2026-10-09 #special!");
        invoice.setAmount(new BigDecimal("5000.00"));
        invoice.setDueDate(LocalDate.now().plusDays(7));

        Profile profile = new Profile(UUID.randomUUID(), "test@dueflow.in");

        PdfInvoiceService.PdfGenerationResult result = pdfInvoiceService.generateInvoicePdf(invoice, profile);

        assertNotNull(result);
        assertTrue(result.filename.startsWith("Invoice-"));
        assertTrue(result.filename.endsWith(".pdf"));
        assertFalse(result.filename.contains("#"));
        assertFalse(result.filename.contains("/"));
        assertFalse(result.filename.contains("!"));
    }
}
