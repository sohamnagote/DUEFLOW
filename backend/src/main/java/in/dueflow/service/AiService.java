package in.dueflow.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import in.dueflow.dto.AiDtos.GenerateReminderRequest;
import in.dueflow.dto.AiDtos.GenerateReminderResponse;
import in.dueflow.entity.AiAction;
import in.dueflow.repository.AiActionRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.text.NumberFormat;
import java.time.Duration;
import java.time.Instant;
import java.util.*;

@Service
public class AiService {

    private static final Logger log = LoggerFactory.getLogger(AiService.class);

    @Value("${GEMINI_API_KEY:}")
    private String geminiApiKey;

    @Value("${GEMINI_MODEL:gemini-3.8-flash}")
    private String geminiModel;

    private final AiActionRepository aiActionRepository;
    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(5))
            .build();
    private final ObjectMapper objectMapper = new ObjectMapper();

    public AiService(AiActionRepository aiActionRepository) {
        this.aiActionRepository = aiActionRepository;
    }

    private String formatINR(BigDecimal amount) {
        if (amount == null) return "INR 0";
        NumberFormat nf = NumberFormat.getCurrencyInstance(new Locale("en", "IN"));
        return nf.format(amount).replace("INR", "INR ").trim();
    }

    private GenerateReminderResponse getDeterministicFallback(GenerateReminderRequest req, String businessName, String senderName) {
        String formattedAmount = formatINR(req.getAmount());
        String client = (req.getClient_name() != null && !req.getClient_name().isBlank()) ? req.getClient_name() : "Client";
        String tone = (req.getTone() != null && !req.getTone().isBlank()) ? req.getTone().toLowerCase() : "professional";
        String invNum = (req.getInvoice_number() != null && !req.getInvoice_number().isBlank()) ? req.getInvoice_number() : "INV-001";
        String dueDate = (req.getDue_date() != null && !req.getDue_date().isBlank()) ? req.getDue_date() : "the due date";

        String subject;
        String body;

        switch (tone) {
            case "gentle":
                subject = "Friendly check-in: Invoice #" + invNum + " (" + formattedAmount + ")";
                body = "Hi " + client + ",\n\nI hope you're having a productive week! Just sending a gentle reminder regarding invoice #" +
                        invNum + " for " + formattedAmount + ", due on " + dueDate + ".\n\nPlease let us know if you need any additional invoice copies or settlement details. Thank you!";
                break;
            case "firm":
                subject = "ACTION REQUIRED: Overdue invoice #" + invNum + " (" + formattedAmount + ")";
                body = "Dear " + client + ",\n\nOur records show that invoice #" + invNum + " for " + formattedAmount +
                        " was due on " + dueDate + " and remains unsettled.\n\nPrompt payment is required to maintain good standing and uninterrupted service delivery. Please remit payment via bank transfer or UPI today.";
                break;
            case "urgent":
                subject = "FINAL NOTICE: Immediate settlement required for invoice #" + invNum;
                body = "Dear " + client + ",\n\nInvoice #" + invNum + " (" + formattedAmount + ") is now significantly past due. Despite prior reminders, payment has not been received.\n\nPlease process this payment immediately or contact us directly today to confirm transaction details.";
                break;
            case "professional":
            default:
                subject = "Payment reminder: Invoice #" + invNum + " due " + dueDate;
                body = "Dear " + client + ",\n\nThis is a courtesy reminder regarding invoice #" + invNum +
                        " for the amount of " + formattedAmount + ", due on " + dueDate + ".\n\nThank you for your prompt attention to this matter.";
                break;
        }

        return new GenerateReminderResponse(subject, body, tone, "deterministic-fallback", true);
    }

    public GenerateReminderResponse generateReminder(UUID userId, GenerateReminderRequest req, String businessName, String senderName) {
        long startMs = System.currentTimeMillis();
        boolean isPlaceholderKey = geminiApiKey == null || geminiApiKey.isBlank() ||
                geminiApiKey.contains("your_gemini_api_key") || geminiApiKey.contains("MY_GEMINI_API_KEY");

        if (isPlaceholderKey) {
            log.info("[AI Service] Gemini API key not configured or placeholder. Using deterministic fallback.");
            GenerateReminderResponse fallback = getDeterministicFallback(req, businessName, senderName);
            recordAiAction(userId, req.getInvoice_id(), "generate_reminder_copy",
                    "Tone: " + req.getTone() + ", Invoice: " + req.getInvoice_number(),
                    fallback.getModelUsed(), fallback.getSubject(), fallback.getBody(),
                    (int) (System.currentTimeMillis() - startMs), true);
            return fallback;
        }

        try {
            String prompt = "You are the AI reminder engine for DueFlow, an India-first automated invoice follow-up SaaS for freelancers and boutique businesses.\n" +
                    "Draft an email subject and body copy for the following invoice reminder:\n" +
                    "- Client Name: " + req.getClient_name() + "\n" +
                    "- Sender / Business: " + (businessName != null ? businessName : senderName) + "\n" +
                    "- Invoice Number: #" + req.getInvoice_number() + "\n" +
                    "- Amount: " + formatINR(req.getAmount()) + "\n" +
                    "- Due Date: " + req.getDue_date() + "\n" +
                    "- Desired Tone: " + req.getTone() + "\n\n" +
                    "Rules:\n" +
                    "1. Currency is INR.\n" +
                    "2. Tone must strictly match '" + req.getTone() + "'.\n" +
                    "3. Respond ONLY in valid JSON format with keys: \"subject\", \"body\", \"tone\".\n" +
                    "4. Do not include markdown codeblocks or placeholder brackets.\n" +
                    "5. Keep the email concise, professional, clear, and action-oriented.";

            Map<String, Object> textPart = Map.of("text", prompt);
            Map<String, Object> contents = Map.of("parts", List.of(textPart));
            Map<String, Object> genConfig = Map.of("responseMimeType", "application/json");

            Map<String, Object> requestPayload = Map.of(
                    "contents", List.of(contents),
                    "generationConfig", genConfig
            );

            String requestBody = objectMapper.writeValueAsString(requestPayload);
            String url = "https://generativelanguage.googleapis.com/v1beta/models/" + geminiModel + ":generateContent?key=" + geminiApiKey.trim();

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .header("Content-Type", "application/json")
                    .timeout(Duration.ofMillis(4000))
                    .POST(HttpRequest.BodyPublishers.ofString(requestBody, StandardCharsets.UTF_8))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() == 200) {
                JsonNode root = objectMapper.readTree(response.body());
                JsonNode candidates = root.path("candidates");
                if (candidates.isArray() && !candidates.isEmpty()) {
                    String candidateText = candidates.get(0).path("content").path("parts").get(0).path("text").asText();
                    if (candidateText != null && !candidateText.isBlank()) {
                        // Extract JSON from candidateText
                        String cleanJson = candidateText.trim();
                        if (cleanJson.startsWith("```json")) {
                            cleanJson = cleanJson.substring(7);
                        }
                        if (cleanJson.startsWith("```")) {
                            cleanJson = cleanJson.substring(3);
                        }
                        if (cleanJson.endsWith("```")) {
                            cleanJson = cleanJson.substring(0, cleanJson.length() - 3);
                        }

                        JsonNode parsed = objectMapper.readTree(cleanJson.trim());
                        String subject = parsed.path("subject").asText();
                        String body = parsed.path("body").asText();

                        if (subject != null && !subject.isBlank() && body != null && !body.isBlank()) {
                            GenerateReminderResponse result = new GenerateReminderResponse(
                                    subject, body, req.getTone(), geminiModel, false
                            );
                            recordAiAction(userId, req.getInvoice_id(), "generate_reminder_copy",
                                    "Tone: " + req.getTone() + ", Invoice: " + req.getInvoice_number(),
                                    geminiModel, subject, body, (int) (System.currentTimeMillis() - startMs), false);
                            return result;
                        }
                    }
                }
            }

            log.warn("[AI Service] Gemini response invalid or non-200 (HTTP {}). Triggering fallback.", response.statusCode());
        } catch (Exception e) {
            log.warn("[AI Service] Exception invoking Gemini AI: {}. Triggering fallback.", e.getMessage());
        }

        GenerateReminderResponse fallback = getDeterministicFallback(req, businessName, senderName);
        recordAiAction(userId, req.getInvoice_id(), "generate_reminder_copy",
                "Tone: " + req.getTone() + ", Invoice: " + req.getInvoice_number(),
                "deterministic-fallback", fallback.getSubject(), fallback.getBody(),
                (int) (System.currentTimeMillis() - startMs), true);
        return fallback;
    }

    private void recordAiAction(UUID userId, UUID invoiceId, String actionType, String promptSummary,
                                String modelUsed, String subject, String body, int latencyMs, boolean isFallback) {
        try {
            AiAction action = new AiAction();
            action.setUserId(userId);
            action.setInvoiceId(invoiceId);
            action.setActionType(actionType);
            action.setPromptSummary(promptSummary);
            action.setModelUsed(modelUsed);
            action.setGeneratedSubject(subject);
            action.setGeneratedBody(body);
            action.setLatencyMs(latencyMs);
            action.setIsFallback(isFallback);
            aiActionRepository.save(action);
        } catch (Exception e) {
            log.warn("[AI Action Log Failed]: {}", e.getMessage());
        }
    }
}
