package com.dueflow.service;

import com.dueflow.domain.Invoice;
import com.dueflow.domain.PaymentSettings;
import com.dueflow.domain.UserProfile;
import com.dueflow.exception.ValidationException;
import com.dueflow.repository.PaymentSettingsRepository;
import com.dueflow.repository.UserProfileRepository;
import com.google.api.client.googleapis.javanet.GoogleNetHttpTransport;
import com.google.api.client.http.HttpRequestInitializer;
import com.google.api.client.json.gson.GsonFactory;
import com.google.api.services.gmail.Gmail;
import com.google.api.services.gmail.model.Message;
import com.google.auth.http.HttpCredentialsAdapter;
import com.google.auth.oauth2.UserCredentials;
import jakarta.activation.DataHandler;
import jakarta.activation.DataSource;
import jakarta.mail.MessagingException;
import jakarta.mail.Session;
import jakarta.mail.internet.*;
import jakarta.mail.util.ByteArrayDataSource;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.security.GeneralSecurityException;
import java.time.Instant;
import java.util.Base64;
import java.util.Properties;

@Service
public class GmailSenderService {

    private static final Logger log = LoggerFactory.getLogger(GmailSenderService.class);

    private final String clientId;
    private final String clientSecret;
    private final String frontendBaseUrl;
    private final GmailOAuthService gmailOAuthService;
    private final PdfGenerationService pdfGenerationService;
    private final UserProfileRepository userProfileRepository;
    private final PaymentSettingsRepository paymentSettingsRepository;
    private final com.dueflow.repository.InvoiceRepository invoiceRepository;

    public GmailSenderService(
            @Value("${dueflow.google.client-id:}") String clientId,
            @Value("${dueflow.google.client-secret:}") String clientSecret,
            @Value("${dueflow.frontend.base-url:https://dueflow-kappa.vercel.app}") String frontendBaseUrl,
            GmailOAuthService gmailOAuthService,
            PdfGenerationService pdfGenerationService,
            UserProfileRepository userProfileRepository,
            PaymentSettingsRepository paymentSettingsRepository,
            com.dueflow.repository.InvoiceRepository invoiceRepository) {
        this.clientId = clientId;
        this.clientSecret = clientSecret;
        this.frontendBaseUrl = frontendBaseUrl != null ? frontendBaseUrl.replaceAll("/+$", "") : "https://dueflow-kappa.vercel.app";
        this.gmailOAuthService = gmailOAuthService;
        this.pdfGenerationService = pdfGenerationService;
        this.userProfileRepository = userProfileRepository;
        this.paymentSettingsRepository = paymentSettingsRepository;
        this.invoiceRepository = invoiceRepository;
    }


    /**
     * Sends an email reminder with PDF attachment using the user's connected Gmail account.
     *
     * @param invoice The invoice to remind about
     * @param subject The email subject line
     * @param customBody Optional custom message body
     * @return The Gmail message ID
     */
    public String sendInvoiceReminder(Invoice invoice, String subject, String customBody) {
        String userId = invoice.getUserId();
        String refreshToken = gmailOAuthService.getDecryptedRefreshToken(userId);
        if (refreshToken == null) {
            throw new ValidationException("User does not have an active Gmail integration. Please connect Gmail in Settings.");
        }

        String senderEmail = gmailOAuthService.getSenderEmail(userId);
        UserProfile profile = userProfileRepository.findById(userId).orElse(null);
        PaymentSettings paymentSettings = paymentSettingsRepository.findByUserId(userId).orElse(null);

        String businessName = profile != null && profile.getFullName() != null && !profile.getFullName().isBlank() 
                ? profile.getFullName() : "DueFlow Invoicing";
        String recipientEmail = invoice.getClient().getEmail();
        if (recipientEmail == null || recipientEmail.isBlank()) {
            throw new ValidationException("Client does not have a valid email address");
        }

        // Ensure invoice has a response token for one-click responses
        if (invoice.getResponseToken() == null || invoice.getResponseToken().isBlank()) {
            invoice.setResponseToken(java.util.UUID.randomUUID().toString().replace("-", "") + java.util.UUID.randomUUID().toString().replace("-", ""));
            invoice.setResponseTokenExpiry(Instant.now().plus(60, java.time.temporal.ChronoUnit.DAYS));
        }

        try {
            Gmail gmail = buildGmailClient(refreshToken);
            byte[] pdfBytes = pdfGenerationService.generateInvoicePdf(invoice);

            String bodyHtml = buildEmailHtml(invoice, businessName, profile, paymentSettings, customBody);

            MimeMessage mimeMessage = createMimeMessage(
                    senderEmail,
                    businessName,
                    recipientEmail,
                    subject != null ? subject : "Payment Reminder: Invoice #" + invoice.getInvoiceNumber(),
                    bodyHtml,
                    pdfBytes,
                    invoice.getInvoiceNumber() + ".pdf"
            );

            ByteArrayOutputStream buffer = new ByteArrayOutputStream();
            mimeMessage.writeTo(buffer);
            String encodedEmail = Base64.getUrlEncoder().withoutPadding().encodeToString(buffer.toByteArray());

            Message message = new Message();
            message.setRaw(encodedEmail);

            Message sentMessage = gmail.users().messages().send("me", message).execute();
            if (sentMessage.getThreadId() != null) {
                invoice.setGmailThreadId(sentMessage.getThreadId());
            }
            if (invoiceRepository != null) {
                invoiceRepository.save(invoice);
            }
            log.info("Successfully sent reminder for invoice {} via Gmail. Message ID: {}, Thread ID: {}", invoice.getInvoiceNumber(), sentMessage.getId(), sentMessage.getThreadId());
            return sentMessage.getId();
        } catch (GeneralSecurityException | IOException | MessagingException e) {
            log.error("Failed to dispatch invoice reminder email: {}", e.getMessage(), e);

            throw new RuntimeException("Gmail dispatch failed: " + e.getMessage(), e);
        }
    }

    private Gmail buildGmailClient(String refreshToken) throws GeneralSecurityException, IOException {
        UserCredentials credentials = UserCredentials.newBuilder()
                .setClientId(clientId)
                .setClientSecret(clientSecret)
                .setRefreshToken(refreshToken)
                .build();

        HttpRequestInitializer requestInitializer = new HttpCredentialsAdapter(credentials);

        return new Gmail.Builder(
                GoogleNetHttpTransport.newTrustedTransport(),
                GsonFactory.getDefaultInstance(),
                requestInitializer)
                .setApplicationName("DueFlow")
                .build();
    }

    private MimeMessage createMimeMessage(
            String senderEmail,
            String senderName,
            String recipientEmail,
            String subject,
            String bodyHtml,
            byte[] pdfAttachmentBytes,
            String attachmentFileName) throws MessagingException {

        Properties props = new Properties();
        Session session = Session.getDefaultInstance(props, null);

        MimeMessage message = new MimeMessage(session);
        try {
            message.setFrom(new InternetAddress(senderEmail, senderName));
        } catch (Exception e) {
            message.setFrom(new InternetAddress(senderEmail));
        }
        message.addRecipient(jakarta.mail.Message.RecipientType.TO, new InternetAddress(recipientEmail));
        message.setSubject(subject, "UTF-8");

        MimeMultipart multipart = new MimeMultipart("mixed");

        // HTML Body
        MimeBodyPart bodyPart = new MimeBodyPart();
        bodyPart.setContent(bodyHtml, "text/html; charset=UTF-8");
        multipart.addBodyPart(bodyPart);

        // PDF Attachment
        if (pdfAttachmentBytes != null && pdfAttachmentBytes.length > 0) {
            MimeBodyPart attachmentPart = new MimeBodyPart();
            DataSource dataSource = new ByteArrayDataSource(pdfAttachmentBytes, "application/pdf");
            attachmentPart.setDataHandler(new DataHandler(dataSource));
            attachmentPart.setFileName(attachmentFileName);
            multipart.addBodyPart(attachmentPart);
        }

        message.setContent(multipart);
        return message;
    }

    private String buildEmailHtml(Invoice invoice, String businessName, UserProfile profile, PaymentSettings settings, String customBody) {
        StringBuilder sb = new StringBuilder();
        sb.append("<!DOCTYPE html><html><body style=\"font-family: Arial, sans-serif; color: #1e293b; line-height: 1.6; max-width: 600px; margin: 0 auto; padding: 20px;\">");
        sb.append("<div style=\"border-bottom: 2px solid #06b6d4; padding-bottom: 12px; margin-bottom: 20px;\">");
        sb.append("<h2 style=\"margin: 0; color: #0f172a;\">").append(businessName).append("</h2>");
        sb.append("<p style=\"margin: 4px 0 0; color: #64748b; font-size: 14px;\">Invoice Reminder</p>");
        sb.append("</div>");

        sb.append("<p>Dear <strong>").append(invoice.getClient().getName()).append("</strong>,</p>");

        if (customBody != null && !customBody.isBlank()) {
            sb.append("<p>").append(customBody.replace("\n", "<br/>")).append("</p>");
        } else {
            sb.append("<p>This is a gentle reminder that payment for Invoice <strong>#")
                    .append(invoice.getInvoiceNumber()).append("</strong> is due on <strong>")
                    .append(invoice.getDueDate()).append("</strong>.</p>");
        }

        sb.append("<div style=\"background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 20px 0;\">");
        sb.append("<table style=\"width: 100%; border-collapse: collapse;\">");
        sb.append("<tr><td style=\"color: #64748b;\">Invoice Number:</td><td style=\"font-weight: 600; text-align: right;\">#").append(invoice.getInvoiceNumber()).append("</td></tr>");
        sb.append("<tr><td style=\"color: #64748b;\">Amount Due:</td><td style=\"font-weight: 700; color: #0891b2; font-size: 18px; text-align: right;\">")
                .append(invoice.getCurrency()).append(" ").append(invoice.getTotalAmount()).append("</td></tr>");
        sb.append("<tr><td style=\"color: #64748b;\">Due Date:</td><td style=\"font-weight: 600; text-align: right;\">").append(invoice.getDueDate()).append("</td></tr>");
        sb.append("</table>");
        sb.append("</div>");

        // Settlement / Payment Details
        if (settings != null) {
            sb.append("<div style=\"border-top: 1px solid #e2e8f0; padding-top: 16px; margin-top: 20px;\">");
            sb.append("<h4 style=\"margin: 0 0 10px; color: #334155;\">Payment Instructions</h4>");
            if (settings.getUpiId() != null && !settings.getUpiId().isBlank()) {
                sb.append("<p style=\"margin: 4px 0;\"><strong>UPI ID:</strong> ").append(settings.getUpiId()).append("</p>");
            }
            if (settings.getBeneficiaryName() != null && !settings.getBeneficiaryName().isBlank()) {
                sb.append("<p style=\"margin: 4px 0;\"><strong>Account Name:</strong> ").append(settings.getBeneficiaryName()).append("</p>");
                sb.append("<p style=\"margin: 4px 0;\"><strong>Account Number:</strong> ").append(settings.getAccountNumber()).append("</p>");
                if (settings.getRoutingNumber() != null && !settings.getRoutingNumber().isBlank()) {
                    sb.append("<p style=\"margin: 4px 0;\"><strong>IFSC / Routing Code:</strong> ").append(settings.getRoutingNumber()).append("</p>");
                }
                if (settings.getBankName() != null) {
                    sb.append("<p style=\"margin: 4px 0;\"><strong>Bank:</strong> ").append(settings.getBankName()).append("</p>");
                }
            }
            if (settings.getPaymentInstructions() != null && !settings.getPaymentInstructions().isBlank()) {
                sb.append("<p style=\"margin: 8px 0; color: #475569;\">").append(settings.getPaymentInstructions().replace("\n", "<br/>")).append("</p>");
            }
            if (settings.getQrCodeUrl() != null && !settings.getQrCodeUrl().isBlank()) {
                sb.append("<div style=\"margin-top: 14px;\">");
                sb.append("<p style=\"margin: 0 0 6px; font-weight: 600; color: #334155;\">Scan QR Code to Pay:</p>");
                sb.append("<img src=\"").append(settings.getQrCodeUrl()).append("\" alt=\"Payment QR Code\" style=\"max-width: 180px; height: auto; border: 1px solid #e2e8f0; border-radius: 8px; padding: 6px; background-color: #ffffff;\" />");
                sb.append("</div>");
            }
            sb.append("</div>");
        }

        // One-Click Client Response Button
        if (invoice.getResponseToken() != null && !invoice.getResponseToken().isBlank()) {
            String responseUrl = frontendBaseUrl + "/respond?token=" + invoice.getResponseToken();
            sb.append("<div style=\"margin: 24px 0; padding: 18px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; text-align: center;\">");
            sb.append("<p style=\"margin: 0 0 8px; font-weight: 600; color: #1e293b; font-size: 15px;\">Need to update payment status or request changes?</p>");
            sb.append("<p style=\"margin: 0 0 14px; color: #64748b; font-size: 13px;\">Respond securely with one click &mdash; no login required.</p>");
            sb.append("<a href=\"").append(responseUrl).append("\" style=\"display: inline-block; background-color: #0284c7; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 14px; padding: 10px 22px; border-radius: 6px;\">Respond to Invoice #").append(invoice.getInvoiceNumber()).append("</a>");
            sb.append("</div>");
        }

        sb.append("<p style=\"margin-top: 24px; font-size: 14px; color: #64748b;\">Please find the official PDF invoice attached to this email.</p>");
        sb.append("<p style=\"font-size: 14px; color: #64748b;\">Thank you for your business!</p>");
        sb.append("<p style=\"font-size: 13px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 12px;\">Automated by DueFlow Invoicing</p>");
        sb.append("</body></html>");


        return sb.toString();
    }
}
