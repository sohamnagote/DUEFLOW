package com.dueflow.controller;

import com.dueflow.dto.UserProfileDto;
import com.dueflow.security.SecurityUtils;
import com.dueflow.service.UserProfileService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping({"/api/user/profile", "/api/profile"})
public class ProfileController {

    private final UserProfileService userProfileService;

    public ProfileController(UserProfileService userProfileService) {
        this.userProfileService = userProfileService;
    }

    @GetMapping
    public ResponseEntity<UserProfileDto> getProfile() {
        String userId = SecurityUtils.getRequiredUserId();
        String email = SecurityUtils.getCurrentUserEmail().orElse(null);
        return ResponseEntity.ok(UserProfileDto.fromEntity(userProfileService.getOrCreateProfile(userId, email)));
    }

    @PutMapping
    public ResponseEntity<UserProfileDto> updateProfile(@Valid @RequestBody UserProfileDto dto) {
        String userId = SecurityUtils.getRequiredUserId();
        return ResponseEntity.ok(UserProfileDto.fromEntity(userProfileService.updateProfile(userId, dto)));
    }
}
