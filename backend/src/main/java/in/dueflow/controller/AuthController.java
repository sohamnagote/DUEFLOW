package in.dueflow.controller;

import in.dueflow.dto.AuthDtos.AuthResponse;
import in.dueflow.dto.AuthDtos.LoginRequest;
import in.dueflow.dto.AuthDtos.SignupRequest;
import in.dueflow.dto.AuthDtos.UpdateProfileRequest;
import in.dueflow.entity.Profile;
import in.dueflow.security.SecurityUtils;
import in.dueflow.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/signup")
    public ResponseEntity<AuthResponse> signup(@Valid @RequestBody SignupRequest request) {
        AuthResponse response = authService.signup(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        AuthResponse response = authService.login(request);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/me")
    public ResponseEntity<Map<String, Object>> me() {
        UUID userId = SecurityUtils.getCurrentUserId();
        Profile profile = authService.getProfile(userId);
        return ResponseEntity.ok(Map.of("user", profile));
    }

    @PostMapping("/logout")
    public ResponseEntity<Map<String, String>> logout() {
        return ResponseEntity.ok(Map.of("message", "Logged out successfully"));
    }

    @GetMapping("/profile")
    public ResponseEntity<Map<String, Object>> getProfile() {
        UUID userId = SecurityUtils.getCurrentUserId();
        Profile profile = authService.getProfile(userId);
        return ResponseEntity.ok(Map.of("profile", profile));
    }

    @PutMapping("/profile")
    public ResponseEntity<Map<String, Object>> updateProfile(@Valid @RequestBody UpdateProfileRequest request) {
        UUID userId = SecurityUtils.getCurrentUserId();
        Profile updated = authService.updateProfile(userId, request);
        return ResponseEntity.ok(Map.of("profile", updated));
    }
}
