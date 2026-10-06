package in.dueflow.controller;

import in.dueflow.dto.AiDtos.GenerateReminderRequest;
import in.dueflow.dto.AiDtos.GenerateReminderResponse;
import in.dueflow.entity.Profile;
import in.dueflow.security.SecurityUtils;
import in.dueflow.service.AiService;
import in.dueflow.service.AuthService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/ai")
public class AiController {

    private final AiService aiService;
    private final AuthService authService;

    public AiController(AiService aiService, AuthService authService) {
        this.aiService = aiService;
        this.authService = authService;
    }

    @PostMapping("/generate-reminder")
    public ResponseEntity<GenerateReminderResponse> generateReminder(@RequestBody GenerateReminderRequest request) {
        UUID userId = SecurityUtils.getCurrentUserId();
        Profile profile = authService.getProfile(userId);
        GenerateReminderResponse response = aiService.generateReminder(
                userId,
                request,
                profile.getBusinessName(),
                profile.getFullName()
        );
        return ResponseEntity.ok(response);
    }
}
