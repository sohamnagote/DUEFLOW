package in.dueflow;

import in.dueflow.dto.AuthDtos.UpdateProfileRequest;
import in.dueflow.dto.ReminderDtos.SaveScheduleRequest;
import in.dueflow.dto.ReminderDtos.SaveTemplateRequest;
import in.dueflow.entity.Profile;
import in.dueflow.entity.ReminderRule;
import in.dueflow.repository.ProfileRepository;
import in.dueflow.repository.ReminderRuleRepository;
import in.dueflow.security.AuthenticatedUser;
import in.dueflow.service.AuthService;
import in.dueflow.service.ReminderService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@Transactional
public class DueFlowPersistenceAndCustomizationTest {

    @Autowired
    private AuthService authService;

    @Autowired
    private ProfileRepository profileRepository;

    @Autowired
    private in.dueflow.controller.ReminderController reminderController;

    @Test
    void testProfilePersistenceAndPaymentCoordinates() {
        UUID userId = UUID.randomUUID();
        Profile p = new Profile(userId, "test@studio.in");
        p.setFullName("Studio Lead");
        p.setBusinessName("Studio Pixel");
        profileRepository.save(p);

        UpdateProfileRequest req = new UpdateProfileRequest();
        req.setUpi_id("lead@okhdfc");
        req.setBank_name("HDFC Bank");
        req.setBank_account("50200099887766");
        req.setBank_ifsc("HDFC0001234");
        req.setPayment_notes("Invoice ref in UPI remarks");
        req.setAddress("Mumbai, Maharashtra");

        Profile updated = authService.updateProfile(userId, req);
        assertEquals("lead@okhdfc", updated.getUpiId());
        assertEquals("HDFC Bank", updated.getBankName());
        assertEquals("50200099887766", updated.getBankAccount());
        assertEquals("HDFC0001234", updated.getBankIfsc());
        assertEquals("Invoice ref in UPI remarks", updated.getPaymentNotes());
        assertEquals("Mumbai, Maharashtra", updated.getAddress());

        // Verify retrieval matches persisted state
        Profile fetched = authService.getProfile(userId);
        assertEquals("lead@okhdfc", fetched.getUpiId());
        assertEquals("HDFC Bank", fetched.getBankName());
    }

    @Test
    void testCustomReminderScheduleAndTemplateSaving() {
        UUID userId = UUID.randomUUID();
        Profile p = new Profile(userId, "creator@dueflow.in");
        profileRepository.save(p);

        String customScheduleJson = """
            [
              {"direction": "before", "offset_days": 3, "send_time": "10:00", "enabled": true},
              {"direction": "on", "offset_days": 0, "send_time": "09:30", "enabled": true},
              {"direction": "after", "offset_days": 4, "send_time": "11:00", "enabled": true}
            ]
        """;

        // Authenticate as userId
        AuthenticatedUser authUser = new AuthenticatedUser(userId, "creator@dueflow.in", "Creator", "DueFlow Studio");
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(authUser, null, List.of())
        );

        // 1. Save custom schedule via controller
        SaveScheduleRequest scheduleReq = new SaveScheduleRequest();
        scheduleReq.setRules_json(customScheduleJson);
        scheduleReq.setTimezone("Asia/Kolkata");
        reminderController.saveSchedule(scheduleReq);

        Profile afterSchedule = authService.getProfile(userId);
        assertNotNull(afterSchedule.getReminderScheduleRules());
        assertTrue(afterSchedule.getReminderScheduleRules().contains("custom_before") ||
                   afterSchedule.getReminderScheduleRules().contains("before"));
        assertEquals("Asia/Kolkata", afterSchedule.getTimezone());

        // 2. Save custom template via controller
        SaveTemplateRequest templateReq = new SaveTemplateRequest();
        templateReq.setTone("friendly");
        templateReq.setSubject("Payment update: {{invoice_number}} for {{invoice_amount}}");
        templateReq.setBody("Hello {{client_name}}, a warm reminder from {{business_name}}.");
        reminderController.saveTemplate(templateReq);

        Profile afterTemplate = authService.getProfile(userId);
        assertEquals("friendly", afterTemplate.getEmailTone());
        assertEquals("Payment update: {{invoice_number}} for {{invoice_amount}}", afterTemplate.getCustomEmailSubject());
        assertEquals("Hello {{client_name}}, a warm reminder from {{business_name}}.", afterTemplate.getCustomEmailBody());
    }

    @Test
    void testMagicByteImageValidationForPaymentQr() {
        // Valid PNG header (89 50 4E 47 0D 0A 1A 0A)
        byte[] validPngBytes = new byte[]{(byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0, 0, 0, 0, 0};
        assertTrue(in.dueflow.controller.ProfileController.isValidImageMagicBytes(validPngBytes));

        // Valid JPEG header (FF D8 FF)
        byte[] validJpegBytes = new byte[]{(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, (byte) 0xE0, 0, 0, 0, 0, 0, 0, 0, 0};
        assertTrue(in.dueflow.controller.ProfileController.isValidImageMagicBytes(validJpegBytes));

        // Fake executable pretending to be image
        byte[] fakeBytes = "MZ\0\0This is a fake binary exe file".getBytes(StandardCharsets.UTF_8);
        assertFalse(in.dueflow.controller.ProfileController.isValidImageMagicBytes(fakeBytes));
    }
}
