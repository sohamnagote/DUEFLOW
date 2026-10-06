package in.dueflow.controller;

import in.dueflow.dto.DashboardDtos.DashboardStatsResponse;
import in.dueflow.security.SecurityUtils;
import in.dueflow.service.DashboardService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {

    private final DashboardService dashboardService;

    public DashboardController(DashboardService dashboardService) {
        this.dashboardService = dashboardService;
    }

    @GetMapping
    public ResponseEntity<DashboardStatsResponse> getDashboard() {
        UUID userId = SecurityUtils.getCurrentUserId();
        DashboardStatsResponse stats = dashboardService.getDashboardStats(userId);
        return ResponseEntity.ok(stats);
    }
}
