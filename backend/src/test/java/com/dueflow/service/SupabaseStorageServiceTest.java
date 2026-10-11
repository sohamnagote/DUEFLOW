package com.dueflow.service;

import com.dueflow.exception.ValidationException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;

import static org.junit.jupiter.api.Assertions.*;

class SupabaseStorageServiceTest {

    private SupabaseStorageService storageService;

    @BeforeEach
    void setUp() {
        storageService = new SupabaseStorageService(
                "https://test-project.supabase.co",
                "test-service-key",
                "dueflow-qr-codes"
        );
    }

    @Test
    void testMagicByteValidationPng() {
        byte[] pngHeader = new byte[]{(byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x00};
        MockMultipartFile file = new MockMultipartFile("file", "qr.png", "image/png", pngHeader);
        assertDoesNotThrow(() -> storageService.validateFile(file));
        String mime = storageService.validateFileContent(pngHeader, "image/png");
        assertEquals("image/png", mime);
    }

    @Test
    void testMagicByteValidationJpeg() {
        byte[] jpegHeader = new byte[]{(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, (byte) 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01};
        MockMultipartFile file = new MockMultipartFile("file", "qr.jpg", "image/jpeg", jpegHeader);
        assertDoesNotThrow(() -> storageService.validateFile(file));
        String mime = storageService.validateFileContent(jpegHeader, "image/jpeg");
        assertEquals("image/jpeg", mime);
    }

    @Test
    void testMagicByteValidationWebp() {
        byte[] webpHeader = new byte[]{
                'R', 'I', 'F', 'F', 0x20, 0x00, 0x00, 0x00, 'W', 'E', 'B', 'P', 'V', 'P', '8'
        };
        MockMultipartFile file = new MockMultipartFile("file", "qr.webp", "image/webp", webpHeader);
        assertDoesNotThrow(() -> storageService.validateFile(file));
        String mime = storageService.validateFileContent(webpHeader, "image/webp");
        assertEquals("image/webp", mime);
    }

    @Test
    void testRejectOversizedFileExceeding5MB() {
        byte[] largeData = new byte[5 * 1024 * 1024 + 1];
        MockMultipartFile file = new MockMultipartFile("file", "large.png", "image/png", largeData);
        ValidationException ex = assertThrows(ValidationException.class, () -> storageService.validateFile(file));
        assertTrue(ex.getMessage().contains("5MB limit"));
    }

    @Test
    void testRejectSpoofedMimeTypeWithoutMagicBytes() {
        byte[] fakeData = "This is a text file, not a PNG image!".getBytes();
        MockMultipartFile file = new MockMultipartFile("file", "fake.png", "image/png", fakeData);
        assertDoesNotThrow(() -> storageService.validateFile(file));
        ValidationException ex = assertThrows(ValidationException.class, () -> storageService.validateFileContent(fakeData, "image/png"));
        assertTrue(ex.getMessage().contains("Invalid image file content"));
    }

    @Test
    void testExtractObjectPathFromSignedUrl() {
        String signedUrl = "https://ovkjawwnsbdksddcgcdn.supabase.co/storage/v1/object/sign/dueflow-qr-codes/user-123/qr-999.png?token=xyz123";
        String path = storageService.extractObjectPath(signedUrl);
        assertEquals("user-123/qr-999.png", path);
    }

    @Test
    void testExtractObjectPathFromPublicUrl() {
        String publicUrl = "https://ovkjawwnsbdksddcgcdn.supabase.co/storage/v1/object/public/dueflow-qr-codes/user-456/qr-888.jpg";
        String path = storageService.extractObjectPath(publicUrl);
        assertEquals("user-456/qr-888.jpg", path);
    }
}
