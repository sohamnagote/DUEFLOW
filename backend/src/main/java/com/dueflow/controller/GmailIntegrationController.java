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
@RequestMapping("/api/integrations/gmail")
public class GmailIntegrationController {

    private static final Logger log = LoggerFactory.getLogger(GmailIntegrationController.class);

    private final GmailOAuthService gmailOAuthService;
    private final String frontendBaseUrl;

    public GmailIntegrationController(
            GmailOAuthService gmailOAuthService,
            @Value("${dueflow.frontend.base-url:http://localhost:3000}") String frontendBaseUrl) {
        this.gmailOAuthService = gmailOAuthService;
        this.frontendBaseUrl = frontendBaseUrl != null ? frontendBaseUrl.replaceAll("/+$", "") : "http://localhost:3000";
    }

    @GetMapping("/status")
    public ResponseEntity<GmailStatusDto> getStatus() {
        String userId = SecurityUtils.getRequiredUserId();
        return ResponseEntity.ok(gmailOAuthService.getConnectionStatus(userId));
    }

    @GetMapping("/oauth/url")
    public ResponseEntity<Map<String, String>> getAuthUrl() {
        String userId = SecurityUtils.getRequiredUserId();
        String authUrl = gmailOAuthService.getAuthorizationUrl(userId);
        return ResponseEntity.ok(Map.of("url", authUrl));
    }

    @GetMapping("/oauth/callback")
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
