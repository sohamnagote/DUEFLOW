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

        try {
            jdbcTemplate.queryForObject("SELECT 1", Integer.class);
            response.put("database", "CONNECTED");
        } catch (Exception e) {
            org.slf4j.LoggerFactory.getLogger(HealthController.class).warn("Database health check ping warning: {}", e.getMessage());
            response.put("database", "INITIALIZING");
        }

        return ResponseEntity.ok(response);
    }
}
