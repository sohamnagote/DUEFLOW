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

/**
 * Production Email Service supporting user-authenticated Gmail and Microsoft Outlook
 * with RFC-compliant MIME messages, real transactional reminder templates,
 * INR currency formatting, and real PDF invoice attachments.
 */
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
        public String tone = "professional"; // gentle / friendly, professional, firm
        public byte[] pdfAttachmentBytes;
        public String pdfFilename;
        public String pdfAttachmentFilename;
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
        public final String provider; // google, microsoft, none
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
        if (name == null || name.isBlank()) return "DueFlow Reminders";
        return encodeRfc2047(name.trim());
    }

    /**
     * Builds standard RFC 2822 MIME message.
     * When pdfBytes is provided, wraps in multipart/mixed with the PDF attachment.
     */
    public String buildRfc2822MimeMessage(String fromName, String fromEmail, String to, String replyTo,
                                          String subject, String htmlBody, String textBody,
                                          byte[] pdfBytes, String pdfFilename) {
        StringBuilder sb = new StringBuilder();
        sb.append("From: ").append(encodePersonal(fromName)).append(" <").append(fromEmail.trim()).append(">\r\n");
        sb.append("To: ").append(to.trim()).append("\r\n");
        if (replyTo != null && !replyTo.isBlank() && !replyTo.trim().equalsIgnoreCase(fromEmail.trim())) {
            sb.append("Reply-To: ").append(replyTo.trim()).append("\r\n");
        }
        sb.append("Subject: ").append(encodeRfc2047(subject)).append("\r\n");
        sb.append("MIME-Version: 1.0\r\n");

        boolean hasAttachment = (pdfBytes != null && pdfBytes.length > 0);
        String mixedBoundary = "----=_Part_Mixed_" + System.currentTimeMillis() + "_" + UUID.randomUUID().toString().substring(0, 8);
        String altBoundary = "----=_Part_Alt_" + System.currentTimeMillis() + "_" + UUID.randomUUID().toString().substring(0, 8);

        if (hasAttachment) {
            sb.append("Content-Type: multipart/mixed; boundary=\"").append(mixedBoundary).append("\"\r\n\r\n");
            sb.append("--").append(mixedBoundary).append("\r\n");
            sb.append("Content-Type: multipart/alternative; boundary=\"").append(altBoundary).append("\"\r\n\r\n");
        } else {
            sb.append("Content-Type: multipart/alternative; boundary=\"").append(altBoundary).append("\"\r\n\r\n");
        }

        // Plain text part
        sb.append("--").append(altBoundary).append("\r\n");
        sb.append("Content-Type: text/plain; charset=UTF-8\r\n");
        sb.append("Content-Transfer-Encoding: base64\r\n\r\n");
        sb.append(Base64.getMimeEncoder().encodeToString((textBody != null ? textBody : "").getBytes(StandardCharsets.UTF_8))).append("\r\n\r\n");

        // HTML part
        sb.append("--").append(altBoundary).append("\r\n");
        sb.append("Content-Type: text/html; charset=UTF-8\r\n");
        sb.append("Content-Transfer-Encoding: base64\r\n\r\n");
        sb.append(Base64.getMimeEncoder().encodeToString((htmlBody != null ? htmlBody : "").getBytes(StandardCharsets.UTF_8))).append("\r\n\r\n");

        sb.append("--").append(altBoundary).append("--\r\n");

        // Attachment part
        if (hasAttachment) {
            String filename = (pdfFilename != null && !pdfFilename.isBlank()) ? pdfFilename : "Invoice.pdf";
            sb.append("\r\n--").append(mixedBoundary).append("\r\n");
            sb.append("Content-Type: application/pdf; name=\"").append(filename).append("\"\r\n");
            sb.append("Content-Disposition: attachment; filename=\"").append(filename).append("\"\r\n");
            sb.append("Content-Transfer-Encoding: base64\r\n\r\n");
            sb.append(Base64.getMimeEncoder().encodeToString(pdfBytes)).append("\r\n\r\n");
            sb.append("--").append(mixedBoundary).append("--\r\n");
        }

        return sb.toString();
    }

    /**
     * Backward-compatible overload without attachment.
     */
    public String buildRfc2822MimeMessage(String fromName, String fromEmail, String to, String replyTo,
                                          String subject, String htmlBody, String textBody) {
        return buildRfc2822MimeMessage(fromName, fromEmail, to, replyTo, subject, htmlBody, textBody, null, null);
    }

    /**
     * Replaces supported dynamic template placeholders safely.
     */
    public String interpolatePlaceholders(String template, EmailRenderData data, String formattedAmount) {
        if (template == null) return "";
        return template
                .replace("{{client_name}}", data.clientName != null ? data.clientName : "Client")
                .replace("{{invoice_number}}", data.invoiceNumber != null ? data.invoiceNumber : "")
                .replace("{{invoice_amount}}", formattedAmount)
                .replace("{{due_date}}", data.dueDate != null ? data.dueDate : "")
                .replace("{{business_name}}", data.businessName != null ? data.businessName : "Our Team")
                .replace("{{sender_name}}", data.senderName != null ? data.senderName : "Billing Team")
                .replace("{{upi_id}}", data.upiId != null ? data.upiId : "");
    }

    /**
     * Professional, responsive transactional invoice reminder email design.
     * Implements DueFlow 2.0 single-greeting, clean table, and payment card layout.
     */
    public RenderedEmail renderReminderEmail(EmailRenderData data) {
        String formattedAmount = formatINR(data.amount);
        String clientDisplayName = (data.clientName != null && !data.clientName.isBlank()) ? data.clientName : "Client";
        String businessTitle = (data.businessName != null && !data.businessName.isBlank()) ? data.businessName :
                ((data.senderName != null && !data.senderName.isBlank()) ? data.senderName : "DueFlow");
        String senderDisplayName = (data.senderName != null && !data.senderName.isBlank()) ? data.senderName : businessTitle;

        // 1. Subject Resolution
        String subject;
        if (data.customSubject != null && !data.customSubject.isBlank()) {
            subject = interpolatePlaceholders(data.customSubject, data, formattedAmount);
        } else {
            subject = "Payment reminder: Invoice #" + data.invoiceNumber + " | " + formattedAmount + " due " + (data.dueDate != null ? data.dueDate : "");
        }

        // 2. Message Body Resolution
        String messageBody;
        if (data.customBody != null && !data.customBody.isBlank()) {
            messageBody = interpolatePlaceholders(data.customBody, data, formattedAmount);
        } else {
            String toneStr = (data.tone != null) ? data.tone.toLowerCase() : "professional";
            if (toneStr.contains("gentle") || toneStr.contains("friendly")) {
                messageBody = "This is a friendly payment reminder from " + businessTitle +
                        " regarding invoice #" + data.invoiceNumber + " for " + formattedAmount +
                        ", due on " + (data.dueDate != null ? data.dueDate : "the agreed date") + ".\n\n" +
                        "Please find the invoice attached for your reference. Payment details are included below.";
            } else if (toneStr.contains("firm") || toneStr.contains("direct")) {
                messageBody = "This is an important reminder from " + businessTitle +
                        " that invoice #" + data.invoiceNumber + " for " + formattedAmount +
                        " is due on " + (data.dueDate != null ? data.dueDate : "the agreed date") + ".\n\n" +
                        "Please ensure prompt settlement using the attached invoice and payment details below.";
            } else {
                messageBody = "This is a courtesy payment reminder from " + businessTitle +
                        " regarding invoice #" + data.invoiceNumber + " for " + formattedAmount +
                        ", due on " + (data.dueDate != null ? data.dueDate : "the agreed date") + ".\n\n" +
                        "Please find the invoice attached for your reference. Payment details are included below.";
            }
        }

        // 3. Build Responsive HTML
        StringBuilder html = new StringBuilder();
        html.append("<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n<meta charset=\"utf-8\">\n")
            .append("<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n")
            .append("<title>").append(escapeHtml(subject)).append("</title>\n")
            .append("<style>\n")
            .append("body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 24px; -webkit-font-smoothing: antialiased; }\n")
            .append(".container { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 10px; border: 1px solid #e2e8f0; overflow: hidden; }\n")
            .append(".content { padding: 32px 32px 24px; }\n")
            .append(".greeting { font-size: 16px; font-weight: 600; color: #0f172a; margin-bottom: 16px; }\n")
            .append(".body-text { font-size: 14px; line-height: 1.65; color: #334155; margin-bottom: 24px; white-space: pre-line; }\n")
            .append(".section-title { font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; margin: 20px 0 10px; }\n")
            .append(".summary-table { width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 13px; }\n")
            .append(".summary-table td { padding: 8px 12px; border-bottom: 1px solid #f1f5f9; }\n")
            .append(".summary-table tr:last-child td { border-bottom: none; }\n")
            .append(".field-label { color: #64748b; width: 40%; font-weight: 500; }\n")
            .append(".field-val { color: #0f172a; font-weight: 600; text-align: right; }\n")
            .append(".amount-highlight { font-size: 16px; font-weight: 700; color: #5b598b; }\n")
            .append(".pay-card { background: #fbf8ff; border: 1px solid #e3e1ea; border-radius: 8px; padding: 18px; margin-bottom: 24px; }\n")
            .append(".pay-row { font-size: 13px; margin-bottom: 6px; color: #334155; line-height: 1.5; }\n")
            .append(".pay-row strong { color: #1a1b22; }\n")
            .append(".qr-container { text-align: center; margin-top: 14px; padding-top: 14px; border-top: 1px solid #e3e1ea; }\n")
            .append(".qr-img { max-width: 140px; max-height: 140px; border-radius: 6px; border: 1px solid #e3e1ea; display: inline-block; }\n")
            .append(".closing-text { font-size: 13px; line-height: 1.6; color: #64748b; margin-top: 20px; }\n")
            .append(".sign-off { margin-top: 16px; font-size: 14px; font-weight: 500; color: #0f172a; line-height: 1.5; }\n")
            .append(".footer { padding: 16px 32px; background: #f8fafc; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8; text-align: center; }\n")
            .append("</style>\n</head>\n<body>\n")
            .append("<div class=\"container\">\n")
            .append("<div class=\"content\">\n")
            .append("<div class=\"greeting\">Hi ").append(escapeHtml(clientDisplayName)).append(",</div>\n")
            .append("<div class=\"body-text\">").append(escapeHtml(messageBody)).append("</div>\n")
            .append("<div class=\"section-title\">Invoice Summary</div>\n")
            .append("<table class=\"summary-table\">\n")
            .append("<tr><td class=\"field-label\">Invoice number</td><td class=\"field-val\">").append(escapeHtml(data.invoiceNumber)).append("</td></tr>\n");

        if (data.issueDate != null && !data.issueDate.isBlank()) {
            html.append("<tr><td class=\"field-label\">Invoice date</td><td class=\"field-val\">").append(escapeHtml(data.issueDate)).append("</td></tr>\n");
        }
        if (data.dueDate != null && !data.dueDate.isBlank()) {
            html.append("<tr><td class=\"field-label\">Due date</td><td class=\"field-val\">").append(escapeHtml(data.dueDate)).append("</td></tr>\n");
        }
        html.append("<tr><td class=\"field-label\">Amount due</td><td class=\"field-val amount-highlight\">").append(escapeHtml(formattedAmount)).append("</td></tr>\n")
            .append("<tr><td class=\"field-label\">Status</td><td class=\"field-val\" style=\"color: #ba1a1a;\">Unpaid</td></tr>\n")
            .append("</table>\n");

        // Payment Details Box
        boolean hasPaymentDetails = (data.upiId != null && !data.upiId.isBlank()) ||
                (data.bankAccount != null && !data.bankAccount.isBlank()) ||
                (data.paymentNotes != null && !data.paymentNotes.isBlank()) ||
                (data.paymentQrUrl != null && !data.paymentQrUrl.isBlank());

        if (hasPaymentDetails) {
            html.append("<div class=\"section-title\">Payment Details</div>\n")
                .append("<div class=\"pay-card\">\n");

            if (data.upiId != null && !data.upiId.isBlank()) {
                html.append("<div class=\"pay-row\"><strong>UPI ID:</strong> ").append(escapeHtml(data.upiId)).append("</div>\n");
            }
            String beneficiary = (data.senderName != null && !data.senderName.isBlank()) ? data.senderName : businessTitle;
            html.append("<div class=\"pay-row\"><strong>Beneficiary:</strong> ").append(escapeHtml(beneficiary)).append("</div>\n");

            if (data.bankName != null && !data.bankName.isBlank()) {
                html.append("<div class=\"pay-row\"><strong>Bank:</strong> ").append(escapeHtml(data.bankName)).append("</div>\n");
            }
            if (data.bankAccount != null && !data.bankAccount.isBlank()) {
                html.append("<div class=\"pay-row\"><strong>Account:</strong> ").append(escapeHtml(data.bankAccount)).append("</div>\n");
            }
            if (data.bankIfsc != null && !data.bankIfsc.isBlank()) {
                html.append("<div class=\"pay-row\"><strong>IFSC:</strong> ").append(escapeHtml(data.bankIfsc)).append("</div>\n");
            }
            if (data.paymentNotes != null && !data.paymentNotes.isBlank()) {
                html.append("<div class=\"pay-row\" style=\"font-style: italic; margin-top: 6px;\">").append(escapeHtml(data.paymentNotes)).append("</div>\n");
            }

            // Optional Payment QR Image
            if (data.paymentQrUrl != null && !data.paymentQrUrl.isBlank()) {
                html.append("<div class=\"qr-container\">\n")
                    .append("<div style=\"font-size: 11px; font-weight: 600; color: #747878; margin-bottom: 6px;\">Scan with any UPI app</div>\n")
                    .append("<img class=\"qr-img\" src=\"").append(data.paymentQrUrl.trim()).append("\" alt=\"Payment QR\" />\n")
                    .append("</div>\n");
            }

            html.append("</div>\n");
        }

        // Closing & Sign-off
        html.append("<div class=\"closing-text\">")
            .append("Please arrange payment at your convenience. If you have already made the payment, kindly disregard this reminder or let us know so we can update the invoice status.")
            .append("</div>\n")
            .append("<div class=\"sign-off\">")
            .append("Regards,<br><strong>").append(escapeHtml(senderDisplayName)).append("</strong><br>")
            .append(escapeHtml(businessTitle));

        if (data.senderEmail != null && !data.senderEmail.isBlank()) {
            html.append("<br><span style=\"color: #64748b; font-size: 12px;\">").append(escapeHtml(data.senderEmail)).append("</span>");
        }
        if (data.senderPhone != null && !data.senderPhone.isBlank()) {
            html.append("<span style=\"color: #64748b; font-size: 12px;\"> • ").append(escapeHtml(data.senderPhone)).append("</span>");
        }

        html.append("</div>\n")
            .append("</div>\n") // end content
            .append("<div class=\"footer\">")
            .append("Payment reminder for invoice #").append(escapeHtml(data.invoiceNumber)).append(".")
            .append("</div>\n</div>\n</body>\n</html>");

        // 4. Plain-text Fallback
        StringBuilder text = new StringBuilder();
        text.append("Hi ").append(clientDisplayName).append(",\n\n")
            .append(messageBody).append("\n\n")
            .append("INVOICE SUMMARY\n")
            .append("Invoice number: ").append(data.invoiceNumber).append("\n");
        if (data.issueDate != null) text.append("Invoice date: ").append(data.issueDate).append("\n");
        if (data.dueDate != null) text.append("Due date: ").append(data.dueDate).append("\n");
        text.append("Amount due: ").append(formattedAmount).append("\n")
            .append("Status: Unpaid\n\n");

        if (hasPaymentDetails) {
            text.append("PAYMENT DETAILS\n");
            if (data.upiId != null && !data.upiId.isBlank()) text.append("UPI ID: ").append(data.upiId).append("\n");
            text.append("Beneficiary: ").append((data.senderName != null && !data.senderName.isBlank()) ? data.senderName : businessTitle).append("\n");
            if (data.bankName != null && !data.bankName.isBlank()) text.append("Bank: ").append(data.bankName).append("\n");
            if (data.bankAccount != null && !data.bankAccount.isBlank()) text.append("Account: ").append(data.bankAccount).append("\n");
            if (data.bankIfsc != null && !data.bankIfsc.isBlank()) text.append("IFSC: ").append(data.bankIfsc).append("\n");
            if (data.paymentNotes != null && !data.paymentNotes.isBlank()) text.append("Notes: ").append(data.paymentNotes).append("\n");
            text.append("\n");
        }

        text.append("Please arrange payment at your convenience. If you have already made the payment, kindly disregard this reminder.\n\n")
            .append("Regards,\n")
            .append(senderDisplayName).append("\n")
            .append(businessTitle);
        if (data.senderEmail != null) text.append("\n").append(data.senderEmail);
        text.append("\n\nFooter: Payment reminder for invoice #").append(data.invoiceNumber).append(".\n");

        return new RenderedEmail(subject, html.toString(), text.toString());
    }

    /**
     * Primary dispatch method resolving user's connected integration (Gmail / Outlook).
     * Zero Resend fallback.
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

        log.warn("[EmailService] No personal integration (Gmail/Outlook) connected for dispatch to {}", to);
        return new SendResult(
                false,
                null,
                "No connected email account (Gmail or Outlook) found. Please connect your Gmail or Outlook account in Settings to send reminders.",
                "none",
                false
        );
    }

    public SendResult sendEmail(String to, String replyTo, EmailRenderData data) {
        return sendEmail(null, to, replyTo, data);
    }

    /**
     * Outbound delivery via user's connected Gmail integration.
     */
    public SendResult sendViaGmail(Integration integration, String to, String replyTo, RenderedEmail rendered, EmailRenderData data) {
        boolean valid = ensureValidGoogleToken(integration);
        if (!valid) {
            log.warn("[Gmail] Token invalid and refresh failed for user {}", integration.getUserId());
            return new SendResult(false, null, "Google authorization expired. Please reconnect in Settings.", "google", false);
        }

        String accessToken = getDecryptedAccessToken(integration);
        String fromEmail = integration.getProviderEmail() != null && !integration.getProviderEmail().isBlank()
                ? integration.getProviderEmail()
                : (data.senderEmail != null ? data.senderEmail : "me");

        String fromName = data.businessName != null && !data.businessName.isBlank()
                ? data.businessName
                : (data.senderName != null ? data.senderName : "DueFlow");

        try {
            String effectiveFilename = (data.pdfAttachmentFilename != null && !data.pdfAttachmentFilename.isBlank())
                    ? data.pdfAttachmentFilename
                    : ((data.pdfFilename != null && !data.pdfFilename.isBlank()) ? data.pdfFilename : "Invoice.pdf");
            String mimeString = buildRfc2822MimeMessage(
                    fromName, fromEmail, to, replyTo,
                    rendered.subject, rendered.html, rendered.text,
                    data.pdfAttachmentBytes, effectiveFilename
            );
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

    public boolean ensureValidGoogleToken(Integration integration) {
        Instant expiresAt = integration.getTokenExpiresAt();
        if (expiresAt == null || expiresAt.isBefore(Instant.now().plusSeconds(60))) {
            return refreshGoogleToken(integration);
        }
        String token = getDecryptedAccessToken(integration);
        return token != null && !token.isBlank();
    }

    public boolean refreshGoogleToken(Integration integration) {
        String refreshToken = getDecryptedRefreshToken(integration);
        if (refreshToken == null || refreshToken.isBlank()) {
            integration.setStatus("RECONNECT_REQUIRED");
            integration.setLastErrorCode("NO_REFRESH_TOKEN");
            integration.setLastErrorMessage("No refresh token available. Please reconnect Google in Settings.");
            if (integrationRepository != null) integrationRepository.save(integration);
            return false;
        }

        if (googleClientId == null || googleClientId.isBlank() || googleClientSecret == null || googleClientSecret.isBlank()) {
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
     * Outbound delivery via user's connected Microsoft Outlook / Microsoft Graph integration.
     */
    public SendResult sendViaMicrosoft(Integration integration, String to, String replyTo, RenderedEmail rendered, EmailRenderData data) {
        boolean valid = ensureValidMicrosoftToken(integration);
        if (!valid) {
            return new SendResult(false, null, "Microsoft authorization expired. Please reconnect in Settings.", "microsoft", false);
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

            // Real PDF Attachment for Microsoft Graph
            if (data.pdfAttachmentBytes != null && data.pdfAttachmentBytes.length > 0) {
                String filename = (data.pdfAttachmentFilename != null && !data.pdfAttachmentFilename.isBlank())
                        ? data.pdfAttachmentFilename
                        : ((data.pdfFilename != null && !data.pdfFilename.isBlank()) ? data.pdfFilename : "Invoice.pdf");
                Map<String, Object> attachment = Map.of(
                        "@odata.type", "#microsoft.graph.fileAttachment",
                        "name", filename,
                        "contentType", "application/pdf",
                        "contentBytes", Base64.getEncoder().encodeToString(data.pdfAttachmentBytes)
                );
                message.put("attachments", List.of(attachment));
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

    public String escapeHtml(String text) {
        if (text == null) return "";
        return text.replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;")
                .replace("'", "&#39;");
    }
}
