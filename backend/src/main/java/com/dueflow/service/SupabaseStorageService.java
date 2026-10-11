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
     * Uploads a QR code image to Supabase Storage and returns its signed access URL.
     */
    public String uploadQrCode(String userId, MultipartFile file) {
        validateFile(file);

        byte[] fileBytes;
        try {
            fileBytes = file.getBytes();
        } catch (IOException e) {
            log.error("Failed to read QR code file bytes: {}", e.getMessage(), e);
            throw new ValidationException("Could not read uploaded QR code file");
        }

        String detectedMime = validateFileContent(fileBytes, file.getContentType());
        String originalFilename = file.getOriginalFilename();
        String extension = getFileExtension(originalFilename, detectedMime);
        String objectPath = userId + "/qr-" + System.currentTimeMillis() + "." + extension;

        if (isNotConfigured()) {
            log.warn("Supabase credentials not fully configured. Storing dummy URL for local development.");
            return supabaseUrl + "/storage/v1/object/public/" + storageBucket + "/" + objectPath;
        }

        ensureBucketExists();

        try {
            String uploadUrl = supabaseUrl + "/storage/v1/object/" + storageBucket + "/" + objectPath;

            HttpHeaders headers = new HttpHeaders();
            headers.set("Authorization", "Bearer " + supabaseSecretKey);
            headers.set("apikey", supabaseSecretKey);
            headers.setContentType(MediaType.parseMediaType(detectedMime));
            headers.set("x-upsert", "true");

            HttpEntity<byte[]> entity = new HttpEntity<>(fileBytes, headers);
            ResponseEntity<String> response = restTemplate.exchange(uploadUrl, HttpMethod.POST, entity, String.class);

            if (response.getStatusCode().is2xxSuccessful()) {
                String accessibleUrl = createSignedUrl(objectPath);
                log.info("Successfully uploaded QR code for user {}: {}", userId, accessibleUrl);
                return accessibleUrl;
            } else {
                throw new ValidationException("Failed to upload QR code: " + response.getStatusCode());
            }
        } catch (ValidationException ve) {
            throw ve;
        } catch (Exception e) {
            log.error("Supabase Storage upload failed: {}", e.getMessage(), e);
            throw new ValidationException("Failed to upload QR code to storage. Please try again.");
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
            String objectPath = extractObjectPath(qrCodeUrl);
            if (objectPath == null || objectPath.isBlank()) {
                return;
            }
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

    /**
     * Creates a signed URL for a private storage object with long-lived validity (10 years).
     */
    public String createSignedUrl(String objectPath) {
        if (isNotConfigured()) {
            return supabaseUrl + "/storage/v1/object/public/" + storageBucket + "/" + objectPath;
        }

        try {
            String signUrl = supabaseUrl + "/storage/v1/object/sign/" + storageBucket + "/" + objectPath;
            HttpHeaders headers = new HttpHeaders();
            headers.set("Authorization", "Bearer " + supabaseSecretKey);
            headers.set("apikey", supabaseSecretKey);
            headers.setContentType(MediaType.APPLICATION_JSON);

            // 10 years expiration = 315,360,000 seconds
            Map<String, Object> body = Map.of("expiresIn", 315360000);
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);

            ResponseEntity<Map> response = restTemplate.exchange(signUrl, HttpMethod.POST, entity, Map.class);
            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                Object signedPath = response.getBody().get("signedURL");
                if (signedPath != null) {
                    return supabaseUrl + "/storage/v1" + signedPath;
                }
            }
        } catch (Exception e) {
            log.warn("Failed to create signed URL for {}: {}", objectPath, e.getMessage());
        }
        return supabaseUrl + "/storage/v1/object/public/" + storageBucket + "/" + objectPath;
    }

    /**
     * Ensures the storage bucket exists in Supabase.
     */
    public void ensureBucketExists() {
        if (isNotConfigured()) return;
        try {
            String bucketUrl = supabaseUrl + "/storage/v1/bucket";
            HttpHeaders headers = new HttpHeaders();
            headers.set("Authorization", "Bearer " + supabaseSecretKey);
            headers.set("apikey", supabaseSecretKey);
            headers.setContentType(MediaType.APPLICATION_JSON);

            HttpEntity<Void> getEntity = new HttpEntity<>(headers);
            ResponseEntity<List> listResponse = restTemplate.exchange(bucketUrl, HttpMethod.GET, getEntity, List.class);
            boolean exists = false;
            if (listResponse.getStatusCode().is2xxSuccessful() && listResponse.getBody() != null) {
                for (Object item : listResponse.getBody()) {
                    if (item instanceof Map map && storageBucket.equals(map.get("name"))) {
                        exists = true;
                        break;
                    }
                }
            }

            if (!exists) {
                Map<String, Object> createBody = Map.of(
                        "id", storageBucket,
                        "name", storageBucket,
                        "public", false,
                        "file_size_limit", MAX_FILE_SIZE,
                        "allowed_mime_types", List.of("image/png", "image/jpeg", "image/webp")
                );
                HttpEntity<Map<String, Object>> postEntity = new HttpEntity<>(createBody, headers);
                restTemplate.exchange(bucketUrl, HttpMethod.POST, postEntity, Map.class);
                log.info("Created Supabase Storage bucket: {}", storageBucket);
            }
        } catch (Exception e) {
            log.warn("Could not check/create storage bucket {}: {}", storageBucket, e.getMessage());
        }
    }

    void validateFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new ValidationException("QR code file is required");
        }

        if (file.getSize() > MAX_FILE_SIZE) {
            throw new ValidationException("QR code file size must not exceed 5MB limit");
        }

        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_MIME_TYPES.contains(contentType.toLowerCase())) {
            throw new ValidationException("Invalid image format. Allowed formats: PNG, JPEG, WEBP");
        }
    }

    /**
     * Validates file content using magic byte signatures (PNG, JPEG, WebP) on the server.
     * Does not trust the client browser's Content-Type header alone.
     */
    String validateFileContent(byte[] bytes, String fallbackContentType) {
        if (bytes == null || bytes.length < 12) {
            throw new ValidationException("Invalid image file: content is too small or empty");
        }

        boolean isPng = bytes[0] == (byte) 0x89 && bytes[1] == (byte) 0x50 &&
                        bytes[2] == (byte) 0x4E && bytes[3] == (byte) 0x47 &&
                        bytes[4] == (byte) 0x0D && bytes[5] == (byte) 0x0A &&
                        bytes[6] == (byte) 0x1A && bytes[7] == (byte) 0x0A;

        boolean isJpeg = bytes[0] == (byte) 0xFF && bytes[1] == (byte) 0xD8 && bytes[2] == (byte) 0xFF;

        boolean isWebp = bytes[0] == (byte) 'R' && bytes[1] == (byte) 'I' &&
                         bytes[2] == (byte) 'F' && bytes[3] == (byte) 'F' &&
                         bytes[8] == (byte) 'W' && bytes[9] == (byte) 'E' &&
                         bytes[10] == (byte) 'B' && bytes[11] == (byte) 'P';

        if (isPng) {
            return "image/png";
        }
        if (isJpeg) {
            return "image/jpeg";
        }
        if (isWebp) {
            return "image/webp";
        }

        throw new ValidationException("Invalid image file content. File must be a valid PNG, JPEG, or WebP image");
    }

    String extractObjectPath(String qrCodeUrl) {
        if (qrCodeUrl == null) return null;

        // Strip query string (e.g., token parameters in signed URLs)
        int queryIdx = qrCodeUrl.indexOf('?');
        String cleanUrl = queryIdx != -1 ? qrCodeUrl.substring(0, queryIdx) : qrCodeUrl;

        String[] prefixes = new String[] {
                "/storage/v1/object/sign/" + storageBucket + "/",
                "/storage/v1/object/public/" + storageBucket + "/",
                "/storage/v1/object/" + storageBucket + "/"
        };

        for (String prefix : prefixes) {
            int idx = cleanUrl.indexOf(prefix);
            if (idx != -1) {
                return cleanUrl.substring(idx + prefix.length());
            }
        }
        return null;
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
