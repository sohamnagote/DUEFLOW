package in.dueflow.controller;

import in.dueflow.dto.AuthDtos.UpdateProfileRequest;
import in.dueflow.entity.Profile;
import in.dueflow.security.SecurityUtils;
import in.dueflow.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/profile")
public class ProfileController {

    private final AuthService authService;

    public ProfileController(AuthService authService) {
        this.authService = authService;
    }

    @GetMapping
    public ResponseEntity<Map<String, Object>> getProfile() {
        UUID userId = SecurityUtils.getCurrentUserId();
        Profile profile = authService.getProfile(userId);
        return ResponseEntity.ok(Map.of("profile", profile));
    }

    @PutMapping
    public ResponseEntity<Map<String, Object>> updateProfile(@Valid @RequestBody UpdateProfileRequest request) {
        UUID userId = SecurityUtils.getCurrentUserId();
        Profile updated = authService.updateProfile(userId, request);
        return ResponseEntity.ok(Map.of("profile", updated));
    }

    @PostMapping("/payment-qr")
    public ResponseEntity<?> uploadPaymentQr(@RequestParam("file") org.springframework.web.multipart.MultipartFile file) {
        UUID userId = SecurityUtils.getCurrentUserId();

        if (file == null || file.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", "Please select a valid image file to upload."
            ));
        }

        // Validate max 2MB
        if (file.getSize() > 2 * 1024 * 1024) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", "QR code image size must not exceed 2MB."
            ));
        }

        // Validate MIME type
        String contentType = file.getContentType();
        if (contentType == null || (!contentType.equalsIgnoreCase("image/png")
                && !contentType.equalsIgnoreCase("image/jpeg")
                && !contentType.equalsIgnoreCase("image/jpg")
                && !contentType.equalsIgnoreCase("image/webp"))) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", "Invalid file format. Please upload a PNG, JPEG, or WEBP image."
            ));
        }

        try {
            byte[] bytes = file.getBytes();
            String base64 = java.util.Base64.getEncoder().encodeToString(bytes);
            String dataUrl = "data:" + contentType.toLowerCase() + ";base64," + base64;

            UpdateProfileRequest updateReq = new UpdateProfileRequest();
            updateReq.setPayment_qr_url(dataUrl);
            Profile updated = authService.updateProfile(userId, updateReq);

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Payment QR uploaded successfully.",
                    "payment_qr_url", updated.getPaymentQrUrl()
            ));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of(
                    "success", false,
                    "error", "Failed to process image: " + e.getMessage()
            ));
        }
    }

    @DeleteMapping("/payment-qr")
    public ResponseEntity<?> deletePaymentQr() {
        UUID userId = SecurityUtils.getCurrentUserId();
        UpdateProfileRequest updateReq = new UpdateProfileRequest();
        updateReq.setPayment_qr_url("");
        authService.updateProfile(userId, updateReq);

        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Payment QR removed successfully."
        ));
    }

    @GetMapping("/payment-qr")
    public ResponseEntity<?> getPaymentQr() {
        UUID userId = SecurityUtils.getCurrentUserId();
        Profile profile = authService.getProfile(userId);
        return ResponseEntity.ok(Map.of(
                "success", true,
                "payment_qr_url", profile.getPaymentQrUrl() != null ? profile.getPaymentQrUrl() : ""
        ));
    }
}
