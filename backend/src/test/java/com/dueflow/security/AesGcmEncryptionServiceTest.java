package com.dueflow.security;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class AesGcmEncryptionServiceTest {

    private AesGcmEncryptionService encryptionService;

    @BeforeEach
    void setUp() {
        // 64-char hex key (256 bits)
        String hexKey = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
        encryptionService = new AesGcmEncryptionService(hexKey);
    }

    @Test
    void testEncryptAndDecrypt() {
        String plainText = "1//04_google_refresh_token_example_secret_abc123";
        String encrypted = encryptionService.encrypt(plainText);

        assertNotNull(encrypted);
        assertNotEquals(plainText, encrypted);

        String decrypted = encryptionService.decrypt(encrypted);
        assertEquals(plainText, decrypted);
    }

    @Test
    void testNullOrBlankHandling() {
        assertNull(encryptionService.encrypt(null));
        assertNull(encryptionService.decrypt(null));
        assertNull(encryptionService.encrypt(""));
        assertNull(encryptionService.decrypt(""));
    }

    @Test
    void testUniqueCiphertextPerEncryption() {
        String plainText = "same_secret_token";
        String enc1 = encryptionService.encrypt(plainText);
        String enc2 = encryptionService.encrypt(plainText);

        // Different IVs should produce different ciphertext
        assertNotEquals(enc1, enc2);

        // But both should decrypt back to the original plaintext
        assertEquals(plainText, encryptionService.decrypt(enc1));
        assertEquals(plainText, encryptionService.decrypt(enc2));
    }
}
