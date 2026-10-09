package in.dueflow;

import in.dueflow.service.EncryptionService;
import in.dueflow.service.OAuthStateService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

public class OAuthStateAndEncryptionTest {

    private OAuthStateService oAuthStateService;
    private EncryptionService encryptionService;

    @BeforeEach
    void setUp() {
        oAuthStateService = new OAuthStateService("test-cron-secret-key-for-hmac", "test-supabase-secret-key-32-bytes");
        encryptionService = new EncryptionService("test-aes-key-for-gcm-encryption-12345", "", "test-cron-secret");
    }

    @Test
    void testOAuthStateGenerationAndSingleUseValidation() {
        UUID userId = UUID.randomUUID();
        String state = oAuthStateService.generateState(userId, "google");

        assertNotNull(state);
        assertTrue(state.length() > 20);

        // First validation should succeed and return the correct userId
        UUID validatedUserId = oAuthStateService.validateAndConsumeState(state, "google");
        assertNotNull(validatedUserId);
        assertEquals(userId, validatedUserId);

        // Replay attack / second use MUST fail
        UUID replayed = oAuthStateService.validateAndConsumeState(state, "google");
        assertNull(replayed, "Replayed state must be rejected on second use");
    }

    @Test
    void testOAuthStateTamperingRejected() {
        UUID userId = UUID.randomUUID();
        String state = oAuthStateService.generateState(userId, "google");

        // Tamper with state string
        String tamperedState = state.substring(0, state.length() - 4) + "XXXX";
        UUID payload = oAuthStateService.validateAndConsumeState(tamperedState, "google");
        assertNull(payload, "Tampered state signature must fail validation");
    }

    @Test
    void testOAuthStateProviderMismatchRejected() {
        UUID userId = UUID.randomUUID();
        String state = oAuthStateService.generateState(userId, "google");

        // Validate against wrong provider
        UUID payload = oAuthStateService.validateAndConsumeState(state, "microsoft");
        assertNull(payload, "State validated against wrong provider must fail");
    }

    @Test
    void testTokenEncryptionAndDecryptionAesGcm() {
        String sensitiveRefreshToken = "1//04Gj98bZ-example-google-refresh-token-value";

        String encrypted = encryptionService.encrypt(sensitiveRefreshToken);
        assertNotNull(encrypted);
        assertTrue(encrypted.startsWith("enc:v1:"), "Encrypted text must have versioned prefix");
        assertNotEquals(sensitiveRefreshToken, encrypted, "Ciphertext must not match plaintext");

        String decrypted = encryptionService.decrypt(encrypted);
        assertEquals(sensitiveRefreshToken, decrypted, "Decrypted text must match original plaintext");
    }

    @Test
    void testLegacyPlaintextFallback() {
        String legacyPlaintextToken = "legacy-unencrypted-refresh-token-xyz";

        // If stored token does not have enc:v1: prefix, decrypt should gracefully return it as-is
        String decrypted = encryptionService.decrypt(legacyPlaintextToken);
        assertEquals(legacyPlaintextToken, decrypted, "Legacy plaintext token must be returned safely without error");
    }

    @Test
    void testEncryptionHandlesNullAndEmpty() {
        assertNull(encryptionService.encrypt(null));
        assertEquals("", encryptionService.encrypt(""));
        assertNull(encryptionService.decrypt(null));
        assertEquals("", encryptionService.decrypt(""));
    }
}
