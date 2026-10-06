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
}
