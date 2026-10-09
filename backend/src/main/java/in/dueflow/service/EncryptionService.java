package in.dueflow.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Cipher;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Base64;

/**
 * Production-ready AES-256-GCM authenticated encryption service.
 * Transparently encrypts sensitive OAuth tokens before storing them in the database,
 * and decrypts them on retrieval.
 * Provides backward-compatible passthrough for any pre-existing unencrypted legacy tokens.
 */
@Service
public class EncryptionService {

    private static final Logger log = LoggerFactory.getLogger(EncryptionService.class);
    private static final String PREFIX = "enc:v1:";
    private static final int GCM_IV_LENGTH = 12;
    private static final int GCM_TAG_LENGTH = 128;

    private final SecretKey secretKey;
    private final SecureRandom secureRandom = new SecureRandom();

    public EncryptionService(
            @Value("${ENCRYPTION_KEY:}") String encryptionKey,
            @Value("${SUPABASE_SECRET_KEY:}") String supabaseSecret,
            @Value("${CRON_SECRET:dueflow_prod_encryption_secret_2026}") String cronSecret
    ) {
        String keySource = encryptionKey;
        if (keySource == null || keySource.isBlank()) {
            keySource = (supabaseSecret != null && !supabaseSecret.isBlank()) ? supabaseSecret : cronSecret;
        }

        try {
            MessageDigest sha = MessageDigest.getInstance("SHA-256");
            byte[] keyBytes = sha.digest(keySource.getBytes(StandardCharsets.UTF_8));
            this.secretKey = new SecretKeySpec(keyBytes, "AES");
        } catch (Exception e) {
            throw new IllegalStateException("Failed to initialize AES-256 key", e);
        }
    }

    /**
     * Encrypts plaintext string using AES-256-GCM.
     */
    public String encrypt(String plainText) {
        if (plainText == null || plainText.isBlank()) {
            return plainText;
        }
        if (plainText.startsWith(PREFIX)) {
            // Already encrypted
            return plainText;
        }

        try {
            byte[] iv = new byte[GCM_IV_LENGTH];
            secureRandom.nextBytes(iv);

            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.ENCRYPT_MODE, secretKey, new GCMParameterSpec(GCM_TAG_LENGTH, iv));

            byte[] cipherText = cipher.doFinal(plainText.getBytes(StandardCharsets.UTF_8));

            ByteBuffer byteBuffer = ByteBuffer.allocate(iv.length + cipherText.length);
            byteBuffer.put(iv);
            byteBuffer.put(cipherText);

            String encoded = Base64.getUrlEncoder().withoutPadding().encodeToString(byteBuffer.array());
            return PREFIX + encoded;
        } catch (Exception e) {
            log.error("[EncryptionService] Encryption failure: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to encrypt sensitive token", e);
        }
    }

    /**
     * Decrypts ciphertext string. If not prefixed with "enc:v1:", returns the string as-is (legacy compatibility).
     */
    public String decrypt(String cipherText) {
        if (cipherText == null || cipherText.isBlank()) {
            return cipherText;
        }
        if (!cipherText.startsWith(PREFIX)) {
            // Plaintext fallback for backward compatibility
            return cipherText;
        }

        try {
            String payload = cipherText.substring(PREFIX.length());
            byte[] decoded = Base64.getUrlDecoder().decode(payload);

            ByteBuffer byteBuffer = ByteBuffer.wrap(decoded);
            byte[] iv = new byte[GCM_IV_LENGTH];
            byteBuffer.get(iv);

            byte[] encrypted = new byte[byteBuffer.remaining()];
            byteBuffer.get(encrypted);

            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.DECRYPT_MODE, secretKey, new GCMParameterSpec(GCM_TAG_LENGTH, iv));

            byte[] decrypted = cipher.doFinal(encrypted);
            return new String(decrypted, StandardCharsets.UTF_8);
        } catch (Exception e) {
            log.error("[EncryptionService] Decryption failure: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to decrypt sensitive token", e);
        }
    }
}
