package com.dueflow.controller;

import com.dueflow.domain.UserProfile;
import com.dueflow.dto.UserProfileDto;
import com.dueflow.security.SecurityUtils;
import com.dueflow.service.UserProfileService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping({"/api/user/profile", "/api/profile", "/user/profile", "/profile"})
public class ProfileController {

    private final UserProfileService userProfileService;

    public ProfileController(UserProfileService userProfileService) {
        this.userProfileService = userProfileService;
    }

    @GetMapping
    public ResponseEntity<UserProfileDto> getProfile() {
        String userId = SecurityUtils.getRequiredUserId();
        String email = SecurityUtils.getCurrentUserEmail().orElse(null);
        UserProfile profile = userProfileService.getOrCreateProfile(userId, email);
        UserProfileDto dto = UserProfileDto.fromEntity(profile);
        userProfileService.populateGmailStatus(userId, dto);
        return ResponseEntity.ok(dto);
    }

    @PutMapping
    public ResponseEntity<UserProfileDto> updateProfile(@Valid @RequestBody UserProfileDto dto) {
        String userId = SecurityUtils.getRequiredUserId();
        UserProfile updated = userProfileService.updateProfile(userId, dto);
        UserProfileDto result = UserProfileDto.fromEntity(updated);
        userProfileService.populateGmailStatus(userId, result);
        return ResponseEntity.ok(result);
    }
}
