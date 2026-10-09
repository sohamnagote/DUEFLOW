package in.dueflow;

import in.dueflow.service.EmailService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.Base64;

import static org.junit.jupiter.api.Assertions.*;

public class WebhookSignatureTest {

    private EmailService emailService;
    private final String rawSecret = "test_svix_secret_key_12345678901234567890";
    private String base64Secret;

    @BeforeEach
    void setUp() {
        emailService = new EmailService();
        base64Secret = Base64.getEncoder().encodeToString(rawSecret.getBytes(StandardCharsets.UTF_8));
        ReflectionTestUtils.setField(emailService, "resendWebhookSecret", "whsec_" + base64Secret);
    }

    @Test
    void testValidSvixSignatureVerification() throws Exception {
        String svixId = "msg_2X5Y7Z";
        String svixTimestamp = String.valueOf(java.time.Instant.now().getEpochSecond());
        String rawBody = "{\"type\":\"email.delivered\",\"data\":{\"email_id\":\"msg_123\"}}";

        String toSign = svixId + "." + svixTimestamp + "." + rawBody;
        Mac mac = Mac.getInstance("HmacSHA256");
        SecretKeySpec keySpec = new SecretKeySpec(rawSecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
        mac.init(keySpec);
        String expectedSig = Base64.getEncoder().encodeToString(mac.doFinal(toSign.getBytes(StandardCharsets.UTF_8)));

        String svixSignature = "v1," + expectedSig;

        boolean isValid = emailService.verifyWebhookSignature(rawBody, svixId, svixTimestamp, svixSignature);
        assertTrue(isValid, "Valid Svix signature should verify successfully");
    }

    @Test
    void testTamperedPayloadFailsVerification() throws Exception {
        String svixId = "msg_2X5Y7Z";
        String svixTimestamp = String.valueOf(java.time.Instant.now().getEpochSecond());
        String rawBody = "{\"type\":\"email.delivered\",\"data\":{\"email_id\":\"msg_123\"}}";

        String toSign = svixId + "." + svixTimestamp + "." + rawBody;
        Mac mac = Mac.getInstance("HmacSHA256");
        SecretKeySpec keySpec = new SecretKeySpec(rawSecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
        mac.init(keySpec);
        String expectedSig = Base64.getEncoder().encodeToString(mac.doFinal(toSign.getBytes(StandardCharsets.UTF_8)));

        String tamperedBody = "{\"type\":\"email.bounced\",\"data\":{\"email_id\":\"msg_123\"}}";

        boolean isValid = emailService.verifyWebhookSignature(tamperedBody, svixId, svixTimestamp, "v1," + expectedSig);
        assertFalse(isValid, "Tampered payload must fail Svix verification");
    }
}
