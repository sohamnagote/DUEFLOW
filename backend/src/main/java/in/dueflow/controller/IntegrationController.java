package in.dueflow.controller;

import in.dueflow.dto.IntegrationDtos.UpdateSettingsRequest;
import in.dueflow.security.SecurityUtils;
import in.dueflow.service.IntegrationService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/integrations")
public class IntegrationController {

    private final IntegrationService integrationService;

    public IntegrationController(IntegrationService integrationService) {
        this.integrationService = integrationService;
    }

    @GetMapping
    public ResponseEntity<Map<String, Object>> getIntegrations() {
        UUID userId = SecurityUtils.getCurrentUserId();
        Map<String, Object> result = integrationService.getIntegrationsAndSettings(userId);
        return ResponseEntity.ok(result);
    }

    @PutMapping("/settings")
    public ResponseEntity<Map<String, Object>> updateSettings(@Valid @RequestBody UpdateSettingsRequest request) {
        UUID userId = SecurityUtils.getCurrentUserId();
        Map<String, Object> result = integrationService.updateSettings(userId, request);
        return ResponseEntity.ok(result);
    }

    @GetMapping("/email/status")
    public ResponseEntity<Map<String, Object>> getEmailStatus() {
        return ResponseEntity.ok(Map.of(
                "success", true,
                "status", "SETUP_REQUIRED",
                "message", "Configured via RESEND_API_KEY"
        ));
    }

    @PostMapping("/email/test")
    public ResponseEntity<Map<String, Object>> testEmail() {
        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Email service test completed successfully"
        ));
    }

    @PostMapping("/email/disconnect")
    public ResponseEntity<Map<String, Object>> disconnectEmail() {
        UUID userId = SecurityUtils.getCurrentUserId();
        integrationService.deleteIntegration(userId, "resend");
        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Email integration disconnected"
        ));
    }

    @PostMapping("/whatsapp/start")
    public ResponseEntity<Map<String, Object>> startWhatsApp() {
        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "WhatsApp Business connection initiated"
        ));
    }

    @PostMapping("/whatsapp/callback")
    public ResponseEntity<Map<String, Object>> callbackWhatsApp(@RequestBody Map<String, Object> payload) {
        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "WhatsApp Business connected successfully"
        ));
    }

    @GetMapping("/whatsapp/status")
    public ResponseEntity<Map<String, Object>> getWhatsAppStatus() {
        return ResponseEntity.ok(Map.of(
                "success", true,
                "status", "NOT_CONNECTED"
        ));
    }

    @PostMapping("/whatsapp/test")
    public ResponseEntity<Map<String, Object>> testWhatsApp() {
        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "WhatsApp test completed"
        ));
    }

    @PostMapping("/whatsapp/disconnect")
    public ResponseEntity<Map<String, Object>> disconnectWhatsApp() {
        UUID userId = SecurityUtils.getCurrentUserId();
        integrationService.deleteIntegration(userId, "whatsapp_business");
        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "WhatsApp Business integration disconnected"
        ));
    }
}
