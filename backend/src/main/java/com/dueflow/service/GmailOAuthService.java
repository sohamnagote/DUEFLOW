package com.dueflow.service;

import com.dueflow.domain.GmailIntegration;
import com.dueflow.dto.GmailStatusDto;
import com.dueflow.exception.ValidationException;
import com.dueflow.repository.GmailIntegrationRepository;
import com.dueflow.security.AesGcmEncryptionService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class GmailOAuthService {

    private static final Logger log = LoggerFactory.getLogger(GmailOAuthService.class);

    private static final String GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
    private static final String GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
    private static final String GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo";
    private static final String SCOPES = "https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/userinfo.email openid";

    private final String clientId;
    private final String clientSecret;
    private final String redirectUri;
    private final GmailIntegrationRepository gmailIntegrationRepository;
    private final AesGcmEncryptionService encryptionService;
    private final RestTemplate restTemplate;

    private record OAuthState(String userId, Instant expiresAt) {}

    // Secure state store for CSRF protection with 10-minute TTL
    private final Map<String, OAuthState> stateStore = new ConcurrentHashMap<>();

    public GmailOAuthService(
            @Value("${dueflow.google.client-id:}") String clientId,
            @Value("${dueflow.google.client-secret:}") String clientSecret,
            @Value("${dueflow.google.redirect-uri:http://localhost:8081/api/integrations/gmail/oauth/callback}") String redirectUri,
            GmailIntegrationRepository gmailIntegrationRepository,
            AesGcmEncryptionService encryptionService) {
        this.clientId = clientId;
        this.clientSecret = clientSecret;
        this.redirectUri = redirectUri;
        this.gmailIntegrationRepository = gmailIntegrationRepository;
        this.encryptionService = encryptionService;
        this.restTemplate = new RestTemplate();
    }

    /**
     * Generates the Google OAuth authorization URL for offline access (refresh token).
     */
    public String getAuthorizationUrl(String userId) {
        if (clientId == null || clientId.isBlank()) {
            throw new ValidationException("Google OAuth Client ID is not configured on the backend. Please configure GOOGLE_OAUTH_CLIENT_ID.");
        }
        if (clientSecret == null || clientSecret.isBlank()) {
            throw new ValidationException("Google OAuth Client Secret is not configured on the backend. Please configure GOOGLE_OAUTH_CLIENT_SECRET.");
        }

        // Clean up expired states
        Instant now = Instant.now();
        stateStore.entrySet().removeIf(entry -> entry.getValue().expiresAt().isBefore(now));

        String state = java.util.UUID.randomUUID().toString();
        stateStore.put(state, new OAuthState(userId, now.plusSeconds(600))); // 10 minutes TTL

        return UriComponentsBuilder.fromHttpUrl(GOOGLE_AUTH_URL)
                .queryParam("client_id", clientId)
                .queryParam("redirect_uri", redirectUri)
                .queryParam("response_type", "code")
                .queryParam("scope", SCOPES)
                .queryParam("access_type", "offline")
                .queryParam("prompt", "consent")
                .queryParam("state", state)
                .build()
                .toUriString();
    }

    /**
     * Exchanges auth code for tokens and saves encrypted refresh token.
     */
    @Transactional
    @SuppressWarnings("unchecked")
    public String handleOAuthCallback(String code, String state) {
        OAuthState stored = stateStore.remove(state);
        if (stored == null || stored.expiresAt().isBefore(Instant.now())) {
            throw new ValidationException("Invalid or expired OAuth state parameter");
        }
        String userId = stored.userId();

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);

        MultiValueMap<String, String> body = new LinkedMultiValueMap<>();
        body.add("code", code);
        body.add("client_id", clientId);
        body.add("client_secret", clientSecret);
        body.add("redirect_uri", redirectUri);
        body.add("grant_type", "authorization_code");

        HttpEntity<MultiValueMap<String, String>> request = new HttpEntity<>(body, headers);

        try {
            ResponseEntity<Map> tokenResponse = restTemplate.postForEntity(GOOGLE_TOKEN_URL, request, Map.class);
            Map<String, Object> tokenData = tokenResponse.getBody();

            if (tokenData == null || !tokenData.containsKey("access_token")) {
                throw new ValidationException("Failed to obtain access token from Google");
            }

            String accessToken = (String) tokenData.get("access_token");
            String refreshToken = (String) tokenData.get("refresh_token");
            Integer expiresIn = (Integer) tokenData.get("expires_in");
            String scope = (String) tokenData.get("scope");

            // Query user's email address
            String userEmail = fetchGoogleEmail(accessToken);

            // Fetch existing integration or create new
            Optional<GmailIntegration> existingOpt = gmailIntegrationRepository.findByUserId(userId);
            GmailIntegration integration = existingOpt.orElseGet(GmailIntegration::new);

            integration.setUserId(userId);
            integration.setGmailEmail(userEmail != null ? userEmail : "connected@gmail.com");
            if (refreshToken != null && !refreshToken.isBlank()) {
                integration.setEncryptedRefreshToken(encryptionService.encrypt(refreshToken));
            } else if (integration.getEncryptedRefreshToken() == null) {
                throw new ValidationException("Google did not return a refresh token. Please revoke access in Google Account Settings and retry.");
            }
            if (expiresIn != null) {
                integration.setTokenExpiry(Instant.now().plusSeconds(expiresIn));
            }
            integration.setGrantedScopes(scope);
            integration.setConnectionStatus("CONNECTED");

            gmailIntegrationRepository.save(integration);
            log.info("Successfully connected Gmail for user {} with email {}", userId, integration.getGmailEmail());

            return integration.getGmailEmail();
        } catch (Exception e) {
            log.error("Google OAuth token exchange failed: {}", e.getMessage(), e);
            throw new ValidationException("Failed to complete Google OAuth authorization: " + e.getMessage());
        }
    }

    @Transactional(readOnly = true)
    public GmailStatusDto getConnectionStatus(String userId) {
        return gmailIntegrationRepository.findByUserId(userId)
                .map(i -> new GmailStatusDto(
                        "CONNECTED".equalsIgnoreCase(i.getConnectionStatus()),
                        i.getGmailEmail(),
                        i.getConnectionStatus(),
                        i.getCreatedAt()
                ))
                .orElse(new GmailStatusDto(false, null, "DISCONNECTED", null));
    }

    @Transactional
    public void disconnect(String userId) {
        gmailIntegrationRepository.findByUserId(userId).ifPresent(i -> {
            i.setConnectionStatus("DISCONNECTED");
            gmailIntegrationRepository.save(i);
            log.info("Gmail integration disconnected for user {}", userId);
        });
    }

    @Transactional(readOnly = true)
    public String getDecryptedRefreshToken(String userId) {
        return gmailIntegrationRepository.findByUserId(userId)
                .filter(i -> "CONNECTED".equalsIgnoreCase(i.getConnectionStatus()))
                .map(i -> encryptionService.decrypt(i.getEncryptedRefreshToken()))
                .orElse(null);
    }

    @Transactional(readOnly = true)
    public String getSenderEmail(String userId) {
        return gmailIntegrationRepository.findByUserId(userId)
                .filter(i -> "CONNECTED".equalsIgnoreCase(i.getConnectionStatus()))
                .map(GmailIntegration::getGmailEmail)
                .orElse(null);
    }

    @SuppressWarnings("unchecked")
    private String fetchGoogleEmail(String accessToken) {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setBearerAuth(accessToken);
            HttpEntity<Void> entity = new HttpEntity<>(headers);
            ResponseEntity<Map> response = restTemplate.exchange(GOOGLE_USERINFO_URL, HttpMethod.GET, entity, Map.class);
            if (response.getBody() != null && response.getBody().containsKey("email")) {
                return (String) response.getBody().get("email");
            }
        } catch (Exception e) {
            log.warn("Failed to fetch Google userinfo email: {}", e.getMessage());
        }
        return null;
    }
}
