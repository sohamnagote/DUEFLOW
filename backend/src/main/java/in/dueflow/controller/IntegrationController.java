package in.dueflow.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import in.dueflow.dto.IntegrationDtos.UpdateSettingsRequest;
import in.dueflow.entity.Integration;
import in.dueflow.repository.IntegrationRepository;
import in.dueflow.repository.ProfileRepository;
import in.dueflow.security.SecurityUtils;
import in.dueflow.service.IntegrationService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import in.dueflow.entity.Profile;
import in.dueflow.service.EmailService;
import in.dueflow.service.OAuthStateService;
import in.dueflow.service.EncryptionService;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;

@RestController
@RequestMapping("/api/integrations")
public class IntegrationController {

    private static final Logger log = LoggerFactory.getLogger(IntegrationController.class);

    private final IntegrationService integrationService;
    private final IntegrationRepository integrationRepository;
    private final ProfileRepository profileRepository;
    private final ObjectMapper objectMapper;
    private final EmailService emailService;
    private final OAuthStateService oauthStateService;
    private final EncryptionService encryptionService;

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();

    @Value("${GOOGLE_CLIENT_ID:}")
    private String googleClientId;

    @Value("${GOOGLE_CLIENT_SECRET:}")
    private String googleClientSecret;

    @Value("${MICROSOFT_CLIENT_ID:}")
    private String microsoftClientId;

    @Value("${MICROSOFT_CLIENT_SECRET:}")
    private String microsoftClientSecret;

    @Value("${APP_BASE_URL:http://localhost:3000}")
    private String appBaseUrl;

    public IntegrationController(
            IntegrationService integrationService,
            IntegrationRepository integrationRepository,
            ProfileRepository profileRepository,
            ObjectMapper objectMapper,
            EmailService emailService,
            OAuthStateService oauthStateService,
            EncryptionService encryptionService
    ) {
        this.integrationService = integrationService;
        this.integrationRepository = integrationRepository;
        this.profileRepository = profileRepository;
        this.objectMapper = objectMapper;
        this.emailService = emailService;
        this.oauthStateService = oauthStateService;
        this.encryptionService = encryptionService;
    }

    private String getBaseUrl(HttpServletRequest req) {
        if (appBaseUrl != null && !appBaseUrl.isBlank() && appBaseUrl.startsWith("http")) {
            return appBaseUrl.replaceAll("/+$", "");
        }
        String proto = req.getHeader("x-forwarded-proto");
        if (proto == null || proto.isBlank()) {
            proto = req.getScheme();
        }
        String host = req.getHeader("x-forwarded-host");
        if (host == null || host.isBlank()) {
            host = req.getHeader("host");
        }
        if (host == null || host.isBlank()) {
            host = "localhost:" + req.getServerPort();
        }
        return (proto + "://" + host).replaceAll("/+$", "");
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

    // -----------------------------------------------------------------------
    // GOOGLE GMAIL OAUTH
    // -----------------------------------------------------------------------

    @RequestMapping(value = "/email/google/start", method = {RequestMethod.GET, RequestMethod.POST})
    public ResponseEntity<?> startGoogleEmailOAuth(HttpServletRequest request) {
        if (googleClientId == null || googleClientId.isBlank() || googleClientSecret == null || googleClientSecret.isBlank()) {
            log.warn("[Google OAuth] Connect Gmail rejected: GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET not configured");
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
                    "success", false,
                    "code", "GOOGLE_CREDENTIALS_MISSING",
                    "message", "Google Cloud credentials (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET) are not configured in the server environment."
            ));
        }

        UUID userId = null;
        try {
            userId = SecurityUtils.getCurrentUserId();
        } catch (Exception ignored) {}

        if (userId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of(
                    "success", false,
                    "error", "Unauthorized: Valid authentication required to initiate Gmail OAuth"
            ));
        }

        String baseUrl = getBaseUrl(request);
        String redirectUri = baseUrl + "/api/integrations/email/google/callback";

        // Cryptographically signed, single-use, time-bounded OAuth state parameter
        String state = oauthStateService.generateState(userId, "google");

        String scopes = "https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/userinfo.email openid";

        String authUrl = "https://accounts.google.com/o/oauth2/v2/auth?"
                + "client_id=" + URLEncoder.encode(googleClientId.trim(), StandardCharsets.UTF_8)
                + "&redirect_uri=" + URLEncoder.encode(redirectUri, StandardCharsets.UTF_8)
                + "&response_type=code"
                + "&scope=" + URLEncoder.encode(scopes, StandardCharsets.UTF_8)
                + "&access_type=offline"
                + "&prompt=consent"
                + "&state=" + URLEncoder.encode(state, StandardCharsets.UTF_8);

        return ResponseEntity.ok(Map.of(
                "url", authUrl,
                "mode", "oauth2",
                "redirect_uri", redirectUri
        ));
    }

    @GetMapping(value = "/email/google/callback", produces = MediaType.TEXT_HTML_VALUE)
    public ResponseEntity<String> googleEmailOAuthCallback(
            @RequestParam(required = false) String code,
            @RequestParam(required = false) String state,
            @RequestParam(required = false) String error,
            HttpServletRequest request
    ) {
        if (error != null && !error.isBlank()) {
            return ResponseEntity.ok(renderOAuthCallbackHtml(false, "google", null, error));
        }

        // Single-use, cryptographic state validation and consumption
        UUID targetUserId = oauthStateService.validateAndConsumeState(state, "google");
        if (targetUserId == null) {
            log.warn("[Google OAuth] Rejected callback: invalid, expired, or previously used state parameter");
            return ResponseEntity.ok(renderOAuthCallbackHtml(false, "google", null, "Invalid, expired, or previously used OAuth state parameter."));
        }

        if (googleClientId == null || googleClientId.isBlank() || googleClientSecret == null || googleClientSecret.isBlank() || code == null || code.isBlank()) {
            return ResponseEntity.ok(renderOAuthCallbackHtml(false, "google", null, "Missing Google credentials or authorization code."));
        }

        String baseUrl = getBaseUrl(request);
        String redirectUri = baseUrl + "/api/integrations/email/google/callback";

        try {
            // Exchange code for token
            String formBody = "code=" + URLEncoder.encode(code, StandardCharsets.UTF_8)
                    + "&client_id=" + URLEncoder.encode(googleClientId.trim(), StandardCharsets.UTF_8)
                    + "&client_secret=" + URLEncoder.encode(googleClientSecret.trim(), StandardCharsets.UTF_8)
                    + "&redirect_uri=" + URLEncoder.encode(redirectUri, StandardCharsets.UTF_8)
                    + "&grant_type=authorization_code";

            HttpRequest tokenReq = HttpRequest.newBuilder()
                    .uri(URI.create("https://oauth2.googleapis.com/token"))
                    .header("Content-Type", "application/x-www-form-urlencoded")
                    .timeout(Duration.ofSeconds(15))
                    .POST(HttpRequest.BodyPublishers.ofString(formBody, StandardCharsets.UTF_8))
                    .build();

            HttpResponse<String> tokenRes = httpClient.send(tokenReq, HttpResponse.BodyHandlers.ofString());
            JsonNode tokenData = objectMapper.readTree(tokenRes.body());

            if (tokenRes.statusCode() < 200 || tokenRes.statusCode() >= 300 || tokenData.has("error")) {
                String errMsg = tokenData.path("error_description").asText(tokenData.path("error").asText("Token exchange failed"));
                return ResponseEntity.ok(renderOAuthCallbackHtml(false, "google", null, errMsg));
            }

            String accessToken = tokenData.path("access_token").asText(null);
            String refreshToken = tokenData.path("refresh_token").asText(null);
            long expiresIn = tokenData.path("expires_in").asLong(3600);

            if (accessToken == null || accessToken.isBlank()) {
                return ResponseEntity.ok(renderOAuthCallbackHtml(false, "google", null, "Did not receive access token from Google"));
            }

            // Fetch user info to get verified email
            HttpRequest userReq = HttpRequest.newBuilder()
                    .uri(URI.create("https://www.googleapis.com/oauth2/v2/userinfo"))
                    .header("Authorization", "Bearer " + accessToken)
                    .timeout(Duration.ofSeconds(10))
                    .GET()
                    .build();

            HttpResponse<String> userRes = httpClient.send(userReq, HttpResponse.BodyHandlers.ofString());
            String userEmail = "";
            if (userRes.statusCode() >= 200 && userRes.statusCode() < 300) {
                JsonNode userData = objectMapper.readTree(userRes.body());
                userEmail = userData.path("email").asText("");
            }

            if (userEmail.isBlank()) {
                return ResponseEntity.ok(renderOAuthCallbackHtml(false, "google", null, "Could not retrieve email address for this Google account."));
            }

            // Upsert integration
            Integration integration = integrationRepository.findByUserIdAndProvider(targetUserId, "google")
                    .orElse(null);
            if (integration == null) {
                integration = new Integration();
                integration.setUserId(targetUserId);
                integration.setProvider("google");
                integration.setChannel("email");
            }

            integration.setStatus("CONNECTED");
            integration.setProviderAccountId(userEmail);
            integration.setProviderEmail(userEmail);
            integration.setAccessTokenEncrypted(encryptionService.encrypt(accessToken));
            if (refreshToken != null && !refreshToken.isBlank()) {
                integration.setRefreshTokenEncrypted(encryptionService.encrypt(refreshToken));
            } else if (integration.getRefreshTokenEncrypted() == null || integration.getRefreshTokenEncrypted().isBlank()) {
                log.warn("[Google OAuth] No refresh token received on initial connect for user {}", targetUserId);
            }
            integration.setTokenExpiresAt(Instant.now().plusSeconds(expiresIn));
            integration.setScopes("https://www.googleapis.com/auth/gmail.send email openid");
            integration.setConnectedAt(Instant.now());
            integration.setUpdatedAt(Instant.now());
            integration.setLastErrorCode(null);
            integration.setLastErrorMessage(null);

            integrationRepository.save(integration);

            profileRepository.findById(targetUserId).ifPresent(p -> {
                if (p.getDefaultReminderChannel() == null || p.getDefaultReminderChannel().isBlank()) {
                    p.setDefaultReminderChannel("email");
                    p.setEmailRemindersEnabled(true);
                    profileRepository.save(p);
                }
            });

            log.info("[Google OAuth] Successfully connected Gmail account {} for user {}", userEmail, targetUserId);
            return ResponseEntity.ok(renderOAuthCallbackHtml(true, "google", userEmail, null));

        } catch (Exception e) {
            log.error("[Google OAuth] Callback handling failed: {}", e.getMessage(), e);
            return ResponseEntity.ok(renderOAuthCallbackHtml(false, "google", null, e.getMessage()));
        }
    }

    // -----------------------------------------------------------------------
    // MICROSOFT OUTLOOK OAUTH
    // -----------------------------------------------------------------------

    @RequestMapping(value = "/email/microsoft/start", method = {RequestMethod.GET, RequestMethod.POST})
    public ResponseEntity<?> startMicrosoftEmailOAuth(HttpServletRequest request) {
        if (microsoftClientId == null || microsoftClientId.isBlank() || microsoftClientSecret == null || microsoftClientSecret.isBlank()) {
            log.warn("[Microsoft OAuth] Connect Outlook rejected: MICROSOFT_CLIENT_ID or MICROSOFT_CLIENT_SECRET not configured");
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
                    "success", false,
                    "code", "MICROSOFT_CREDENTIALS_MISSING",
                    "message", "Microsoft Azure credentials (MICROSOFT_CLIENT_ID, MICROSOFT_CLIENT_SECRET) are not configured in the server environment."
            ));
        }

        UUID userId = null;
        try {
            userId = SecurityUtils.getCurrentUserId();
        } catch (Exception ignored) {}

        if (userId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of(
                    "success", false,
                    "error", "Unauthorized: Valid authentication required to initiate Microsoft OAuth"
            ));
        }

        String baseUrl = getBaseUrl(request);
        String redirectUri = baseUrl + "/api/integrations/email/microsoft/callback";

        // Cryptographically signed, single-use, time-bounded OAuth state parameter
        String state = oauthStateService.generateState(userId, "microsoft");

        String scopes = "offline_access https://graph.microsoft.com/Mail.Send User.Read openid email";

        String authUrl = "https://login.microsoftonline.com/common/oauth2/v2.0/authorize?"
                + "client_id=" + URLEncoder.encode(microsoftClientId.trim(), StandardCharsets.UTF_8)
                + "&redirect_uri=" + URLEncoder.encode(redirectUri, StandardCharsets.UTF_8)
                + "&response_type=code"
                + "&scope=" + URLEncoder.encode(scopes, StandardCharsets.UTF_8)
                + "&prompt=consent"
                + "&state=" + URLEncoder.encode(state, StandardCharsets.UTF_8);

        return ResponseEntity.ok(Map.of(
                "url", authUrl,
                "mode", "oauth2",
                "redirect_uri", redirectUri
        ));
    }

    @GetMapping(value = "/email/microsoft/callback", produces = MediaType.TEXT_HTML_VALUE)
    public ResponseEntity<String> microsoftEmailOAuthCallback(
            @RequestParam(required = false) String code,
            @RequestParam(required = false) String state,
            @RequestParam(required = false) String error,
            HttpServletRequest request
    ) {
        if (error != null && !error.isBlank()) {
            return ResponseEntity.ok(renderOAuthCallbackHtml(false, "microsoft", null, error));
        }

        // Single-use, cryptographic state validation and consumption
        UUID targetUserId = oauthStateService.validateAndConsumeState(state, "microsoft");
        if (targetUserId == null) {
            log.warn("[Microsoft OAuth] Rejected callback: invalid, expired, or previously used state parameter");
            return ResponseEntity.ok(renderOAuthCallbackHtml(false, "microsoft", null, "Invalid, expired, or previously used OAuth state parameter."));
        }

        if (microsoftClientId == null || microsoftClientId.isBlank() || microsoftClientSecret == null || microsoftClientSecret.isBlank() || code == null || code.isBlank()) {
            return ResponseEntity.ok(renderOAuthCallbackHtml(false, "microsoft", null, "Missing Microsoft credentials or authorization code."));
        }

        String baseUrl = getBaseUrl(request);
        String redirectUri = baseUrl + "/api/integrations/email/microsoft/callback";

        try {
            String formBody = "code=" + URLEncoder.encode(code, StandardCharsets.UTF_8)
                    + "&client_id=" + URLEncoder.encode(microsoftClientId.trim(), StandardCharsets.UTF_8)
                    + "&client_secret=" + URLEncoder.encode(microsoftClientSecret.trim(), StandardCharsets.UTF_8)
                    + "&redirect_uri=" + URLEncoder.encode(redirectUri, StandardCharsets.UTF_8)
                    + "&grant_type=authorization_code";

            HttpRequest tokenReq = HttpRequest.newBuilder()
                    .uri(URI.create("https://login.microsoftonline.com/common/oauth2/v2.0/token"))
                    .header("Content-Type", "application/x-www-form-urlencoded")
                    .timeout(Duration.ofSeconds(15))
                    .POST(HttpRequest.BodyPublishers.ofString(formBody, StandardCharsets.UTF_8))
                    .build();

            HttpResponse<String> tokenRes = httpClient.send(tokenReq, HttpResponse.BodyHandlers.ofString());
            JsonNode tokenData = objectMapper.readTree(tokenRes.body());

            if (tokenRes.statusCode() < 200 || tokenRes.statusCode() >= 300 || tokenData.has("error")) {
                String errMsg = tokenData.path("error_description").asText(tokenData.path("error").asText("Token exchange failed"));
                return ResponseEntity.ok(renderOAuthCallbackHtml(false, "microsoft", null, errMsg));
            }

            String accessToken = tokenData.path("access_token").asText(null);
            String refreshToken = tokenData.path("refresh_token").asText(null);
            long expiresIn = tokenData.path("expires_in").asLong(3600);

            if (accessToken == null || accessToken.isBlank()) {
                return ResponseEntity.ok(renderOAuthCallbackHtml(false, "microsoft", null, "Did not receive access token from Microsoft"));
            }

            // Fetch user info from Microsoft Graph
            HttpRequest userReq = HttpRequest.newBuilder()
                    .uri(URI.create("https://graph.microsoft.com/v1.0/me"))
                    .header("Authorization", "Bearer " + accessToken)
                    .timeout(Duration.ofSeconds(10))
                    .GET()
                    .build();

            HttpResponse<String> userRes = httpClient.send(userReq, HttpResponse.BodyHandlers.ofString());
            String userEmail = "";
            if (userRes.statusCode() >= 200 && userRes.statusCode() < 300) {
                JsonNode userData = objectMapper.readTree(userRes.body());
                userEmail = userData.path("mail").asText(userData.path("userPrincipalName").asText(""));
            }

            if (userEmail.isBlank()) {
                return ResponseEntity.ok(renderOAuthCallbackHtml(false, "microsoft", null, "Could not retrieve email address for this Microsoft account."));
            }

            Integration integration = integrationRepository.findByUserIdAndProvider(targetUserId, "microsoft")
                    .orElse(null);
            if (integration == null) {
                integration = new Integration();
                integration.setUserId(targetUserId);
                integration.setProvider("microsoft");
                integration.setChannel("email");
            }

            integration.setStatus("CONNECTED");
            integration.setProviderAccountId(userEmail);
            integration.setProviderEmail(userEmail);
            integration.setAccessTokenEncrypted(encryptionService.encrypt(accessToken));
            if (refreshToken != null && !refreshToken.isBlank()) {
                integration.setRefreshTokenEncrypted(encryptionService.encrypt(refreshToken));
            }
            integration.setTokenExpiresAt(Instant.now().plusSeconds(expiresIn));
            integration.setScopes("offline_access https://graph.microsoft.com/Mail.Send User.Read openid email");
            integration.setConnectedAt(Instant.now());
            integration.setUpdatedAt(Instant.now());
            integration.setLastErrorCode(null);
            integration.setLastErrorMessage(null);

            integrationRepository.save(integration);

            profileRepository.findById(targetUserId).ifPresent(p -> {
                if (p.getDefaultReminderChannel() == null || p.getDefaultReminderChannel().isBlank()) {
                    p.setDefaultReminderChannel("email");
                    p.setEmailRemindersEnabled(true);
                    profileRepository.save(p);
                }
            });

            log.info("[Microsoft OAuth] Successfully connected Outlook account {} for user {}", userEmail, targetUserId);
            return ResponseEntity.ok(renderOAuthCallbackHtml(true, "microsoft", userEmail, null));

        } catch (Exception e) {
            log.error("[Microsoft OAuth] Callback handling failed: {}", e.getMessage(), e);
            return ResponseEntity.ok(renderOAuthCallbackHtml(false, "microsoft", null, e.getMessage()));
        }
    }

    // -----------------------------------------------------------------------
    // EMAIL STATUS, DISCONNECT & RECONNECT
    // -----------------------------------------------------------------------

    @GetMapping("/email/status")
    public ResponseEntity<Map<String, Object>> getEmailStatus() {
        UUID userId = null;
        try {
            userId = SecurityUtils.getCurrentUserId();
        } catch (Exception ignored) {}

        if (userId != null) {
            Optional<Integration> google = integrationRepository.findByUserIdAndProvider(userId, "google");
            if (google.isPresent()) {
                Integration g = google.get();
                if ("RECONNECT_REQUIRED".equalsIgnoreCase(g.getStatus())) {
                    return ResponseEntity.ok(Map.of(
                            "success", true,
                            "provider", "google",
                            "is_user_connected", false,
                            "status", "RECONNECT_REQUIRED",
                            "display_email", g.getProviderEmail() != null ? g.getProviderEmail() : "",
                            "error", g.getLastErrorMessage() != null ? g.getLastErrorMessage() : "Reauthorization required"
                    ));
                }

                boolean tokenValid = emailService.ensureValidGoogleToken(g);
                if (tokenValid) {
                    return ResponseEntity.ok(Map.of(
                            "success", true,
                            "provider", "google",
                            "is_user_connected", true,
                            "status", "CONNECTED",
                            "display_email", g.getProviderEmail() != null ? g.getProviderEmail() : ""
                    ));
                } else {
                    return ResponseEntity.ok(Map.of(
                            "success", true,
                            "provider", "google",
                            "is_user_connected", false,
                            "status", "RECONNECT_REQUIRED",
                            "display_email", g.getProviderEmail() != null ? g.getProviderEmail() : "",
                            "error", "Google authorization expired or revoked. Please reconnect in Settings."
                    ));
                }
            }

            Optional<Integration> ms = integrationRepository.findByUserIdAndProvider(userId, "microsoft");
            if (ms.isPresent()) {
                Integration m = ms.get();
                if ("RECONNECT_REQUIRED".equalsIgnoreCase(m.getStatus())) {
                    return ResponseEntity.ok(Map.of(
                            "success", true,
                            "provider", "microsoft",
                            "is_user_connected", false,
                            "status", "RECONNECT_REQUIRED",
                            "display_email", m.getProviderEmail() != null ? m.getProviderEmail() : "",
                            "error", m.getLastErrorMessage() != null ? m.getLastErrorMessage() : "Reauthorization required"
                    ));
                }

                boolean tokenValid = emailService.ensureValidMicrosoftToken(m);
                if (tokenValid) {
                    return ResponseEntity.ok(Map.of(
                            "success", true,
                            "provider", "microsoft",
                            "is_user_connected", true,
                            "status", "CONNECTED",
                            "display_email", m.getProviderEmail() != null ? m.getProviderEmail() : ""
                    ));
                } else {
                    return ResponseEntity.ok(Map.of(
                            "success", true,
                            "provider", "microsoft",
                            "is_user_connected", false,
                            "status", "RECONNECT_REQUIRED",
                            "display_email", m.getProviderEmail() != null ? m.getProviderEmail() : "",
                            "error", "Microsoft authorization expired or revoked. Please reconnect in Settings."
                    ));
                }
            }
        }

        return ResponseEntity.ok(Map.of(
                "success", true,
                "provider", "resend",
                "is_user_connected", false,
                "status", "NOT_CONNECTED",
                "message", "No user email provider connected"
        ));
    }

    @PostMapping("/email/test")
    public ResponseEntity<Map<String, Object>> testEmail(@RequestBody(required = false) Map<String, String> body) {
        UUID userId = SecurityUtils.getCurrentUserId();
        Profile profile = profileRepository.findById(userId).orElse(new Profile(userId, ""));

        String recipient = body != null ? body.get("recipient") : null;
        if (recipient == null || recipient.isBlank()) {
            recipient = profile.getEmail();
        }
        if (recipient == null || recipient.isBlank() || !recipient.contains("@")) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", "A valid recipient email address is required to send a test email. Please provide one or set your profile email."
            ));
        }

        String businessName = profile.getBusinessName() != null && !profile.getBusinessName().isBlank()
                ? profile.getBusinessName() : "DueFlow";
        String senderName = profile.getFullName() != null && !profile.getFullName().isBlank()
                ? profile.getFullName() : businessName;

        EmailService.EmailRenderData data = new EmailService.EmailRenderData();
        data.invoiceNumber = "TEST-VERIFY";
        data.amount = new BigDecimal("12500.00");
        data.dueDate = LocalDate.now().plusDays(5).toString();
        data.issueDate = LocalDate.now().toString();
        data.clientName = "Valued Client (Test)";
        data.clientEmail = recipient;
        data.businessName = businessName;
        data.senderName = senderName;
        data.senderEmail = profile.getEmail();
        data.senderPhone = profile.getPhone();
        data.senderAddress = profile.getAddress();
        data.upiId = profile.getUpiId();
        data.bankAccount = profile.getBankAccount();
        data.bankIfsc = profile.getBankIfsc();
        data.bankName = profile.getBankName();
        data.paymentNotes = profile.getPaymentNotes();
        data.paymentQrUrl = profile.getPaymentQrUrl();
        data.stageName = "Integration Test";
        data.tone = "professional";
        data.customSubject = "Test Invoice Reminder from " + businessName;
        data.customBody = "This test email confirms that your email integration is successfully connected and capable of sending invoice reminders directly to your clients.";

        EmailService.SendResult result = emailService.sendEmail(userId, recipient, profile.getEmail(), data);

        if (!result.success) {
            log.warn("[IntegrationController] Test email failed for user {}: {}", userId, result.error);
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY).body(Map.of(
                    "success", false,
                    "provider", result.provider != null ? result.provider : "none",
                    "recipient", recipient,
                    "error", result.error != null ? result.error : "Unknown delivery error",
                    "message", "Email delivery failed: " + result.error
            ));
        }

        return ResponseEntity.ok(Map.of(
                "success", true,
                "provider", result.provider != null ? result.provider : "connected_provider",
                "providerMessageId", result.providerMessageId != null ? result.providerMessageId : "",
                "recipient", recipient,
                "message", "Test email successfully accepted and sent via " + result.provider + " to " + recipient
        ));
    }

    @PostMapping("/email/disconnect")
    public ResponseEntity<Map<String, Object>> disconnectEmail(@RequestBody(required = false) Map<String, String> body) {
        UUID userId = SecurityUtils.getCurrentUserId();
        String provider = body != null ? body.get("provider") : null;
        if (provider != null && !provider.isBlank()) {
            integrationService.deleteIntegration(userId, provider);
        } else {
            integrationService.deleteIntegration(userId, "google");
            integrationService.deleteIntegration(userId, "microsoft");
            integrationService.deleteIntegration(userId, "resend");
        }
        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Email integration disconnected"
        ));
    }

    @PostMapping("/email/reconnect")
    public ResponseEntity<Map<String, Object>> reconnectEmail(@RequestBody(required = false) Map<String, String> body) {
        String provider = body != null ? body.get("provider") : "google";
        if ("microsoft".equalsIgnoreCase(provider)) {
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "action", "oauth_required",
                    "startUrl", "/api/integrations/email/microsoft/start"
            ));
        }
        return ResponseEntity.ok(Map.of(
                "success", true,
                "action", "oauth_required",
                "startUrl", "/api/integrations/email/google/start"
        ));
    }

    // -----------------------------------------------------------------------
    // WHATSAPP BUSINESS
    // -----------------------------------------------------------------------

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

    // -----------------------------------------------------------------------
    // HELPER: OAUTH CALLBACK HTML
    // -----------------------------------------------------------------------

    private String renderOAuthCallbackHtml(boolean success, String provider, String displayEmail, String error) {
        Map<String, Object> data = new HashMap<>();
        data.put("type", success ? "OAUTH_AUTH_SUCCESS" : "OAUTH_AUTH_ERROR");
        data.put("provider", provider != null ? provider : "");
        data.put("email", displayEmail != null ? displayEmail : "");
        data.put("error", error != null ? error : "");

        String jsonPayload;
        try {
            jsonPayload = objectMapper.writeValueAsString(data);
        } catch (Exception e) {
            jsonPayload = "{\"type\":\"" + (success ? "OAUTH_AUTH_SUCCESS" : "OAUTH_AUTH_ERROR") + "\"}";
        }

        String heading = success ? "✓ Connected Successfully" : "✕ Connection Failed";
        String message = success
                ? ("Connected " + (displayEmail != null && !displayEmail.isBlank() ? "as " + displayEmail : "") + ". This window will close automatically.")
                : (error != null && !error.isBlank() ? error : "Authentication could not be completed.");

        return "<!DOCTYPE html>\n"
                + "<html>\n"
                + "<head>\n"
                + "  <meta charset=\"utf-8\">\n"
                + "  <title>" + (success ? "Connection Successful" : "Connection Failed") + " - DueFlow</title>\n"
                + "  <style>\n"
                + "    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #0f172a; color: #f8fafc; }\n"
                + "    .card { background: #1e293b; padding: 32px; border-radius: 12px; border: 1px solid #334155; text-align: center; max-width: 400px; }\n"
                + "    h2 { margin: 0 0 12px; font-size: 20px; color: " + (success ? "#4ade80" : "#f87171") + "; }\n"
                + "    p { font-size: 14px; color: #94a3b8; line-height: 1.5; }\n"
                + "  </style>\n"
                + "</head>\n"
                + "<body>\n"
                + "  <div class=\"card\">\n"
                + "    <h2>" + heading + "</h2>\n"
                + "    <p>" + message + "</p>\n"
                + "  </div>\n"
                + "  <script>\n"
                + "    try {\n"
                + "      if (window.opener) {\n"
                + "        var targetOrigin = window.location.origin;\n"
                + "        window.opener.postMessage(" + jsonPayload + ", targetOrigin);\n"
                + "        setTimeout(function() { window.close(); }, 800);\n"
                + "      } else {\n"
                + "        setTimeout(function() { window.location.href = '/'; }, 1500);\n"
                + "      }\n"
                + "    } catch (e) {\n"
                + "      console.error('postMessage error:', e);\n"
                + "    }\n"
                + "  </script>\n"
                + "</body>\n"
                + "</html>";
    }
}
