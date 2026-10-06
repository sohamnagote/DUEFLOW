package in.dueflow;

import in.dueflow.service.EmailService;
import in.dueflow.service.EmailService.EmailRenderData;
import in.dueflow.service.EmailService.RenderedEmail;
import in.dueflow.service.EmailService.SendResult;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.*;

public class EmailServiceTest {

    private EmailService emailService;

    @BeforeEach
    void setUp() {
        emailService = new EmailService();
        ReflectionTestUtils.setField(emailService, "resendFromEmail", "DueFlow Reminders <reminders@dueflow.in>");
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

        // 1. Gentle / Friendly
        data.tone = "gentle";
        RenderedEmail gentle = emailService.renderReminderEmail(data);
        assertTrue(gentle.subject.contains("Friendly check-in"));
        assertTrue(gentle.text.contains("gentle reminder"));
        assertTrue(gentle.html.contains("Apex Design Studio"));

        // 2. Professional
        data.tone = "professional";
        RenderedEmail prof = emailService.renderReminderEmail(data);
        assertTrue(prof.subject.contains("Payment reminder"));
        assertTrue(prof.text.contains("courtesy reminder"));

        // 3. Firm
        data.tone = "firm";
        RenderedEmail firm = emailService.renderReminderEmail(data);
        assertTrue(firm.subject.contains("ACTION REQUIRED"));
        assertTrue(firm.text.contains("Prompt payment is required"));
    }

    @Test
    void testResendFailureWhenUnconfiguredNeverSimulates() {
        // Without real RESEND_API_KEY, sendEmail MUST return failure and never simulate a sent message
        ReflectionTestUtils.setField(emailService, "resendApiKey", "");

        EmailRenderData data = new EmailRenderData();
        data.invoiceNumber = "INV-001";
        data.amount = new BigDecimal("1000.00");
        data.dueDate = "2026-10-20";
        data.clientName = "Client";
        data.clientEmail = "client@example.com";

        SendResult result = emailService.sendEmail("client@example.com", "sender@example.com", data);
        assertFalse(result.success, "Should fail when RESEND_API_KEY is not configured");
        assertNull(result.providerMessageId, "Provider message ID must be null on failure");
        assertNotNull(result.error);
    }
}
