package in.dueflow;

import in.dueflow.dto.AiDtos.GenerateReminderRequest;
import in.dueflow.dto.AiDtos.GenerateReminderResponse;
import in.dueflow.entity.AiAction;
import in.dueflow.repository.AiActionRepository;
import in.dueflow.service.AiService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mockito;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.verify;

public class AiServiceTest {

    private AiActionRepository aiActionRepository;
    private AiService aiService;

    @BeforeEach
    void setUp() {
        aiActionRepository = Mockito.mock(AiActionRepository.class);
        aiService = new AiService(aiActionRepository);
        ReflectionTestUtils.setField(aiService, "geminiApiKey", "");
        ReflectionTestUtils.setField(aiService, "geminiModel", "gemini-3.8-flash");
    }

    @Test
    void testDeterministicFallbackWhenApiKeyMissing() {
        UUID userId = UUID.randomUUID();
        GenerateReminderRequest req = new GenerateReminderRequest();
        req.setInvoice_number("INV-999");
        req.setAmount(new BigDecimal("75000.00"));
        req.setDue_date("2026-11-01");
        req.setClient_name("TechNova Solutions");
        req.setTone("firm");

        GenerateReminderResponse res = aiService.generateReminder(userId, req, "DueFlow Studio", "Jane Doe");

        assertTrue(res.isFallback(), "Should be marked as fallback");
        assertEquals("deterministic-fallback", res.getModelUsed());
        assertEquals("firm", res.getTone());
        assertTrue(res.getSubject().contains("ACTION REQUIRED"));
        assertTrue(res.getBody().contains("TechNova Solutions"));

        // Verify audit log in ai_actions
        ArgumentCaptor<AiAction> captor = ArgumentCaptor.forClass(AiAction.class);
        verify(aiActionRepository).save(captor.capture());
        AiAction captured = captor.getValue();
        assertEquals(userId, captured.getUserId());
        assertTrue(captured.getIsFallback());
        assertEquals("deterministic-fallback", captured.getModelUsed());
    }
}
