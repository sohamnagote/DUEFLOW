package com.dueflow.controller;

import com.dueflow.dto.DashboardSummaryDto;
import com.dueflow.security.SecurityUtils;
import com.dueflow.service.DashboardService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping({"/api/dashboard", "/dashboard"})
public class DashboardController {

    private final DashboardService dashboardService;

    public DashboardController(DashboardService dashboardService) {
        this.dashboardService = dashboardService;
    }

    @GetMapping
    public ResponseEntity<DashboardSummaryDto> getDashboardSummary() {
        String userId = SecurityUtils.getRequiredUserId();
        return ResponseEntity.ok(dashboardService.getDashboardSummary(userId));
    }

    @PostMapping({"/reset", "/reset-workspace"})
    public ResponseEntity<Map<String, Object>> resetWorkspace() {
        String userId = SecurityUtils.getRequiredUserId();
        return ResponseEntity.ok(dashboardService.resetWorkspace(userId));
    }
}
