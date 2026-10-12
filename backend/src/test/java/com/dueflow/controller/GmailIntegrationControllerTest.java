package com.dueflow.controller;

import com.dueflow.dto.GmailStatusDto;
import com.dueflow.exception.ValidationException;
import com.dueflow.service.GmailOAuthService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;

import java.time.Instant;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class GmailIntegrationControllerTest {

    private GmailOAuthService gmailOAuthService;
    private GmailIntegrationController controller;

    private static final String TEST_USER_ID = "usr-gmail-123";

    @BeforeEach
    void setUp() {
        gmailOAuthService = mock(GmailOAuthService.class);
        controller = new GmailIntegrationController(gmailOAuthService, "https://dueflow-kappa.vercel.app");

        Jwt jwt = Jwt.withTokenValue("mock-token")
                .header("alg", "none")
                .subject(TEST_USER_ID)
                .claim("email", "owner@dueflow.io")
                .issuedAt(Instant.now())
                .expiresAt(Instant.now().plusSeconds(3600))
                .build();

        Authentication auth = mock(Authentication.class);
        when(auth.getPrincipal()).thenReturn(jwt);
        when(auth.isAuthenticated()).thenReturn(true);

        SecurityContext sc = mock(SecurityContext.class);
        when(sc.getAuthentication()).thenReturn(auth);
        SecurityContextHolder.setContext(sc);
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void testGetAuthUrlSuccess() {
        String expectedUrl = "https://accounts.google.com/o/oauth2/v2/auth?client_id=123&state=xyz";
        when(gmailOAuthService.getAuthorizationUrl(TEST_USER_ID)).thenReturn(expectedUrl);

        ResponseEntity<Map<String, String>> response = controller.getAuthUrl();
        assertEquals(200, response.getStatusCode().value());
        assertNotNull(response.getBody());
        assertEquals(expectedUrl, response.getBody().get("url"));
    }

    @Test
    void testGetAuthUrlMissingCredentialsThrowsValidationException() {
        when(gmailOAuthService.getAuthorizationUrl(TEST_USER_ID))
                .thenThrow(new ValidationException("Google OAuth Client ID is not configured on the backend"));

        ValidationException ex = assertThrows(ValidationException.class, () -> controller.getAuthUrl());
        assertTrue(ex.getMessage().contains("Google OAuth Client ID"));
    }

    @Test
    void testGetStatus() {
        GmailStatusDto status = new GmailStatusDto(true, "owner@gmail.com", "CONNECTED", Instant.now());
        when(gmailOAuthService.getConnectionStatus(TEST_USER_ID)).thenReturn(status);

        ResponseEntity<GmailStatusDto> response = controller.getStatus();
        assertEquals(200, response.getStatusCode().value());
        assertTrue(response.getBody().isConnected());
        assertEquals("owner@gmail.com", response.getBody().getEmail());
    }

    @Test
    void testDisconnect() {
        ResponseEntity<Map<String, String>> response = controller.disconnect();
        assertEquals(200, response.getStatusCode().value());
        verify(gmailOAuthService).disconnect(TEST_USER_ID);
    }

    @Test
    void testCallbackSuccessRedirectsToFrontend() {
        when(gmailOAuthService.handleOAuthCallback("auth-code", "valid-state")).thenReturn("connected@gmail.com");

        ResponseEntity<Void> response = controller.handleOAuthCallback("auth-code", "valid-state");
        assertEquals(302, response.getStatusCode().value());
        assertNotNull(response.getHeaders().getLocation());
        assertTrue(response.getHeaders().getLocation().toString().contains("gmail=connected"));
        assertTrue(response.getHeaders().getLocation().toString().contains("connected%40gmail.com"));
    }

    @Test
    void testCallbackFailureRedirectsWithErrorParam() {
        when(gmailOAuthService.handleOAuthCallback("bad-code", "bad-state"))
                .thenThrow(new ValidationException("Invalid or expired OAuth state parameter"));

        ResponseEntity<Void> response = controller.handleOAuthCallback("bad-code", "bad-state");
        assertEquals(302, response.getStatusCode().value());
        assertNotNull(response.getHeaders().getLocation());
        assertTrue(response.getHeaders().getLocation().toString().contains("gmail=error"));
        assertTrue(response.getHeaders().getLocation().toString().contains("Invalid+or+expired"));
    }
}
