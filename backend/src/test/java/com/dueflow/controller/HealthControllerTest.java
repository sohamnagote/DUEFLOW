package com.dueflow.controller;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class HealthControllerTest {

    @Test
    @DisplayName("Health endpoint returns 200 UP for liveness")
    void testHealthLiveness() {
        JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
        HealthController controller = new HealthController(jdbcTemplate);
        ResponseEntity<Map<String, Object>> response = controller.checkHealth();

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals("UP", response.getBody().get("status"));
        assertEquals("DueFlow Backend (Java 21 / Spring Boot 3)", response.getBody().get("service"));
    }

    @Test
    @DisplayName("Readiness endpoint returns 200 READY when database is available")
    void testReadinessReady() {
        JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
        when(jdbcTemplate.queryForObject("SELECT 1", Integer.class)).thenReturn(1);

        HealthController controller = new HealthController(jdbcTemplate);
        ResponseEntity<Map<String, Object>> response = controller.checkReadiness();

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals("READY", response.getBody().get("status"));
        assertEquals("CONNECTED", response.getBody().get("database"));
    }

    @Test
    @DisplayName("Readiness endpoint returns 503 NOT_READY when database is unavailable")
    void testReadinessNotReady() {
        JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
        when(jdbcTemplate.queryForObject("SELECT 1", Integer.class)).thenThrow(new RuntimeException("Connection timeout"));

        HealthController controller = new HealthController(jdbcTemplate);
        ResponseEntity<Map<String, Object>> response = controller.checkReadiness();

        assertEquals(HttpStatus.SERVICE_UNAVAILABLE, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals("NOT_READY", response.getBody().get("status"));
        assertEquals("DISCONNECTED", response.getBody().get("database"));
    }
}
