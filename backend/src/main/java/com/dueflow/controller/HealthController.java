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
@RequestMapping("/api")
public class HealthController {

    private final JdbcTemplate jdbcTemplate;

    public HealthController(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> checkHealth() {
        Map<String, Object> response = new HashMap<>();
        response.put("status", "UP");
        response.put("timestamp", Instant.now().toString());
        response.put("service", "DueFlow Backend (Java 21 / Spring Boot 3)");

        try {
            jdbcTemplate.queryForObject("SELECT 1", Integer.class);
            response.put("database", "CONNECTED");
        } catch (Exception e) {
            org.slf4j.LoggerFactory.getLogger(HealthController.class).error("Database health check failed: {}", e.getMessage());
            response.put("database", "DOWN");
            return ResponseEntity.status(503).body(response);
        }

        return ResponseEntity.ok(response);
    }
}
