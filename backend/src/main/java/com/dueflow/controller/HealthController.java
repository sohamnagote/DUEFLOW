package com.dueflow.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

@RestController
public class HealthController {

    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(HealthController.class);

    private final JdbcTemplate jdbcTemplate;

    public HealthController(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @GetMapping({"/api/health", "/health"})
    public ResponseEntity<Map<String, Object>> checkHealth() {
        Map<String, Object> response = new HashMap<>();
        response.put("status", "UP");
        response.put("version", "1.0.0");
        response.put("timestamp", Instant.now().toString());
        response.put("service", "DueFlow Backend (Java 21 / Spring Boot 3)");
        return ResponseEntity.ok(response);
    }

    @GetMapping({"/api/health/ready", "/health/ready"})
    public ResponseEntity<Map<String, Object>> checkReadiness() {
        Map<String, Object> response = new HashMap<>();
        response.put("version", "1.0.0");
        response.put("timestamp", Instant.now().toString());
        response.put("service", "DueFlow Backend (Java 21 / Spring Boot 3)");

        try {
            jdbcTemplate.setQueryTimeout(2);
            jdbcTemplate.queryForObject("SELECT 1", Integer.class);
            response.put("status", "READY");
            response.put("database", "CONNECTED");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Database readiness ping failed: {}", e.getMessage());
            response.put("status", "NOT_READY");
            response.put("database", "DISCONNECTED");
            response.put("error", "Database connection unavailable");
            return ResponseEntity.status(org.springframework.http.HttpStatus.SERVICE_UNAVAILABLE).body(response);
        }
    }
}
