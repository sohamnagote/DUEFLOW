package com.dueflow.controller;

import com.dueflow.domain.PaymentSettings;
import com.dueflow.dto.PaymentSettingsDto;
import com.dueflow.service.SupabaseStorageService;
import com.dueflow.service.UserProfileService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;

import java.time.Instant;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

class PaymentSettingsControllerTest {

    private UserProfileService userProfileService;
    private SupabaseStorageService storageService;
    private PaymentSettingsController controller;

    private static final String TEST_USER_ID = "usr-test-999";

    @BeforeEach
    void setUp() {
        userProfileService = mock(UserProfileService.class);
        storageService = mock(SupabaseStorageService.class);
        controller = new PaymentSettingsController(userProfileService, storageService);

        // Setup security context with valid mock JWT
        Jwt jwt = Jwt.withTokenValue("mock-jwt-token")
                .header("alg", "none")
                .subject(TEST_USER_ID)
                .claim("email", "test@dueflow.io")
                .issuedAt(Instant.now())
                .expiresAt(Instant.now().plusSeconds(3600))
                .build();

        Authentication auth = mock(Authentication.class);
        when(auth.getPrincipal()).thenReturn(jwt);
        when(auth.isAuthenticated()).thenReturn(true);

        SecurityContext securityContext = mock(SecurityContext.class);
        when(securityContext.getAuthentication()).thenReturn(auth);
        SecurityContextHolder.setContext(securityContext);
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void testGetPaymentSettings() {
        PaymentSettings entity = new PaymentSettings();
        entity.setUserId(TEST_USER_ID);
        entity.setUpiId("test@upi");
        entity.setBankName("Test Bank");

        when(userProfileService.getPaymentSettings(TEST_USER_ID)).thenReturn(entity);

        ResponseEntity<PaymentSettingsDto> response = controller.getPaymentSettings();
        assertEquals(200, response.getStatusCode().value());
        assertNotNull(response.getBody());
        assertEquals("test@upi", response.getBody().getUpiId());
        assertEquals("Test Bank", response.getBody().getBankName());
    }

    @Test
    void testUpdatePaymentSettings() {
        PaymentSettingsDto inputDto = new PaymentSettingsDto();
        inputDto.setUpiId("updated@upi");
        inputDto.setBeneficiaryName("Jane Doe");

        PaymentSettings updated = new PaymentSettings();
        updated.setUserId(TEST_USER_ID);
        updated.setUpiId("updated@upi");
        updated.setBeneficiaryName("Jane Doe");

        when(userProfileService.updatePaymentSettings(eq(TEST_USER_ID), any())).thenReturn(updated);

        ResponseEntity<PaymentSettingsDto> response = controller.updatePaymentSettings(inputDto);
        assertEquals(200, response.getStatusCode().value());
        assertEquals("updated@upi", response.getBody().getUpiId());
        assertEquals("Jane Doe", response.getBody().getBeneficiaryName());
    }

    @Test
    void testUploadQrCodeSuccessAndPreservesOldUntilUploadDone() {
        PaymentSettings existing = new PaymentSettings();
        existing.setUserId(TEST_USER_ID);
        existing.setQrCodeUrl("https://storage.supabase.co/old-qr.png");

        when(userProfileService.getPaymentSettings(TEST_USER_ID)).thenReturn(existing);
        when(storageService.uploadQrCode(eq(TEST_USER_ID), any())).thenReturn("https://storage.supabase.co/new-qr.png");

        MockMultipartFile file = new MockMultipartFile("file", "qr.png", "image/png", new byte[]{1, 2, 3});
        ResponseEntity<Map<String, String>> response = controller.uploadQrCode(file);

        assertEquals(200, response.getStatusCode().value());
        assertEquals("https://storage.supabase.co/new-qr.png", response.getBody().get("qrCodeUrl"));

        verify(userProfileService).updateQrCodeUrl(TEST_USER_ID, "https://storage.supabase.co/new-qr.png");
        verify(storageService).deleteQrCode("https://storage.supabase.co/old-qr.png");
    }

    @Test
    void testUploadQrCodeFailurePreservesOldQr() {
        PaymentSettings existing = new PaymentSettings();
        existing.setUserId(TEST_USER_ID);
        existing.setQrCodeUrl("https://storage.supabase.co/old-qr.png");

        when(userProfileService.getPaymentSettings(TEST_USER_ID)).thenReturn(existing);
        when(storageService.uploadQrCode(eq(TEST_USER_ID), any())).thenThrow(new RuntimeException("Storage upload failed"));

        MockMultipartFile file = new MockMultipartFile("file", "qr.png", "image/png", new byte[]{1, 2, 3});
        assertThrows(RuntimeException.class, () -> controller.uploadQrCode(file));

        // Old QR must NOT be deleted if upload fails
        verify(storageService, never()).deleteQrCode(anyString());
        verify(userProfileService, never()).updateQrCodeUrl(anyString(), anyString());
    }

    @Test
    void testDeleteQrCode() {
        PaymentSettings existing = new PaymentSettings();
        existing.setUserId(TEST_USER_ID);
        existing.setQrCodeUrl("https://storage.supabase.co/to-delete.png");

        when(userProfileService.getPaymentSettings(TEST_USER_ID)).thenReturn(existing);

        ResponseEntity<Map<String, String>> response = controller.deleteQrCode();
        assertEquals(200, response.getStatusCode().value());

        verify(storageService).deleteQrCode("https://storage.supabase.co/to-delete.png");
        verify(userProfileService).updateQrCodeUrl(TEST_USER_ID, null);
    }
}
