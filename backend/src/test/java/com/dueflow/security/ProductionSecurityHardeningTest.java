package com.dueflow.security;

import com.dueflow.config.EnvironmentValidationConfig;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.core.env.Environment;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.test.util.ReflectionTestUtils;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class ProductionSecurityHardeningTest {

    @Test
    @DisplayName("RateLimitingFilter blocks requests exceeding limit with HTTP 429")
    void testRateLimitingFilterBlocksExcessiveRequests() throws Exception {
        RateLimitingFilter filter = new RateLimitingFilter();

        for (int i = 0; i < 30; i++) {
            MockHttpServletRequest req = new MockHttpServletRequest("GET", "/api/integrations/gmail/oauth/url");
            req.setRemoteAddr("192.168.1.100");
            MockHttpServletResponse res = new MockHttpServletResponse();
            MockFilterChain chain = new MockFilterChain();

            filter.doFilter(req, res, chain);
            assertEquals(200, res.getStatus());
        }

        // 31st request should be rejected with 429 Too Many Requests
        MockHttpServletRequest req = new MockHttpServletRequest("GET", "/api/integrations/gmail/oauth/url");
        req.setRemoteAddr("192.168.1.100");
        MockHttpServletResponse res = new MockHttpServletResponse();
        MockFilterChain chain = new MockFilterChain();

        filter.doFilter(req, res, chain);
        assertEquals(429, res.getStatus());
        assertTrue(res.getContentAsString().contains("Too Many Requests"));
    }

    @Test
    @DisplayName("Production validation fails closed if mandatory SUPABASE_URL is missing")
    void testProductionValidationFailsOnMissingSupabaseUrl() {
        Environment env = mock(Environment.class);
        when(env.getActiveProfiles()).thenReturn(new String[]{"prod"});

        EnvironmentValidationConfig validator = new EnvironmentValidationConfig(env);
        ReflectionTestUtils.setField(validator, "supabaseUrl", "");
        ReflectionTestUtils.setField(validator, "encryptionKey", "valid-key-with-more-than-32-chars-long-1234");
        ReflectionTestUtils.setField(validator, "datasourceUrl", "jdbc:postgresql://db.supabase.co:5432/postgres");

        IllegalStateException ex = assertThrows(IllegalStateException.class, validator::validateConfiguration);
        assertTrue(ex.getMessage().contains("SUPABASE_URL"));
    }

    @Test
    @DisplayName("Production validation fails closed if weak default encryption key is used")
    void testProductionValidationFailsOnWeakDefaultKey() {
        Environment env = mock(Environment.class);
        when(env.getActiveProfiles()).thenReturn(new String[]{"prod"});

        EnvironmentValidationConfig validator = new EnvironmentValidationConfig(env);
        ReflectionTestUtils.setField(validator, "supabaseUrl", "https://valid.supabase.co");
        ReflectionTestUtils.setField(validator, "encryptionKey", "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef");
        ReflectionTestUtils.setField(validator, "datasourceUrl", "jdbc:postgresql://db.supabase.co:5432/postgres");

        IllegalStateException ex = assertThrows(IllegalStateException.class, validator::validateConfiguration);
        assertTrue(ex.getMessage().contains("GMAIL_TOKEN_ENCRYPTION_KEY") || ex.getMessage().contains("default sample key"));
    }

    @Test
    @DisplayName("AES-GCM encryption generates unique IVs for identical plaintext")
    void testAesGcmUniqueIvs() {
        AesGcmEncryptionService service = new AesGcmEncryptionService("my-super-secret-encryption-key-for-test-12345");
        String secret = "secret_refresh_token_12345";

        String ciphertext1 = service.encrypt(secret);
        String ciphertext2 = service.encrypt(secret);

        assertNotEquals(ciphertext1, ciphertext2, "Ciphertexts must differ due to random IVs");
        assertEquals(secret, service.decrypt(ciphertext1));
        assertEquals(secret, service.decrypt(ciphertext2));
    }
}
