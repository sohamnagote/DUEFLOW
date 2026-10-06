package in.dueflow.controller;

import in.dueflow.exception.UnauthorizedException;
import in.dueflow.service.ReminderService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/cron")
public class CronController {

    private final ReminderService reminderService;

    @Value("${CRON_SECRET:dueflow_cron_dev_secret_2026}")
    private String cronSecret;

    @Value("${NODE_ENV:development}")
    private String nodeEnv;

    public CronController(ReminderService reminderService) {
        this.reminderService = reminderService;
    }

    @PostMapping("/process-reminders")
    public ResponseEntity<Map<String, Object>> processReminders(
            @RequestHeader(name = "Authorization", required = false) String authHeader) {

        boolean isCronSecret = authHeader != null && authHeader.equals("Bearer " + cronSecret);
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        boolean isAuthenticated = auth != null && auth.isAuthenticated() && !"anonymousUser".equals(auth.getPrincipal());
        boolean isDevToken = authHeader != null && authHeader.startsWith("Bearer dueflow_dev_");

        if (!isCronSecret && !isAuthenticated && !isDevToken && "production".equalsIgnoreCase(nodeEnv)) {
            throw new UnauthorizedException("Unauthorized cron invocation");
        }

        Map<String, Object> results = reminderService.processPendingReminders();
        return ResponseEntity.ok(results);
    }
}
