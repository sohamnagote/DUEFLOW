package com.dueflow.controller;

import com.dueflow.dto.GmailStatusDto;
import com.dueflow.security.SecurityUtils;
import com.dueflow.service.GmailOAuthService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Map;

@RestController
@RequestMapping({"/api/integrations/gmail", "/integrations/gmail"})
public class GmailIntegrationController {

    private static final Logger log = LoggerFactory.getLogger(GmailIntegrationController.class);

    private final GmailOAuthService gmailOAuthService;
    private final com.dueflow.service.GmailReplySyncService gmailReplySyncService;
    private final String frontendBaseUrl;

    public GmailIntegrationController(
            GmailOAuthService gmailOAuthService,
            com.dueflow.service.GmailReplySyncService gmailReplySyncService,
            @Value("${dueflow.frontend.base-url:http://localhost:3000}") String frontendBaseUrl) {
        this.gmailOAuthService = gmailOAuthService;
        this.gmailReplySyncService = gmailReplySyncService;
        this.frontendBaseUrl = frontendBaseUrl != null ? frontendBaseUrl.replaceAll("/+$", "") : "http://localhost:3000";
    }

    public GmailIntegrationController(GmailOAuthService gmailOAuthService, String frontendBaseUrl) {
        this(gmailOAuthService, null, frontendBaseUrl);
    }

    @GetMapping("/status")
    public ResponseEntity<GmailStatusDto> getStatus() {
        String userId = SecurityUtils.getRequiredUserId();
        return ResponseEntity.ok(gmailOAuthService.getConnectionStatus(userId));
    }

    public ResponseEntity<Map<String, String>> getAuthUrl() {
        String userId = SecurityUtils.getRequiredUserId();
        String authUrl = gmailOAuthService.getAuthorizationUrl(userId);
        Map<String, String> body = new java.util.HashMap<>();
        if (authUrl != null) {
            body.put("url", authUrl);
            body.put("authUrl", authUrl);
        }
        body.put("mode", "oauth2");
        return ResponseEntity.ok(body);
    }

    @RequestMapping(value = {
            "/oauth/url",
            "/api/integrations/email/google/start",
            "/integrations/email/google/start"
    }, method = {RequestMethod.GET, RequestMethod.POST})
    public ResponseEntity<Map<String, String>> getAuthUrl(
            @RequestParam(value = "replyDetection", defaultValue = "true") boolean replyDetection) {
        String userId = SecurityUtils.getRequiredUserId();
        String authUrl = replyDetection 
                ? gmailOAuthService.getAuthorizationUrl(userId, true)
                : gmailOAuthService.getAuthorizationUrl(userId);
        Map<String, String> body = new java.util.HashMap<>();
        if (authUrl != null) {
            body.put("url", authUrl);
            body.put("authUrl", authUrl);
        }
        body.put("mode", "oauth2");
        return ResponseEntity.ok(body);
    }



    @PostMapping("/sync-replies")
    public ResponseEntity<Map<String, Object>> syncReplies() {
        String userId = SecurityUtils.getRequiredUserId();
        int count = gmailReplySyncService.syncRepliesForUser(userId);
        return ResponseEntity.ok(Map.of(
                "success", true,
                "repliesDetected", count,
                "message", count > 0 ? "Detected " + count + " new reply(s)" : "Synchronization complete. No new replies."
        ));
    }


    @GetMapping({
            "/oauth/callback",
            "/api/integrations/email/google/callback",
            "/integrations/email/google/callback"
    })
    public ResponseEntity<Void> handleOAuthCallback(
            @RequestParam("code") String code,
            @RequestParam("state") String state) {
        try {
            String connectedEmail = gmailOAuthService.handleOAuthCallback(code, state);
            log.info("Gmail OAuth callback succeeded for {}", connectedEmail);

            String redirectTarget = frontendBaseUrl + "/settings?gmail=connected&email=" +
                    URLEncoder.encode(connectedEmail != null ? connectedEmail : "", StandardCharsets.UTF_8);

            HttpHeaders headers = new HttpHeaders();
            headers.setLocation(URI.create(redirectTarget));
            return new ResponseEntity<>(headers, HttpStatus.FOUND);

        } catch (Exception e) {
            log.error("Gmail OAuth callback handling failed: {}", e.getMessage(), e);

            String redirectTarget = frontendBaseUrl + "/settings?gmail=error&error=" +
                    URLEncoder.encode(e.getMessage() != null ? e.getMessage() : "Unknown error", StandardCharsets.UTF_8);

            HttpHeaders headers = new HttpHeaders();
            headers.setLocation(URI.create(redirectTarget));
            return new ResponseEntity<>(headers, HttpStatus.FOUND);
        }
    }

    @PostMapping("/disconnect")
    public ResponseEntity<Map<String, String>> disconnect() {
        String userId = SecurityUtils.getRequiredUserId();
        gmailOAuthService.disconnect(userId);
        return ResponseEntity.ok(Map.of("message", "Gmail integration disconnected successfully"));
    }
}
