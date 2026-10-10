package com.dueflow.controller;

import com.dueflow.domain.PaymentSettings;
import com.dueflow.dto.PaymentSettingsDto;
import com.dueflow.security.SecurityUtils;
import com.dueflow.service.SupabaseStorageService;
import com.dueflow.service.UserProfileService;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

@RestController
public class PaymentSettingsController {

    private final UserProfileService userProfileService;
    private final SupabaseStorageService storageService;

    public PaymentSettingsController(UserProfileService userProfileService, SupabaseStorageService storageService) {
        this.userProfileService = userProfileService;
        this.storageService = storageService;
    }

    @GetMapping("/api/settings/payment")
    public ResponseEntity<PaymentSettingsDto> getPaymentSettings() {
        String userId = SecurityUtils.getRequiredUserId();
        PaymentSettings settings = userProfileService.getPaymentSettings(userId);
        return ResponseEntity.ok(PaymentSettingsDto.fromEntity(settings));
    }

    @PutMapping("/api/settings/payment")
    public ResponseEntity<PaymentSettingsDto> updatePaymentSettings(@RequestBody PaymentSettingsDto dto) {
        String userId = SecurityUtils.getRequiredUserId();
        PaymentSettings updated = userProfileService.updatePaymentSettings(userId, dto);
        return ResponseEntity.ok(PaymentSettingsDto.fromEntity(updated));
    }

    @PostMapping(value = {"/api/settings/payment/qr", "/api/user/profile/qr-code"}, consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Map<String, String>> uploadQrCode(@RequestParam("file") MultipartFile file) {
        String userId = SecurityUtils.getRequiredUserId();

        // Check if there is an existing QR code to delete
        PaymentSettings current = userProfileService.getPaymentSettings(userId);
        if (current.getQrCodeUrl() != null && !current.getQrCodeUrl().isBlank()) {
            storageService.deleteQrCode(current.getQrCodeUrl());
        }

        String uploadedUrl = storageService.uploadQrCode(userId, file);
        userProfileService.updateQrCodeUrl(userId, uploadedUrl);

        return ResponseEntity.ok(Map.of(
                "qrCodeUrl", uploadedUrl,
                "paymentQrUrl", uploadedUrl,
                "message", "QR code uploaded successfully"
        ));
    }

    @DeleteMapping({"/api/settings/payment/qr", "/api/user/profile/qr-code"})
    public ResponseEntity<Map<String, String>> deleteQrCode() {
        String userId = SecurityUtils.getRequiredUserId();
        PaymentSettings current = userProfileService.getPaymentSettings(userId);

        if (current.getQrCodeUrl() != null && !current.getQrCodeUrl().isBlank()) {
            storageService.deleteQrCode(current.getQrCodeUrl());
            userProfileService.updateQrCodeUrl(userId, null);
        }

        return ResponseEntity.ok(Map.of("message", "QR code deleted successfully"));
    }
}
