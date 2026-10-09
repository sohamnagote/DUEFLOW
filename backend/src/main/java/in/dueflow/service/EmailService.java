package in.dueflow.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import in.dueflow.entity.Integration;
import in.dueflow.repository.IntegrationRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.text.NumberFormat;
import java.time.Duration;
import java.time.Instant;
import java.util.*;

@Service
public class EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);

    @Autowired(required = false)
    private IntegrationRepository integrationRepository;

    @Value("${GOOGLE_CLIENT_ID:}")
    private String googleClientId;

    @Value("${GOOGLE_CLIENT_SECRET:}")
    private String googleClientSecret;

    @Value("${MICROSOFT_CLIENT_ID:}")
    private String microsoftClientId;

    @Value("${MICROSOFT_CLIENT_SECRET:}")
    private String microsoftClientSecret;

    @Value("${RESEND_API_KEY:}")
    private String resendApiKey;

    @Value("${RESEND_FROM_EMAIL:DueFlow Reminders <reminders@dueflow.in>}")
    private String resendFromEmail;

    @Value("${RESEND_WEBHOOK_SECRET:}")
    private String resendWebhookSecret;

    @Autowired(required = false)
    private EncryptionService encryptionService;

    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;

    public EmailService() {
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(12))
                .build();
        this.objectMapper = new ObjectMapper();
    }

    public EmailService(IntegrationRepository integrationRepository, ObjectMapper objectMapper) {
        this.integrationRepository = integrationRepository;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(12))
                .build();
        this.objectMapper = objectMapper != null ? objectMapper : new ObjectMapper();
    }

    public void setEncryptionService(EncryptionService encryptionService) {
        this.encryptionService = encryptionService;
    }

    public String getDecryptedAccessToken(Integration integration) {
        if (integration == null || integration.getAccessTokenEncrypted() == null) return null;
        if (encryptionService != null) {
            return encryptionService.decrypt(integration.getAccessTokenEncrypted());
        }
        return integration.getAccessTokenEncrypted();
    }

    public String getDecryptedRefreshToken(Integration integration) {
        if (integration == null || integration.getRefreshTokenEncrypted() == null) return null;
        if (encryptionService != null) {
            return encryptionService.decrypt(integration.getRefreshTokenEncrypted());
        }
        return integration.getRefreshTokenEncrypted();
    }

    public String encryptToken(String token) {
        if (token == null) return null;
        if (encryptionService != null) {
            return encryptionService.encrypt(token);
        }
        return token;
    }

    public static class EmailRenderData {
        public String invoiceNumber;
        public BigDecimal amount;
        public String dueDate;
        public String issueDate;
        public String clientName;
        public String clientEmail;
        public String businessName;
        public String senderName;
        public String senderEmail;
        public String senderPhone;
        public String senderAddress;
        public String upiId;
        public String bankAccount;
        public String bankIfsc;
        public String bankName;
        public String paymentNotes;
        public String paymentQrUrl;
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
        public final String provider; // google, microsoft, resend, none
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

    /**
     * Encodes header strings in RFC 2047 format if they contain non-ASCII characters (e.g. ₹).
     */
    public String encodeRfc2047(String text) {
        if (text == null) return "";
        boolean isAscii = StandardCharsets.US_ASCII.newEncoder().canEncode(text);
        if (isAscii && !text.contains("=?")) {
            return text;
        }
        String b64 = Base64.getEncoder().encodeToString(text.getBytes(StandardCharsets.UTF_8));
        return "=?UTF-8?B?" + b64 + "?=";
    }

    public String encodePersonal(String name) {
        if (name == null || name.isBlank()) return "DueFlow";
        return encodeRfc2047(name.trim());
    }

    /**
     * Builds standard RFC 2822 MIME message with multipart/alternative (plain text & HTML).
     */
    public String buildRfc2822MimeMessage(String fromName, String fromEmail, String to, String replyTo, String subject, String htmlBody, String textBody) {
        String boundary = "----=_Part_" + System.currentTimeMillis() + "_" + UUID.randomUUID().toString().substring(0, 8);
        StringBuilder sb = new StringBuilder();
        sb.append("From: ").append(encodePersonal(fromName)).append(" <").append(fromEmail.trim()).append(">\r\n");
        sb.append("To: ").append(to.trim()).append("\r\n");
        if (replyTo != null && !replyTo.isBlank() && !replyTo.trim().equalsIgnoreCase(fromEmail.trim())) {
            sb.append("Reply-To: ").append(replyTo.trim()).append("\r\n");
        }
        sb.append("Subject: ").append(encodeRfc2047(subject)).append("\r\n");
        sb.append("MIME-Version: 1.0\r\n");
        sb.append("Content-Type: multipart/alternative; boundary=\"").append(boundary).append("\"\r\n");
        sb.append("\r\n");

        // Plain text part
        sb.append("--").append(boundary).append("\r\n");
        sb.append("Content-Type: text/plain; charset=UTF-8\r\n");
        sb.append("Content-Transfer-Encoding: base64\r\n\r\n");
        sb.append(Base64.getMimeEncoder().encodeToString((textBody != null ? textBody : "").getBytes(StandardCharsets.UTF_8))).append("\r\n\r\n");

        // HTML part
        sb.append("--").append(boundary).append("\r\n");
        sb.append("Content-Type: text/html; charset=UTF-8\r\n");
        sb.append("Content-Transfer-Encoding: base64\r\n\r\n");
        sb.append(Base64.getMimeEncoder().encodeToString((htmlBody != null ? htmlBody : "").getBytes(StandardCharsets.UTF_8))).append("\r\n\r\n");

        sb.append("--").append(boundary).append("--\r\n");
        return sb.toString();
    }

    /**
     * Minimal, professional HTML reminder email design.
     */
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
                subject = "Payment reminder: Invoice #" + data.invoiceNumber + " due " + (data.dueDate != null ? data.dueDate : "");
            }
        }

        if (bodyText == null || bodyText.isBlank()) {
            if ("gentle".equalsIgnoreCase(data.tone)) {
                bodyText = "Hi " + (data.clientName != null ? data.clientName : "there") + ",\n\nI hope you're having a productive week! Just sending a gentle reminder regarding invoice #" +
                        data.invoiceNumber + " for " + formattedAmount + ", due on " + data.dueDate + ".\n\nPlease let us know if you need any additional invoice copies or settlement details. Thank you!";
            } else if ("firm".equalsIgnoreCase(data.tone)) {
                bodyText = "Dear " + (data.clientName != null ? data.clientName : "Client") + ",\n\nOur records show that invoice #" + data.invoiceNumber + " for " +
                        formattedAmount + " was due on " + data.dueDate + " and remains unsettled.\n\nPrompt payment is required to maintain good standing and uninterrupted service delivery. Please remit payment via bank transfer or UPI today.";
            } else if ("urgent".equalsIgnoreCase(data.tone)) {
                bodyText = "Dear " + (data.clientName != null ? data.clientName : "Client") + ",\n\nInvoice #" + data.invoiceNumber + " (" + formattedAmount + ") is now significantly past due. Despite prior reminders, payment has not been received.\n\nPlease process this payment immediately or contact us directly today to confirm transaction details.";
            } else {
                bodyText = "Dear " + (data.clientName != null ? data.clientName : "Client") + ",\n\nThis is a courtesy reminder regarding invoice #" + data.invoiceNumber +
                        " for the amount of " + formattedAmount + ", due on " + data.dueDate + ".\n\nThank you for your prompt attention to this matter.";
            }
        }

        String senderTitle = (data.businessName != null && !data.businessName.isBlank()) ? data.businessName :
                ((data.senderName != null && !data.senderName.isBlank()) ? data.senderName : "DueFlow");

        StringBuilder html = new StringBuilder();
        html.append("<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n<meta charset=\"utf-8\">\n")
            .append("<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n")
            .append("<title>").append(escapeHtml(subject)).append("</title>\n")
            .append("<style>\n")
            .append("body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #0f172a; margin: 0; padding: 24px; -webkit-font-smoothing: antialiased; }\n")
            .append(".wrapper { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }\n")
            .append(".header { padding: 28px 32px 20px; border-bottom: 1px solid #f1f5f9; }\n")
            .append(".brand { font-size: 18px; font-weight: 700; color: #0f172a; letter-spacing: -0.02em; margin: 0; }\n")
            .append(".content { padding: 28px 32px; }\n")
            .append(".greeting { font-size: 15px; font-weight: 600; color: #0f172a; margin-bottom: 14px; }\n")
            .append(".message { font-size: 14px; line-height: 1.65; color: #334155; white-space: pre-line; margin-bottom: 24px; }\n")
            .append(".invoice-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 20px; margin-bottom: 24px; }\n")
            .append(".item-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 13px; }\n")
            .append(".item-label { color: #64748b; font-weight: 500; }\n")
            .append(".item-val { color: #0f172a; font-weight: 600; text-align: right; }\n")
            .append(".total-row { display: flex; justify-content: space-between; align-items: baseline; border-top: 1px solid #e2e8f0; padding-top: 12px; margin-top: 12px; font-size: 14px; }\n")
            .append(".total-label { font-weight: 600; color: #0f172a; }\n")
            .append(".total-val { font-size: 20px; font-weight: 700; color: #0f172a; }\n")
            .append(".pay-box { background: #fdf2f8; border: 1px solid #fbcfe8; border-radius: 10px; padding: 20px; margin-bottom: 24px; }\n")
            .append(".pay-title { font-size: 12px; font-weight: 700; color: #9d174d; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 12px; }\n")
            .append(".pay-detail { font-size: 13px; line-height: 1.6; color: #831843; margin-bottom: 4px; }\n")
            .append(".qr-card { text-align: center; padding: 16px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; margin-top: 16px; }\n")
            .append(".qr-img { max-width: 160px; max-height: 160px; display: inline-block; border-radius: 6px; }\n")
            .append(".footer { padding: 20px 32px; background: #f8fafc; border-top: 1px solid #f1f5f9; font-size: 12px; color: #64748b; text-align: center; line-height: 1.5; }\n")
            .append("</style>\n</head>\n<body>\n")
            .append("<div class=\"wrapper\">\n")
            .append("<div class=\"header\"><h1 class=\"brand\">").append(escapeHtml(senderTitle)).append("</h1></div>\n")
            .append("<div class=\"content\">\n")
            .append("<div class=\"greeting\">Dear ").append(escapeHtml(data.clientName != null ? data.clientName : "Client")).append(",</div>\n")
            .append("<div class=\"message\">").append(escapeHtml(bodyText)).append("</div>\n")
            .append("<div class=\"invoice-box\">\n")
            .append("<table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" style=\"font-size: 13px;\">\n")
            .append("<tr><td style=\"color: #64748b; padding-bottom: 6px;\">Invoice Number</td><td align=\"right\" style=\"font-weight: 600; color: #0f172a;\">").append(escapeHtml(data.invoiceNumber)).append("</td></tr>\n");

        if (data.dueDate != null && !data.dueDate.isBlank()) {
            html.append("<tr><td style=\"color: #64748b; padding-bottom: 6px;\">Due Date</td><td align=\"right\" style=\"font-weight: 600; color: #0f172a;\">").append(escapeHtml(data.dueDate)).append("</td></tr>\n");
        }

        html.append("<tr><td colspan=\"2\" style=\"border-top: 1px solid #e2e8f0; padding-top: 10px;\">")
            .append("<table width=\"100%\"><tr>")
            .append("<td style=\"font-weight: 600; color: #0f172a; font-size: 14px;\">Amount Due</td>")
            .append("<td align=\"right\" style=\"font-size: 20px; font-weight: 700; color: #0f172a;\">").append(escapeHtml(formattedAmount)).append("</td>")
            .append("</tr></table></td></tr>\n")
            .append("</table>\n</div>\n");

        boolean hasPaymentInfo = (data.upiId != null && !data.upiId.isBlank()) ||
                (data.bankAccount != null && !data.bankAccount.isBlank()) ||
                (data.paymentNotes != null && !data.paymentNotes.isBlank()) ||
                (data.paymentQrUrl != null && !data.paymentQrUrl.isBlank());

        if (hasPaymentInfo) {
            html.append("<div class=\"pay-box\">\n")
                .append("<p class=\"pay-title\">Payment Instructions</p>\n");

            if (data.upiId != null && !data.upiId.isBlank()) {
                html.append("<div class=\"pay-detail\"><strong>UPI ID:</strong> ").append(escapeHtml(data.upiId)).append("</div>\n");
            }
            if (data.bankName != null && !data.bankName.isBlank()) {
                html.append("<div class=\"pay-detail\"><strong>Bank:</strong> ").append(escapeHtml(data.bankName)).append("</div>\n");
            }
            if (data.bankAccount != null && !data.bankAccount.isBlank()) {
                html.append("<div class=\"pay-detail\"><strong>Account Number:</strong> ").append(escapeHtml(data.bankAccount)).append("</div>\n");
            }
            if (data.bankIfsc != null && !data.bankIfsc.isBlank()) {
                html.append("<div class=\"pay-detail\"><strong>IFSC Code:</strong> ").append(escapeHtml(data.bankIfsc)).append("</div>\n");
            }
            if (data.paymentNotes != null && !data.paymentNotes.isBlank()) {
                html.append("<div class=\"pay-detail\" style=\"margin-top: 8px; font-style: italic;\">").append(escapeHtml(data.paymentNotes)).append("</div>\n");
            }

            // Embed Payment QR code image if present
            if (data.paymentQrUrl != null && !data.paymentQrUrl.isBlank()) {
                html.append("<div class=\"qr-card\">\n")
                    .append("<div style=\"font-size: 12px; font-weight: 600; color: #334155; margin-bottom: 8px;\">Scan with any UPI app to pay</div>\n")
                    .append("<img class=\"qr-img\" src=\"").append(data.paymentQrUrl.trim()).append("\" alt=\"Payment QR Code\" />\n")
                    .append("</div>\n");
            }

            html.append("</div>\n");
        }

        html.append("</div>\n") // end content
            .append("<div class=\"footer\">\n")
            .append("Sent by ").append(escapeHtml(senderTitle));

        if (data.senderEmail != null && !data.senderEmail.isBlank()) {
            html.append(" (").append(escapeHtml(data.senderEmail)).append(")");
        }
        if (data.senderPhone != null && !data.senderPhone.isBlank()) {
            html.append(" • ").append(escapeHtml(data.senderPhone));
        }

        html.append("<br><span style=\"color: #94a3b8; font-size: 11px;\">Invoice reminder notification</span>\n")
            .append("</div>\n</div>\n</body>\n</html>");

        // Text representation
        StringBuilder text = new StringBuilder();
        text.append("Dear ").append(data.clientName != null ? data.clientName : "Client").append(",\n\n")
            .append(bodyText).append("\n\n")
            .append("--- INVOICE DETAILS ---\n")
            .append("Invoice: ").append(data.invoiceNumber).append("\n")
            .append("Due Date: ").append(data.dueDate).append("\n")
            .append("Amount Due: ").append(formattedAmount).append("\n\n");

        if (hasPaymentInfo) {
            text.append("--- PAYMENT INSTRUCTIONS ---\n");
            if (data.upiId != null && !data.upiId.isBlank()) text.append("UPI ID: ").append(data.upiId).append("\n");
            if (data.bankName != null && !data.bankName.isBlank()) text.append("Bank: ").append(data.bankName).append("\n");
            if (data.bankAccount != null && !data.bankAccount.isBlank()) text.append("Account: ").append(data.bankAccount).append("\n");
            if (data.bankIfsc != null && !data.bankIfsc.isBlank()) text.append("IFSC: ").append(data.bankIfsc).append("\n");
            if (data.paymentNotes != null && !data.paymentNotes.isBlank()) text.append("Note: ").append(data.paymentNotes).append("\n");
            text.append("\n");
        }

        text.append("---\n").append(senderTitle);
        if (data.senderEmail != null && !data.senderEmail.isBlank()) text.append(" (").append(data.senderEmail).append(")");
        text.append("\n");

        return new RenderedEmail(subject, html.toString(), text.toString());
    }

    /**
     * Primary dispatch method resolving user's connected integration.
     */
    public SendResult sendEmail(UUID userId, String to, String replyTo, EmailRenderData data) {
        if (to == null || to.isBlank() || !to.contains("@")) {
            return new SendResult(false, null, "Invalid recipient email address: " + to, "none", false);
        }

        RenderedEmail rendered = renderReminderEmail(data);

        // 1. If user ID is provided, check for connected Google or Microsoft integration
        if (userId != null && integrationRepository != null) {
            Optional<Integration> googleOpt = integrationRepository.findByUserIdAndProvider(userId, "google");
            if (googleOpt.isPresent()) {
                Integration google = googleOpt.get();
                if ("CONNECTED".equalsIgnoreCase(google.getStatus()) || (google.getRefreshTokenEncrypted() != null && !google.getRefreshTokenEncrypted().isBlank())) {
                    log.info("[EmailService] Sending email to {} using user's connected Gmail integration", to);
                    return sendViaGmail(google, to, replyTo, rendered, data);
                }
            }

            Optional<Integration> msOpt = integrationRepository.findByUserIdAndProvider(userId, "microsoft");
            if (msOpt.isPresent()) {
                Integration ms = msOpt.get();
                if ("CONNECTED".equalsIgnoreCase(ms.getStatus()) || (ms.getRefreshTokenEncrypted() != null && !ms.getRefreshTokenEncrypted().isBlank())) {
                    log.info("[EmailService] Sending email to {} using user's connected Microsoft Outlook integration", to);
                    return sendViaMicrosoft(ms, to, replyTo, rendered, data);
                }
            }
        }

        // 2. Fallback to Resend if configured
        if (resendApiKey != null && !resendApiKey.isBlank() && !resendApiKey.contains("your_api_key") && !resendApiKey.contains("re_your_api_key")) {
            log.info("[EmailService] Sending email to {} using Resend delivery provider", to);
            return sendViaResend(to, replyTo, rendered, data);
        }

        log.warn("[EmailService] No personal integration (Gmail/Outlook) or Resend API key configured for dispatch to {}", to);
        return new SendResult(
                false,
                null,
                "No active email provider. Please connect your Gmail or Outlook account in Settings to send emails.",
                "none",
                false
        );
    }

    /**
     * Backward-compatible overload.
     */
    public SendResult sendEmail(String to, String replyTo, EmailRenderData data) {
        return sendEmail(null, to, replyTo, data);
    }

    /**
     * Sends message via Gmail API (users.messages.send) using RFC 2822 MIME format.
     */
    public SendResult sendViaGmail(Integration integration, String to, String replyTo, RenderedEmail rendered, EmailRenderData data) {
        // Ensure access token is valid; refresh if expired
        boolean tokenValid = ensureValidGoogleToken(integration);
        if (!tokenValid) {
            return new SendResult(
                    false,
                    null,
                    "Gmail connection expired or revoked. Please reconnect your Google account in Settings.",
                    "google",
                    false
            );
        }

        String accessToken = getDecryptedAccessToken(integration);
        String fromEmail = integration.getProviderEmail() != null && !integration.getProviderEmail().isBlank()
                ? integration.getProviderEmail()
                : (data.senderEmail != null ? data.senderEmail : "me");

        String fromName = data.businessName != null && !data.businessName.isBlank()
                ? data.businessName
                : (data.senderName != null ? data.senderName : "DueFlow");

        try {
            String mimeString = buildRfc2822MimeMessage(fromName, fromEmail, to, replyTo, rendered.subject, rendered.html, rendered.text);
            String rawBase64Url = Base64.getUrlEncoder().withoutPadding().encodeToString(mimeString.getBytes(StandardCharsets.UTF_8));

            Map<String, String> payload = Map.of("raw", rawBase64Url);
            String jsonBody = objectMapper.writeValueAsString(payload);

            HttpRequest req = HttpRequest.newBuilder()
                    .uri(URI.create("https://gmail.googleapis.com/gmail/v1/users/me/messages/send"))
                    .header("Authorization", "Bearer " + accessToken)
                    .header("Content-Type", "application/json")
                    .timeout(Duration.ofSeconds(15))
                    .POST(HttpRequest.BodyPublishers.ofString(jsonBody, StandardCharsets.UTF_8))
                    .build();

            HttpResponse<String> resp = httpClient.send(req, HttpResponse.BodyHandlers.ofString());

            if (resp.statusCode() == 401) {
                // Token might have just expired, try single refresh & retry
                log.info("[Gmail] Received 401, refreshing token and retrying dispatch...");
                boolean refreshed = refreshGoogleToken(integration);
                if (refreshed) {
                    return sendViaGmail(integration, to, replyTo, rendered, data);
                }
                return new SendResult(false, null, "Gmail authorization expired. Please reconnect in Settings.", "google", false);
            }

            if (resp.statusCode() >= 200 && resp.statusCode() < 300) {
                JsonNode resJson = objectMapper.readTree(resp.body());
                String messageId = resJson.path("id").asText(null);
                log.info("[Gmail] Message accepted by Gmail API for delivery to {}. Message ID: {}", to, messageId);

                integration.setLastSuccessAt(Instant.now());
                integration.setLastErrorCode(null);
                integration.setLastErrorMessage(null);
                if (integrationRepository != null) integrationRepository.save(integration);

                return new SendResult(true, messageId, null, "google", false);
            } else {
                String errMsg = "Gmail API rejected request (" + resp.statusCode() + ")";
                try {
                    JsonNode errNode = objectMapper.readTree(resp.body());
                    if (errNode.has("error") && errNode.get("error").has("message")) {
                        errMsg = errNode.get("error").get("message").asText();
                    }
                } catch (Exception ignored) {}

                log.warn("[Gmail] API returned HTTP {}: {}", resp.statusCode(), errMsg);
                integration.setLastErrorCode("HTTP_" + resp.statusCode());
                integration.setLastErrorMessage(errMsg);
                if (resp.statusCode() == 403) {
                    integration.setStatus("RECONNECT_REQUIRED");
                }
                if (integrationRepository != null) integrationRepository.save(integration);

                boolean retryable = resp.statusCode() >= 500 || resp.statusCode() == 429;
                return new SendResult(false, null, errMsg, "google", retryable);
            }
        } catch (Exception e) {
            log.error("[Gmail] Exception during send: {}", e.getMessage(), e);
            return new SendResult(false, null, "Network error during Gmail dispatch: " + e.getMessage(), "google", true);
        }
    }

    /**
     * Checks if Google token is valid and refreshes if expiring soon.
     */
    public boolean ensureValidGoogleToken(Integration integration) {
        Instant expiresAt = integration.getTokenExpiresAt();
        if (expiresAt == null || expiresAt.isBefore(Instant.now().plusSeconds(60))) {
            log.info("[Gmail] Token expired or expiring soon, refreshing...");
            return refreshGoogleToken(integration);
        }
        String token = getDecryptedAccessToken(integration);
        return token != null && !token.isBlank();
    }

    /**
     * Refreshes Google OAuth access token using refresh token.
     */
    public boolean refreshGoogleToken(Integration integration) {
        String refreshToken = getDecryptedRefreshToken(integration);
        if (refreshToken == null || refreshToken.isBlank()) {
            log.warn("[Gmail] No refresh token on record for user {}", integration.getUserId());
            integration.setStatus("RECONNECT_REQUIRED");
            integration.setLastErrorCode("NO_REFRESH_TOKEN");
            integration.setLastErrorMessage("No refresh token available. Please reconnect Google in Settings.");
            if (integrationRepository != null) integrationRepository.save(integration);
            return false;
        }

        if (googleClientId == null || googleClientId.isBlank() || googleClientSecret == null || googleClientSecret.isBlank()) {
            log.warn("[Gmail] GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET not configured on server");
            return false;
        }

        try {
            String formBody = "client_id=" + URLEncoder.encode(googleClientId.trim(), StandardCharsets.UTF_8)
                    + "&client_secret=" + URLEncoder.encode(googleClientSecret.trim(), StandardCharsets.UTF_8)
                    + "&refresh_token=" + URLEncoder.encode(refreshToken.trim(), StandardCharsets.UTF_8)
                    + "&grant_type=refresh_token";

            HttpRequest req = HttpRequest.newBuilder()
                    .uri(URI.create("https://oauth2.googleapis.com/token"))
                    .header("Content-Type", "application/x-www-form-urlencoded")
                    .timeout(Duration.ofSeconds(15))
                    .POST(HttpRequest.BodyPublishers.ofString(formBody, StandardCharsets.UTF_8))
                    .build();

            HttpResponse<String> resp = httpClient.send(req, HttpResponse.BodyHandlers.ofString());
            JsonNode data = objectMapper.readTree(resp.body());

            if (resp.statusCode() < 200 || resp.statusCode() >= 300 || data.has("error")) {
                String errCode = data.path("error").asText("REFRESH_FAILED");
                String errDesc = data.path("error_description").asText("Refresh token expired or revoked");
                log.warn("[Gmail] Token refresh failed: {} - {}", errCode, errDesc);

                integration.setStatus("RECONNECT_REQUIRED");
                integration.setLastErrorCode(errCode);
                integration.setLastErrorMessage(errDesc);
                if (integrationRepository != null) integrationRepository.save(integration);
                return false;
            }

            String newAccessToken = data.path("access_token").asText(null);
            long expiresIn = data.path("expires_in").asLong(3599);

            if (newAccessToken != null && !newAccessToken.isBlank()) {
                integration.setAccessTokenEncrypted(encryptToken(newAccessToken));
                integration.setTokenExpiresAt(Instant.now().plusSeconds(expiresIn));
                integration.setStatus("CONNECTED");
                integration.setLastErrorCode(null);
                integration.setLastErrorMessage(null);
                if (integrationRepository != null) integrationRepository.save(integration);
                log.info("[Gmail] Successfully refreshed access token for user {}", integration.getUserId());
                return true;
            }
        } catch (Exception e) {
            log.error("[Gmail] Token refresh exception: {}", e.getMessage(), e);
        }
        return false;
    }

    /**
     * Sends message via Microsoft Graph API.
     */
    public SendResult sendViaMicrosoft(Integration integration, String to, String replyTo, RenderedEmail rendered, EmailRenderData data) {
        boolean tokenValid = ensureValidMicrosoftToken(integration);
        if (!tokenValid) {
            return new SendResult(
                    false,
                    null,
                    "Microsoft Outlook connection expired. Please reconnect your account in Settings.",
                    "microsoft",
                    false
            );
        }

        String accessToken = getDecryptedAccessToken(integration);
        try {
            Map<String, Object> message = new HashMap<>();
            message.put("subject", rendered.subject);

            Map<String, String> bodyMap = Map.of(
                    "contentType", "HTML",
                    "content", rendered.html
            );
            message.put("body", bodyMap);

            List<Map<String, Object>> recipients = List.of(
                    Map.of("emailAddress", Map.of("address", to.trim()))
            );
            message.put("toRecipients", recipients);

            if (replyTo != null && !replyTo.isBlank()) {
                message.put("replyTo", List.of(Map.of("emailAddress", Map.of("address", replyTo.trim()))));
            }

            Map<String, Object> payload = Map.of(
                    "message", message,
                    "saveToSentItems", "true"
            );

            HttpRequest req = HttpRequest.newBuilder()
                    .uri(URI.create("https://graph.microsoft.com/v1.0/me/sendMail"))
                    .header("Authorization", "Bearer " + accessToken)
                    .header("Content-Type", "application/json")
                    .timeout(Duration.ofSeconds(15))
                    .POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(payload), StandardCharsets.UTF_8))
                    .build();

            HttpResponse<String> resp = httpClient.send(req, HttpResponse.BodyHandlers.ofString());

            if (resp.statusCode() == 401) {
                boolean refreshed = refreshMicrosoftToken(integration);
                if (refreshed) {
                    return sendViaMicrosoft(integration, to, replyTo, rendered, data);
                }
                return new SendResult(false, null, "Microsoft authorization expired. Please reconnect in Settings.", "microsoft", false);
            }

            if (resp.statusCode() == 202 || (resp.statusCode() >= 200 && resp.statusCode() < 300)) {
                String messageId = "ms_" + UUID.randomUUID().toString();
                log.info("[Microsoft] Successfully dispatched email to {}", to);
                integration.setLastSuccessAt(Instant.now());
                if (integrationRepository != null) integrationRepository.save(integration);
                return new SendResult(true, messageId, null, "microsoft", false);
            } else {
                String errMsg = "Microsoft Graph error " + resp.statusCode() + ": " + resp.body();
                log.warn("[Microsoft] Send failed: {}", errMsg);
                boolean retryable = resp.statusCode() >= 500;
                return new SendResult(false, null, errMsg, "microsoft", retryable);
            }
        } catch (Exception e) {
            log.error("[Microsoft] Exception: {}", e.getMessage(), e);
            return new SendResult(false, null, "Microsoft dispatch error: " + e.getMessage(), "microsoft", true);
        }
    }

    public boolean ensureValidMicrosoftToken(Integration integration) {
        Instant expiresAt = integration.getTokenExpiresAt();
        if (expiresAt == null || expiresAt.isBefore(Instant.now().plusSeconds(60))) {
            return refreshMicrosoftToken(integration);
        }
        String token = getDecryptedAccessToken(integration);
        return token != null && !token.isBlank();
    }

    public boolean refreshMicrosoftToken(Integration integration) {
        String refreshToken = getDecryptedRefreshToken(integration);
        if (refreshToken == null || refreshToken.isBlank()) return false;
        if (microsoftClientId == null || microsoftClientId.isBlank() || microsoftClientSecret == null || microsoftClientSecret.isBlank()) return false;

        try {
            String formBody = "client_id=" + URLEncoder.encode(microsoftClientId.trim(), StandardCharsets.UTF_8)
                    + "&client_secret=" + URLEncoder.encode(microsoftClientSecret.trim(), StandardCharsets.UTF_8)
                    + "&refresh_token=" + URLEncoder.encode(refreshToken.trim(), StandardCharsets.UTF_8)
                    + "&grant_type=refresh_token";

            HttpRequest req = HttpRequest.newBuilder()
                    .uri(URI.create("https://login.microsoftonline.com/common/oauth2/v2.0/token"))
                    .header("Content-Type", "application/x-www-form-urlencoded")
                    .timeout(Duration.ofSeconds(15))
                    .POST(HttpRequest.BodyPublishers.ofString(formBody, StandardCharsets.UTF_8))
                    .build();

            HttpResponse<String> resp = httpClient.send(req, HttpResponse.BodyHandlers.ofString());
            JsonNode data = objectMapper.readTree(resp.body());

            if (resp.statusCode() < 200 || resp.statusCode() >= 300 || data.has("error")) {
                integration.setStatus("RECONNECT_REQUIRED");
                if (integrationRepository != null) integrationRepository.save(integration);
                return false;
            }

            String newAccessToken = data.path("access_token").asText(null);
            long expiresIn = data.path("expires_in").asLong(3599);
            if (newAccessToken != null && !newAccessToken.isBlank()) {
                integration.setAccessTokenEncrypted(encryptToken(newAccessToken));
                integration.setTokenExpiresAt(Instant.now().plusSeconds(expiresIn));
                integration.setStatus("CONNECTED");
                if (integrationRepository != null) integrationRepository.save(integration);
                return true;
            }
        } catch (Exception ignored) {}
        return false;
    }

    /**
     * Outbound delivery via Resend.
     */
    public SendResult sendViaResend(String to, String replyTo, RenderedEmail rendered, EmailRenderData data) {
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
            long ts = Long.parseLong(svixTimestamp);
            long now = Instant.now().getEpochSecond();
            if (Math.abs(now - ts) > 300) {
                log.warn("[Svix] Webhook timestamp skew too large: {} vs now {}", ts, now);
                return false;
            }

            String cleanSecret = resendWebhookSecret.trim();
            if (cleanSecret.startsWith("whsec_")) {
                cleanSecret = cleanSecret.substring("whsec_".length());
            }

            byte[] secretBytes;
            try {
                secretBytes = Base64.getDecoder().decode(cleanSecret);
            } catch (IllegalArgumentException e) {
                secretBytes = cleanSecret.getBytes(StandardCharsets.UTF_8);
            }

            String signedPayload = svixId + "." + svixTimestamp + "." + rawBody;

            javax.crypto.Mac mac = javax.crypto.Mac.getInstance("HmacSHA256");
            mac.init(new javax.crypto.spec.SecretKeySpec(secretBytes, "HmacSHA256"));
            byte[] hash = mac.doFinal(signedPayload.getBytes(StandardCharsets.UTF_8));
            String expectedSig = Base64.getEncoder().encodeToString(hash);

            String[] passedSignatures = svixSignature.split(" ");
            for (String sigPart : passedSignatures) {
                String sig = sigPart.trim();
                if (sig.startsWith("v1,")) {
                    sig = sig.substring(3);
                }
                if (java.security.MessageDigest.isEqual(expectedSig.getBytes(StandardCharsets.UTF_8), sig.getBytes(StandardCharsets.UTF_8))) {
                    return true;
                }
            }
            return false;
        } catch (Exception e) {
            log.error("[Svix] Error verifying signature: {}", e.getMessage());
            return false;
        }
    }

    private String escapeHtml(String text) {
        if (text == null) return "";
        return text.replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;")
                .replace("'", "&#39;");
    }
}
