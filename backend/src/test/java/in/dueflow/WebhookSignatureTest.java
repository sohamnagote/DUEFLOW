package in.dueflow;

import in.dueflow.controller.WebhookController;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

public class WebhookSignatureTest {

    private WebhookController webhookController;

    @BeforeEach
    void setUp() {
        webhookController = new WebhookController();
        ReflectionTestUtils.setField(webhookController, "whatsappVerifyToken", "dueflow_test_token");
    }

    @Test
    void testWhatsappWebhookVerificationSuccess() {
        ResponseEntity<String> response = webhookController.verifyWhatsappWebhook(
                "subscribe", "dueflow_test_token", "challenge_12345"
        );
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals("challenge_12345", response.getBody());
    }

    @Test
    void testWhatsappWebhookVerificationMismatchRejected() {
        ResponseEntity<String> response = webhookController.verifyWhatsappWebhook(
                "subscribe", "wrong_token", "challenge_12345"
        );
        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
    }
}
