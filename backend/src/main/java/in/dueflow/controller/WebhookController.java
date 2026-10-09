package in.dueflow.controller;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/webhooks")
public class WebhookController {

    private static final Logger log = LoggerFactory.getLogger(WebhookController.class);

    @Value("${WHATSAPP_WEBHOOK_VERIFY_TOKEN:dueflow_whatsapp_webhook_2026}")
    private String whatsappVerifyToken;

    public WebhookController() {}

    @GetMapping("/whatsapp")
    public ResponseEntity<String> verifyWhatsappWebhook(
            @RequestParam(name = "hub.mode", required = false) String mode,
            @RequestParam(name = "hub.verify_token", required = false) String token,
            @RequestParam(name = "hub.challenge", required = false) String challenge) {

        if ("subscribe".equals(mode) && whatsappVerifyToken != null && whatsappVerifyToken.equals(token)) {
            return ResponseEntity.ok(challenge != null ? challenge : "");
        }

        return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Verification token mismatch");
    }

    @PostMapping("/whatsapp")
    public ResponseEntity<Map<String, String>> handleWhatsappWebhook(@RequestBody Map<String, Object> body) {
        return ResponseEntity.ok(Map.of("status", "success"));
    }
}
