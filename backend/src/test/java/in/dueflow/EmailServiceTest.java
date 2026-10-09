package in.dueflow;

import in.dueflow.service.EmailService;
import in.dueflow.service.EmailService.EmailRenderData;
import in.dueflow.service.EmailService.RenderedEmail;
import in.dueflow.service.EmailService.SendResult;
import in.dueflow.service.EncryptionService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;

import static org.junit.jupiter.api.Assertions.*;

public class EmailServiceTest {

    private EmailService emailService;

    @BeforeEach
    void setUp() {
        emailService = new EmailService();
        emailService.setEncryptionService(new EncryptionService("test-key", "", "test-cron"));
    }

    @Test
    void testTemplateRenderingFriendlyProfessionalFirm() {
        EmailRenderData data = new EmailRenderData();
        data.invoiceNumber = "INV-2026-001";
        data.amount = new BigDecimal("45000.00");
        data.dueDate = "2026-10-15";
        data.clientName = "Acme Corp";
        data.clientEmail = "billing@acme.com";
        data.businessName = "Apex Design Studio";
        data.senderName = "Alex Sharma";
        data.senderEmail = "alex@apex.in";
        data.upiId = "alex@okaxis";

        // 1. Friendly / Gentle
        data.tone = "friendly";
        RenderedEmail gentle = emailService.renderReminderEmail(data);
        assertTrue(gentle.subject.contains("Payment reminder: Invoice #INV-2026-001"));
        assertTrue(gentle.html.contains("Hi Acme Corp,"));
        assertTrue(gentle.html.contains("friendly payment reminder"));
        assertTrue(gentle.html.contains("₹45,000.00"));
        assertTrue(gentle.html.contains("alex@okaxis"));

        // 2. Professional
        data.tone = "professional";
        RenderedEmail prof = emailService.renderReminderEmail(data);
        assertTrue(prof.html.contains("courtesy payment reminder"));
        assertTrue(prof.text.contains("Amount due: ₹45,000.00"));

        // 3. Firm
        data.tone = "firm";
        RenderedEmail firm = emailService.renderReminderEmail(data);
        assertTrue(firm.html.contains("important reminder"));
        assertTrue(firm.html.contains("prompt settlement"));
    }

    @Test
    void testTemplatePlaceholderInterpolation() {
        EmailRenderData data = new EmailRenderData();
        data.invoiceNumber = "1000";
        data.amount = new BigDecimal("10000.00");
        data.dueDate = "23 October 2026";
        data.clientName = "Mesh";
        data.businessName = "AGENTIX";
        data.senderName = "Agentix Billing";
        data.upiId = "agentix@upi";
        data.customSubject = "Payment reminder: Invoice #{{invoice_number}} | {{invoice_amount}} due {{due_date}}";
        data.customBody = "Hi {{client_name}},\n\nThis is a friendly payment reminder from {{business_name}} regarding invoice #{{invoice_number}}.";

        RenderedEmail email = emailService.renderReminderEmail(data);
        assertEquals("Payment reminder: Invoice #1000 | ₹10,000.00 due 23 October 2026", email.subject);
        assertTrue(email.html.contains("Hi Mesh,"));
        assertTrue(email.html.contains("This is a friendly payment reminder from AGENTIX regarding invoice #1000."));
        assertTrue(email.html.contains("UPI ID:</strong> agentix@upi"));
    }

    @Test
    void testNoConnectedProviderFailsCleanlyWithoutResendFallback() {
        EmailRenderData data = new EmailRenderData();
        data.invoiceNumber = "INV-001";
        data.amount = new BigDecimal("1000.00");
        data.dueDate = "2026-10-20";
        data.clientName = "Client";
        data.clientEmail = "client@example.com";

        SendResult result = emailService.sendEmail("client@example.com", "sender@example.com", data);
        assertFalse(result.success, "Must fail when no personal email account is connected");
        assertEquals("none", result.provider);
        assertNull(result.providerMessageId, "Provider message ID must be null on failure");
        assertTrue(result.error.contains("No connected email account (Gmail or Outlook) found"));
    }

    @Test
    void testRfc2822MimeMessageWithPdfAttachment() {
        byte[] fakePdf = "%PDF-1.7\nFake PDF content for test".getBytes(StandardCharsets.UTF_8);
        String mime = emailService.buildRfc2822MimeMessage(
                "Apex Design", "billing@apex.in", "client@example.com", null,
                "Payment reminder: Invoice #1000", "<p>Please find attached invoice.</p>", "Please find attached invoice.",
                fakePdf, "Invoice-1000.pdf"
        );

        assertNotNull(mime);
        assertTrue(mime.contains("Subject: Payment reminder: Invoice #1000"));
        assertTrue(mime.contains("Content-Type: multipart/mixed;"));
        assertTrue(mime.contains("Content-Type: multipart/alternative;"));
        assertTrue(mime.contains("Content-Type: application/pdf; name=\"Invoice-1000.pdf\""));
        assertTrue(mime.contains("Content-Disposition: attachment; filename=\"Invoice-1000.pdf\""));
    }
}
