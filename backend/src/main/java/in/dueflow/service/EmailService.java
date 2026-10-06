package in.dueflow.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.math.BigDecimal;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.text.NumberFormat;
import java.time.Duration;
import java.util.*;

@Service
public class EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);

    @Value("${RESEND_API_KEY:}")
    private String resendApiKey;

    @Value("${RESEND_FROM_EMAIL:DueFlow Reminders <reminders@dueflow.in>}")
    private String resendFromEmail;

    @Value("${RESEND_WEBHOOK_SECRET:}")
    private String resendWebhookSecret;

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();
    private final ObjectMapper objectMapper = new ObjectMapper();

    public static class EmailRenderData {
        public String invoiceNumber;
        public BigDecimal amount;
        public String dueDate;
        public String clientName;
        public String clientEmail;
        public String businessName;
        public String senderName;
        public String senderEmail;
        public String upiId;
        public String bankAccount;
        public String bankIfsc;
        public String notes;
        public String customSubject;
        public String customBody;
        public String stageName;
        public String tone = "professional"; // gentle, professional, firm, urgent
    }

    public static class RenderedEmail {
        public final String subject;
        public final String html;
        public final String text;

        public RenderedEmail(String subject, String html, String text) {
            this.subject = subject;
            this.html = html;
            this.text = text;
        }
    }

    public static class SendResult {
        public final boolean success;
        public final String providerMessageId;
        public final String error;
        public final String provider;
        public final boolean retryable;

        public SendResult(boolean success, String providerMessageId, String error, String provider, boolean retryable) {
            this.success = success;
            this.providerMessageId = providerMessageId;
            this.error = error;
            this.provider = provider;
            this.retryable = retryable;
        }
    }

    public String formatINR(BigDecimal val) {
        if (val == null) return "₹0.00";
        NumberFormat nf = NumberFormat.getCurrencyInstance(new Locale("en", "IN"));
        return nf.format(val).replace("INR", "₹").trim();
    }

    public RenderedEmail renderReminderEmail(EmailRenderData data) {
        String formattedAmount = formatINR(data.amount);
        String subject = data.customSubject;
        String bodyText = data.customBody;

        if (subject == null || subject.isBlank()) {
            if ("gentle".equalsIgnoreCase(data.tone)) {
                subject = "Friendly check-in: Invoice #" + data.invoiceNumber + " (" + formattedAmount + ")";
            } else if ("firm".equalsIgnoreCase(data.tone)) {
                subject = "ACTION REQUIRED: Overdue invoice #" + data.invoiceNumber + " (" + formattedAmount + ")";
            } else if ("urgent".equalsIgnoreCase(data.tone)) {
                subject = "FINAL NOTICE: Immediate settlement required for invoice #" + data.invoiceNumber;
            } else {
                subject = "Payment reminder: Invoice #" + data.invoiceNumber + " due " + data.dueDate;
            }
        }

        if (bodyText == null || bodyText.isBlank()) {
            if ("gentle".equalsIgnoreCase(data.tone)) {
                bodyText = "Hi " + data.clientName + ",\n\nI hope you're having a productive week! Just sending a gentle reminder regarding invoice #" +
                        data.invoiceNumber + " for " + formattedAmount + ", due on " + data.dueDate + ".\n\nPlease let us know if you need any additional invoice copies or settlement details. Thank you!";
            } else if ("firm".equalsIgnoreCase(data.tone)) {
                bodyText = "Dear " + data.clientName + ",\n\nOur records show that invoice #" + data.invoiceNumber + " for " +
                        formattedAmount + " was due on " + data.dueDate + " and remains unsettled.\n\nPrompt payment is required to maintain good standing and uninterrupted service delivery. Please remit payment via bank transfer or UPI today.";
            } else if ("urgent".equalsIgnoreCase(data.tone)) {
                bodyText = "Dear " + data.clientName + ",\n\nInvoice #" + data.invoiceNumber + " (" + formattedAmount + ") is now significantly past due. Despite prior reminders, payment has not been received.\n\nPlease process this payment immediately or contact us directly today to confirm transaction details.";
            } else {
                bodyText = "Dear " + data.clientName + ",\n\nThis is a courtesy reminder regarding invoice #" + data.invoiceNumber +
                        " for the amount of " + formattedAmount + ", due on " + data.dueDate + ".\n\nThank you for your prompt attention to this matter.";
            }
        }

        String senderTitle = (data.businessName != null && !data.businessName.isBlank()) ? data.businessName :
                ((data.senderName != null && !data.senderName.isBlank()) ? data.senderName : "DueFlow Invoicing");

        StringBuilder html = new StringBuilder();
        html.append("<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n<meta charset=\"utf-8\">\n")
            .append("<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n")
            .append("<title>").append(escapeHtml(subject)).append("</title>\n")
            .append("<style>\n")
            .append("body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 24px; }\n")
            .append(".container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0; overflow: hidden; }\n")
            .append(".header { background: #0f172a; padding: 24px 32px; color: #ffffff; }\n")
            .append(".header h1 { margin: 0; font-size: 20px; font-weight: 600; letter-spacing: -0.02em; }\n")
            .append(".header p { margin: 4px 0 0; font-size: 13px; color: #94a3b8; }\n")
            .append(".content { padding: 32px; }\n")
            .append(".greeting { font-size: 16px; margin-bottom: 16px; }\n")
            .append(".body-copy { font-size: 15px; line-height: 1.6; color: #334155; white-space: pre-line; margin-bottom: 24px; }\n")
            .append(".invoice-card { background: #f1f5f9; border-radius: 6px; padding: 20px; margin: 24px 0; border: 1px solid #e2e8f0; }\n")
            .append(".row { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 14px; }\n")
            .append(".label { color: #64748b; font-weight: 500; }\n")
            .append(".val { font-weight: 600; color: #0f172a; }\n")
            .append(".amount-val { font-size: 18px; color: #4338ca; }\n")
            .append(".payment-details { background: #fdf4ff; border: 1px solid #f0abfc; border-radius: 6px; padding: 16px; margin: 24px 0; }\n")
            .append(".payment-title { font-size: 13px; font-weight: 700; color: #701a75; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px; }\n")
            .append(".footer { padding: 24px 32px; background: #f8fafc; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8; text-align: center; }\n")
            .append("</style>\n</head>\n<body>\n")
            .append("<div class=\"container\">\n")
            .append("<div class=\"header\"><h1>").append(escapeHtml(senderTitle)).append("</h1><p>Automated payment ledger reminder</p></div>\n")
            .append("<div class=\"content\">\n")
            .append("<div class=\"greeting\">Dear ").append(escapeHtml(data.clientName != null ? data.clientName : "Client")).append(",</div>\n")
            .append("<div class=\"body-copy\">").append(escapeHtml(bodyText)).append("</div>\n")
            .append("<div class=\"invoice-card\">\n")
            .append("<div class=\"row\"><span class=\"label\">Invoice Reference</span><span class=\"val\">").append(escapeHtml(data.invoiceNumber)).append("</span></div>\n")
            .append("<div class=\"row\"><span class=\"label\">Due Date</span><span class=\"val\">").append(escapeHtml(data.dueDate)).append("</span></div>\n")
            .append("<div class=\"row\"><span class=\"label\">Total Payable</span><span class=\"val amount-val\">").append(escapeHtml(formattedAmount)).append("</span></div>\n")
            .append("</div>\n");

        if ((data.upiId != null && !data.upiId.isBlank()) || (data.bankAccount != null && !data.bankAccount.isBlank())) {
            html.append("<div class=\"payment-details\">\n")
                .append("<div class=\"payment-title\">Payment Settlement Instructions</div>\n");
            if (data.upiId != null && !data.upiId.isBlank()) {
                html.append("<div class=\"row\"><span class=\"label\">UPI ID:</span><span class=\"val\">").append(escapeHtml(data.upiId)).append("</span></div>\n");
            }
            if (data.bankAccount != null && !data.bankAccount.isBlank()) {
                html.append("<div class=\"row\"><span class=\"label\">Bank Account:</span><span class=\"val\">").append(escapeHtml(data.bankAccount)).append("</span></div>\n");
            }
            if (data.bankIfsc != null && !data.bankIfsc.isBlank()) {
                html.append("<div class=\"row\"><span class=\"label\">IFSC Code:</span><span class=\"val\">").append(escapeHtml(data.bankIfsc)).append("</span></div>\n");
            }
            html.append("</div>\n");
        }

        if (data.notes != null && !data.notes.isBlank()) {
            html.append("<p style=\"font-size: 13px; color: #64748b; font-style: italic;\">Note: ").append(escapeHtml(data.notes)).append("</p>\n");
        }

        html.append("</div>\n")
            .append("<div class=\"footer\">Sent via DueFlow on behalf of ").append(escapeHtml(senderTitle))
            .append(" (").append(escapeHtml(data.senderEmail != null ? data.senderEmail : "")).append(").</div>\n")
            .append("</div>\n</body>\n</html>");

        StringBuilder text = new StringBuilder();
        text.append("Dear ").append(data.clientName).append(",\n\n")
            .append(bodyText).append("\n\n---\nINVOICE DETAILS\n")
            .append("Invoice Number: ").append(data.invoiceNumber).append("\n")
            .append("Amount: ").append(formattedAmount).append("\n")
            .append("Due Date: ").append(data.dueDate).append("\n");

        if (data.upiId != null && !data.upiId.isBlank()) text.append("UPI ID: ").append(data.upiId).append("\n");
        if (data.bankAccount != null && !data.bankAccount.isBlank()) {
            text.append("Bank Account: ").append(data.bankAccount).append("\n");
            if (data.bankIfsc != null && !data.bankIfsc.isBlank()) text.append("IFSC: ").append(data.bankIfsc).append("\n");
        }
        if (data.notes != null && !data.notes.isBlank()) text.append("Note: ").append(data.notes).append("\n");
        text.append("---\nSent via DueFlow on behalf of ").append(senderTitle).append(" (").append(data.senderEmail).append(").\n");

        return new RenderedEmail(subject, html.toString(), text.toString());
    }

    public SendResult sendEmail(String to, String replyTo, EmailRenderData data) {
        RenderedEmail rendered = renderReminderEmail(data);

        if (resendApiKey == null || resendApiKey.isBlank() || resendApiKey.contains("your_api_key") || resendApiKey.contains("re_your_api_key")) {
            log.error("[Resend] Delivery rejected: RESEND_API_KEY is not configured with real credentials.");
            return new SendResult(false, null, "Resend API key is not configured with valid credentials", "resend", false);
        }

        try {
            Map<String, Object> payload = new HashMap<>();
            payload.put("from", resendFromEmail != null && !resendFromEmail.isBlank() ? resendFromEmail : "DueFlow Reminders <reminders@dueflow.in>");
            payload.put("to", List.of(to));
            if (replyTo != null && !replyTo.isBlank()) {
                payload.put("reply_to", replyTo);
            }
            payload.put("subject", rendered.subject);
            payload.put("html", rendered.html);
            payload.put("text", rendered.text);

            String requestBody = objectMapper.writeValueAsString(payload);

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create("https://api.resend.com/emails"))
                    .header("Authorization", "Bearer " + resendApiKey.trim())
                    .header("Content-Type", "application/json")
                    .timeout(Duration.ofSeconds(15))
                    .POST(HttpRequest.BodyPublishers.ofString(requestBody, StandardCharsets.UTF_8))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() >= 200 && response.statusCode() < 300) {
                JsonNode resJson = objectMapper.readTree(response.body());
                String messageId = resJson.path("id").asText(null);
                log.info("[Resend] Successfully accepted email delivery. Message ID: {}", messageId);
                return new SendResult(true, messageId, null, "resend", false);
            } else {
                log.warn("[Resend] API returned HTTP {}: {}", response.statusCode(), response.body());
                String errorMsg = "Resend API error " + response.statusCode();
                try {
                    JsonNode errJson = objectMapper.readTree(response.body());
                    if (errJson.has("message")) errorMsg = errJson.get("message").asText();
                } catch (Exception ignored) {}
                boolean retryable = response.statusCode() >= 500 || response.statusCode() == 429;
                return new SendResult(false, null, errorMsg, "resend", retryable);
            }
        } catch (Exception e) {
            log.error("[Resend] Exception occurred during email dispatch: {}", e.getMessage(), e);
            return new SendResult(false, null, e.getMessage(), "resend", true);
        }
    }

    /**
     * Verifies Svix signature for Resend Webhooks using HMAC-SHA256.
     */
    public boolean verifyWebhookSignature(String rawBody, String svixId, String svixTimestamp, String svixSignature) {
        if (resendWebhookSecret == null || resendWebhookSecret.isBlank()) {
            return false;
        }

        if (svixSignature == null || svixTimestamp == null || svixId == null) {
            return false;
        }

        try {
            // Secret can have prefix "whsec_"
            String secretKey = resendWebhookSecret.startsWith("whsec_")
                    ? resendWebhookSecret.substring("whsec_".length())
                    : resendWebhookSecret;

            byte[] keyBytes = Base64.getDecoder().decode(secretKey);

            String toSign = svixId + "." + svixTimestamp + "." + rawBody;

            Mac mac = Mac.getInstance("HmacSHA256");
            SecretKeySpec secretKeySpec = new SecretKeySpec(keyBytes, "HmacSHA256");
            mac.init(secretKeySpec);

            byte[] hmacBytes = mac.doFinal(toSign.getBytes(StandardCharsets.UTF_8));
            String expectedSignature = Base64.getEncoder().encodeToString(hmacBytes);

            // svixSignature format may contain "v1,signature v1,signature2"
            String[] signatures = svixSignature.split(" ");
            for (String sig : signatures) {
                String cleanSig = sig.startsWith("v1,") ? sig.substring(3) : sig;
                if (MessageDigest.isEqual(cleanSig.getBytes(StandardCharsets.UTF_8), expectedSignature.getBytes(StandardCharsets.UTF_8))) {
                    return true;
                }
            }
            return false;
        } catch (Exception e) {
            log.warn("[Webhook Verification Error]: {}", e.getMessage());
            return false;
        }
    }

    private String escapeHtml(String input) {
        if (input == null) return "";
        return input.replace("&", "&amp;")
                    .replace("<", "&lt;")
                    .replace(">", "&gt;")
                    .replace("\"", "&quot;")
                    .replace("'", "&#39;");
    }
}
