package in.dueflow.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.Base64;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Production cryptographic single-use OAuth state generator and validator.
 * Binds user ID, provider, expiry timestamp, and a cryptographically random nonce.
 * Signed with HMAC-SHA256 to prevent CSRF, injection, and replay attacks.
 */
@Service
public class OAuthStateService {

    private static final Logger log = LoggerFactory.getLogger(OAuthStateService.class);
    private static final long STATE_VALIDITY_SECONDS = 600; // 10 minutes

    private final SecureRandom secureRandom = new SecureRandom();
    private final String signingSecret;

    // In-memory single-use nonce registry to guarantee single-use consumption
    private final Map<String, StateRecord> activeStates = new ConcurrentHashMap<>();

    public static class StateRecord {
        public final UUID userId;
        public final String provider;
        public final Instant expiresAt;

        public StateRecord(UUID userId, String provider, Instant expiresAt) {
            this.userId = userId;
            this.provider = provider;
            this.expiresAt = expiresAt;
        }
    }

    public OAuthStateService(
            @Value("${CRON_SECRET:dueflow_oauth_hmac_secret_key_2026}") String cronSecret,
            @Value("${SUPABASE_SECRET_KEY:}") String supabaseSecret
    ) {
        if (supabaseSecret != null && !supabaseSecret.isBlank()) {
            this.signingSecret = supabaseSecret.trim();
        } else {
            this.signingSecret = cronSecret.trim();
        }
    }

    /**
     * Generates a signed, single-use, time-bounded OAuth state parameter.
     */
    public String generateState(UUID userId, String provider) {
        purgeExpiredStates();

        byte[] nonceBytes = new byte[16];
        secureRandom.nextBytes(nonceBytes);
        String nonce = Base64.getUrlEncoder().withoutPadding().encodeToString(nonceBytes);

        Instant expiresAt = Instant.now().plusSeconds(STATE_VALIDITY_SECONDS);
        long epochSecond = expiresAt.getEpochSecond();

        String payload = userId.toString() + ":" + provider.toLowerCase() + ":" + epochSecond + ":" + nonce;
        String signature = computeHmac(payload);

        String fullState = payload + ":" + signature;
        String encodedState = Base64.getUrlEncoder().withoutPadding().encodeToString(fullState.getBytes(StandardCharsets.UTF_8));

        activeStates.put(nonce, new StateRecord(userId, provider.toLowerCase(), expiresAt));
        log.debug("[OAuthState] Generated state for user {}, provider {}, nonce {}", userId, provider, nonce);

        return encodedState;
    }

    /**
     * Validates and single-use consumes the incoming OAuth state parameter.
     * Returns the verified UUID of the initiating user, or null if invalid/expired/replayed.
     */
    public UUID validateAndConsumeState(String rawState, String expectedProvider) {
        if (rawState == null || rawState.isBlank()) {
            log.warn("[OAuthState] Empty state parameter received");
            return null;
        }

        try {
            byte[] decodedBytes = Base64.getUrlDecoder().decode(rawState.trim());
            String fullState = new String(decodedBytes, StandardCharsets.UTF_8);
            String[] parts = fullState.split(":");

            if (parts.length != 5) {
                log.warn("[OAuthState] Malformed state payload structure");
                return null;
            }

            String userIdStr = parts[0];
            String provider = parts[1];
            long epochSecond = Long.parseLong(parts[2]);
            String nonce = parts[3];
            String receivedSignature = parts[4];

            // 1. Verify expected provider
            if (!provider.equalsIgnoreCase(expectedProvider)) {
                log.warn("[OAuthState] Provider mismatch: expected {} but got {}", expectedProvider, provider);
                return null;
            }

            // 2. Verify HMAC signature
            String payload = userIdStr + ":" + provider + ":" + epochSecond + ":" + nonce;
            String expectedSignature = computeHmac(payload);
            if (!constantTimeEquals(receivedSignature, expectedSignature)) {
                log.warn("[OAuthState] HMAC signature verification failed");
                return null;
            }

            // 3. Verify timestamp expiry
            Instant expiresAt = Instant.ofEpochSecond(epochSecond);
            if (Instant.now().isAfter(expiresAt)) {
                log.warn("[OAuthState] State expired at {}", expiresAt);
                activeStates.remove(nonce);
                return null;
            }

            // 4. Verify single-use nonce existence and remove immediately
            StateRecord record = activeStates.remove(nonce);
            if (record == null) {
                log.warn("[OAuthState] Nonce {} already used or not found (replay attempt rejected)", nonce);
                return null;
            }

            if (!record.userId.toString().equalsIgnoreCase(userIdStr)) {
                log.warn("[OAuthState] User ID mismatch against record for nonce {}", nonce);
                return null;
            }

            log.info("[OAuthState] Verified and consumed state for user {}, provider {}", userIdStr, provider);
            return record.userId;

        } catch (Exception e) {
            log.warn("[OAuthState] Exception decoding/validating state: {}", e.getMessage());
            return null;
        }
    }

    private String computeHmac(String data) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            SecretKeySpec secretKey = new SecretKeySpec(signingSecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
            mac.init(secretKey);
            byte[] rawHmac = mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
            return Base64.getUrlEncoder().withoutPadding().encodeToString(rawHmac);
        } catch (Exception e) {
            throw new RuntimeException("HMAC computation failure", e);
        }
    }

    private boolean constantTimeEquals(String a, String b) {
        if (a == null || b == null) return false;
        byte[] aBytes = a.getBytes(StandardCharsets.UTF_8);
        byte[] bBytes = b.getBytes(StandardCharsets.UTF_8);
        return java.security.MessageDigest.isEqual(aBytes, bBytes);
    }

    private void purgeExpiredStates() {
        Instant now = Instant.now();
        activeStates.entrySet().removeIf(entry -> now.isAfter(entry.getValue().expiresAt));
    }
}
