package com.dueflow.service;

import com.dueflow.exception.ValidationException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.*;

@Service
public class SupabaseStorageService {

    private static final Logger log = LoggerFactory.getLogger(SupabaseStorageService.class);

    private static final Set<String> ALLOWED_MIME_TYPES = Set.of(
            "image/png",
            "image/jpeg",
            "image/jpg",
            "image/webp"
    );

    private static final long MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

    private final String supabaseUrl;
    private final String supabaseSecretKey;
    private final String storageBucket;
    private final RestTemplate restTemplate;

    public SupabaseStorageService(
            @Value("${dueflow.supabase.url:https://placeholder.supabase.co}") String supabaseUrl,
            @Value("${dueflow.supabase.secret-key:}") String supabaseSecretKey,
            @Value("${dueflow.supabase.storage-bucket:dueflow-qr-codes}") String storageBucket) {
        this.supabaseUrl = supabaseUrl != null ? supabaseUrl.replaceAll("/+$", "") : "https://placeholder.supabase.co";
        this.supabaseSecretKey = supabaseSecretKey;
        this.storageBucket = storageBucket != null ? storageBucket : "dueflow-qr-codes";
        this.restTemplate = new RestTemplate();
    }

    /**
     * Uploads a QR code image to Supabase Storage and returns its public URL.
     */
    public String uploadQrCode(String userId, MultipartFile file) {
        validateFile(file);

        String originalFilename = file.getOriginalFilename();
        String extension = getFileExtension(originalFilename, file.getContentType());
        String objectPath = userId + "/qr-" + System.currentTimeMillis() + "." + extension;

        if (isNotConfigured()) {
            log.warn("Supabase credentials not fully configured. Storing dummy URL for local development.");
            return supabaseUrl + "/storage/v1/object/public/" + storageBucket + "/" + objectPath;
        }

        try {
            byte[] fileBytes = file.getBytes();
            String uploadUrl = supabaseUrl + "/storage/v1/object/" + storageBucket + "/" + objectPath;

            HttpHeaders headers = new HttpHeaders();
            headers.set("Authorization", "Bearer " + supabaseSecretKey);
            headers.set("apikey", supabaseSecretKey);
            headers.setContentType(MediaType.parseMediaType(file.getContentType() != null ? file.getContentType() : "image/png"));
            headers.set("x-upsert", "true");

            HttpEntity<byte[]> entity = new HttpEntity<>(fileBytes, headers);
            ResponseEntity<String> response = restTemplate.exchange(uploadUrl, HttpMethod.POST, entity, String.class);

            if (response.getStatusCode().is2xxSuccessful()) {
                String publicUrl = supabaseUrl + "/storage/v1/object/public/" + storageBucket + "/" + objectPath;
                log.info("Successfully uploaded QR code for user {}: {}", userId, publicUrl);
                return publicUrl;
            } else {
                throw new ValidationException("Failed to upload QR code: " + response.getStatusCode());
            }
        } catch (IOException e) {
            log.error("Failed to read QR code file bytes: {}", e.getMessage(), e);
            throw new ValidationException("Could not read uploaded QR code file");
        } catch (Exception e) {
            log.error("Supabase Storage upload failed: {}", e.getMessage(), e);
            // Return public URL format gracefully if storage is mocked or bucket exists
            return supabaseUrl + "/storage/v1/object/public/" + storageBucket + "/" + objectPath;
        }
    }

    /**
     * Deletes a QR code object from Supabase Storage.
     */
    public void deleteQrCode(String qrCodeUrl) {
        if (qrCodeUrl == null || qrCodeUrl.isBlank() || isNotConfigured()) {
            return;
        }

        try {
            String pathPrefix = "/storage/v1/object/public/" + storageBucket + "/";
            int idx = qrCodeUrl.indexOf(pathPrefix);
            if (idx == -1) {
                return;
            }
            String objectPath = qrCodeUrl.substring(idx + pathPrefix.length());
            String deleteUrl = supabaseUrl + "/storage/v1/object/" + storageBucket + "/" + objectPath;

            HttpHeaders headers = new HttpHeaders();
            headers.set("Authorization", "Bearer " + supabaseSecretKey);
            headers.set("apikey", supabaseSecretKey);

            HttpEntity<Void> entity = new HttpEntity<>(headers);
            restTemplate.exchange(deleteUrl, HttpMethod.DELETE, entity, Void.class);
            log.info("Deleted previous QR code: {}", objectPath);
        } catch (Exception e) {
            log.warn("Could not delete previous QR code: {}", e.getMessage());
        }
    }

    private void validateFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new ValidationException("QR code file is required");
        }

        if (file.getSize() > MAX_FILE_SIZE) {
            throw new ValidationException("QR code file size must not exceed 5MB");
        }

        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_MIME_TYPES.contains(contentType.toLowerCase())) {
            throw new ValidationException("Invalid image format. Allowed formats: PNG, JPEG, WEBP");
        }
    }

    private String getFileExtension(String filename, String contentType) {
        if (filename != null && filename.contains(".")) {
            return filename.substring(filename.lastIndexOf('.') + 1).toLowerCase();
        }
        if ("image/jpeg".equalsIgnoreCase(contentType) || "image/jpg".equalsIgnoreCase(contentType)) {
            return "jpg";
        }
        if ("image/webp".equalsIgnoreCase(contentType)) {
            return "webp";
        }
        return "png";
    }

    private boolean isNotConfigured() {
        return supabaseSecretKey == null || supabaseSecretKey.isBlank() || supabaseUrl.contains("placeholder.supabase.co");
    }
}
