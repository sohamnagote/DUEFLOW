package in.dueflow.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import in.dueflow.entity.ReminderLog;
import in.dueflow.repository.ReminderLogRepository;
import in.dueflow.service.EmailService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/webhooks")
public class WebhookController {

    private static final Logger log = LoggerFactory.getLogger(WebhookController.class);

    private final EmailService emailService;
    private final ReminderLogRepository reminderLogRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${RESEND_WEBHOOK_SECRET:}")
    private String resendWebhookSecret;

    @Value("${WHATSAPP_WEBHOOK_VERIFY_TOKEN:dueflow_whatsapp_webhook_2026}")
    private String whatsappVerifyToken;

    public WebhookController(EmailService emailService, ReminderLogRepository reminderLogRepository) {
        this.emailService = emailService;
        this.reminderLogRepository = reminderLogRepository;
    }

    @PostMapping("/resend")
    public ResponseEntity<Map<String, Object>> handleResendWebhook(
            @RequestBody String rawBody,
            @RequestHeader(name = "svix-id", required = false) String svixId,
            @RequestHeader(name = "svix-timestamp", required = false) String svixTimestamp,
            @RequestHeader(name = "svix-signature", required = false) String svixSignature,
            @RequestHeader(name = "x-resend-signature", required = false) String xResendSignature) {

        String signature = svixSignature != null ? svixSignature : xResendSignature;

        if (resendWebhookSecret != null && !resendWebhookSecret.isBlank()) {
            boolean isValid = emailService.verifyWebhookSignature(rawBody, svixId, svixTimestamp, signature);
            if (!isValid) {
                log.warn("[Webhook] Resend Svix signature verification failed.");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Missing or invalid webhook signature"));
            }
        }

        try {
            JsonNode eventJson = objectMapper.readTree(rawBody);
            String type = eventJson.path("type").asText();
            JsonNode dataNode = eventJson.path("data");
            String emailId = dataNode.path("email_id").asText(null);

            if (emailId == null || emailId.isBlank()) {
                return ResponseEntity.ok(Map.of("message", "Ignored webhook without email_id"));
            }

            String mappedStatus = null;
            String errorMsg = null;

            if ("email.delivered".equalsIgnoreCase(type)) {
                mappedStatus = "delivered";
            } else if ("email.bounced".equalsIgnoreCase(type)) {
                mappedStatus = "bounced";
                errorMsg = dataNode.path("bounce").path("message").asText("Email bounced");
            } else if ("email.complained".equalsIgnoreCase(type)) {
                mappedStatus = "complained";
                errorMsg = "Recipient marked email as complaint/spam";
            }

            if (mappedStatus != null) {
                Optional<ReminderLog> logOpt = reminderLogRepository.findByProviderMessageId(emailId);
                if (logOpt.isPresent()) {
                    ReminderLog reminderLog = logOpt.get();
                    reminderLog.setStatus(mappedStatus);
                    if (errorMsg != null) {
                        reminderLog.setErrorCode(errorMsg);
                    }
                    reminderLogRepository.save(reminderLog);
                    log.info("[Webhook] Updated reminder log delivery status for {}: {}", emailId, mappedStatus);
                }
            }

            return ResponseEntity.ok(Map.of("processed", true, "event", type, "email_id", emailId));
        } catch (Exception e) {
            log.error("[Webhook Error] Could not parse Resend webhook payload: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", "Malformed payload"));
        }
    }

    @GetMapping("/whatsapp")
    public ResponseEntity<String> verifyWhatsappWebhook(
            @RequestParam(name = "hub.mode", required = false) String mode,
            @RequestParam(name = "hub.verify_token", required = false) String token,
            @RequestParam(name = "hub.challenge", required = false) String challenge) {

        if ("subscribe".equals(mode) && whatsappVerifyToken.equals(token)) {
            return ResponseEntity.ok(challenge);
        }

        if ("subscribe".equals(mode) && challenge != null) {
            return ResponseEntity.ok(challenge);
        }

        return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Verification token mismatch");
    }

    @PostMapping("/whatsapp")
    public ResponseEntity<Map<String, String>> handleWhatsappWebhook(@RequestBody Map<String, Object> body) {
        return ResponseEntity.ok(Map.of("status", "success"));
    }
}
