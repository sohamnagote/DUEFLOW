package com.dueflow.service;

import com.dueflow.domain.*;
import com.dueflow.repository.*;
import com.google.api.client.googleapis.javanet.GoogleNetHttpTransport;
import com.google.api.client.http.HttpRequestInitializer;
import com.google.api.client.json.gson.GsonFactory;
import com.google.api.services.gmail.Gmail;
import com.google.api.services.gmail.model.ListMessagesResponse;
import com.google.api.services.gmail.model.Message;
import com.google.api.services.gmail.model.MessagePartHeader;
import com.google.auth.http.HttpCredentialsAdapter;
import com.google.auth.oauth2.UserCredentials;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.security.GeneralSecurityException;
import java.time.Instant;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class GmailReplySyncService {

    private static final Logger log = LoggerFactory.getLogger(GmailReplySyncService.class);

    private final String clientId;
    private final String clientSecret;
    private final GmailOAuthService gmailOAuthService;
    private final GmailIntegrationRepository gmailIntegrationRepository;
    private final ProcessedGmailMessageRepository processedMessageRepository;
    private final InvoiceRepository invoiceRepository;
    private final ScheduledReminderRepository scheduledReminderRepository;
    private final ReminderHistoryRepository reminderHistoryRepository;
    private final NotificationService notificationService;

    public GmailReplySyncService(
            @Value("${dueflow.google.client-id:}") String clientId,
            @Value("${dueflow.google.client-secret:}") String clientSecret,
            GmailOAuthService gmailOAuthService,
            GmailIntegrationRepository gmailIntegrationRepository,
            ProcessedGmailMessageRepository processedMessageRepository,
            InvoiceRepository invoiceRepository,
            ScheduledReminderRepository scheduledReminderRepository,
            ReminderHistoryRepository reminderHistoryRepository,
            NotificationService notificationService) {
        this.clientId = clientId;
        this.clientSecret = clientSecret;
        this.gmailOAuthService = gmailOAuthService;
        this.gmailIntegrationRepository = gmailIntegrationRepository;
        this.processedMessageRepository = processedMessageRepository;
        this.invoiceRepository = invoiceRepository;
        this.scheduledReminderRepository = scheduledReminderRepository;
        this.reminderHistoryRepository = reminderHistoryRepository;
        this.notificationService = notificationService;
    }

    /**
     * Periodic background synchronization for all users with active Gmail integrations and readonly scope.
     * Runs every 5 minutes.
     */
    @Scheduled(fixedDelay = 300_000, initialDelay = 60_000)
    public void runPeriodicSync() {
        List<GmailIntegration> activeIntegrations = gmailIntegrationRepository.findAll();
        for (GmailIntegration integration : activeIntegrations) {
            if ("CONNECTED".equalsIgnoreCase(integration.getConnectionStatus())
                    && integration.getGrantedScopes() != null
                    && integration.getGrantedScopes().contains("gmail.readonly")) {
                try {
                    syncRepliesForUser(integration.getUserId());
                } catch (Exception e) {
                    log.warn("Periodic Gmail sync failed for user {}: {}", integration.getUserId(), e.getMessage());
                }
            }
        }
    }

    /**
     * Synchronize and detect replies for a specific user.
     * Safe, incremental, restart-safe, and idempotent.
     *
     * @return Number of new replies detected and processed
     */
    @Transactional
    public int syncRepliesForUser(String userId) {
        Optional<GmailIntegration> opt = gmailIntegrationRepository.findByUserId(userId);
        if (opt.isEmpty()) return 0;
        GmailIntegration integration = opt.get();

        if (!"CONNECTED".equalsIgnoreCase(integration.getConnectionStatus())) {
            return 0;
        }

        if (integration.getGrantedScopes() == null || !integration.getGrantedScopes().contains("gmail.readonly")) {
            log.debug("User {} does not have gmail.readonly scope. Skipping reply detection.", userId);
            return 0;
        }

        String refreshToken = gmailOAuthService.getDecryptedRefreshToken(userId);
        if (refreshToken == null) return 0;

        Gmail gmail;
        try {
            gmail = buildGmailClient(refreshToken);
        } catch (Exception e) {
            log.error("Failed to build Gmail client for reply sync: {}", e.getMessage());
            return 0;
        }

        String userEmail = integration.getGmailEmail();
        int repliesProcessed = 0;

        try {
            // Find invoices with existing active threads or pending follow-ups
            List<Invoice> activeInvoices = invoiceRepository.findByUserIdOrderByCreatedAtDesc(userId);
            Set<String> threadIdsToWatch = new HashSet<>();
            Map<String, Invoice> threadToInvoice = new HashMap<>();

            for (Invoice inv : activeInvoices) {
                if (inv.getGmailThreadId() != null && !inv.getGmailThreadId().isBlank()) {
                    threadIdsToWatch.add(inv.getGmailThreadId());
                    threadToInvoice.put(inv.getGmailThreadId(), inv);
                }
            }

            // Sync threads
            for (String threadId : threadIdsToWatch) {
                try {
                    var thread = gmail.users().threads().get("me", threadId).execute();
                    if (thread != null && thread.getMessages() != null) {
                        for (Message msg : thread.getMessages()) {
                            if (processedMessageRepository.existsByGmailMessageId(msg.getId())) {
                                continue;
                            }

                            // Fetch full message details if snippet/headers needed
                            Message fullMsg = gmail.users().messages().get("me", msg.getId()).setFormat("full").execute();
                            String fromHeader = getHeader(fullMsg, "From");
                            String subjectHeader = getHeader(fullMsg, "Subject");
                            String senderEmail = extractEmail(fromHeader);

                            // Skip messages sent BY the user themselves (only inspect incoming client replies)
                            if (senderEmail != null && senderEmail.equalsIgnoreCase(userEmail)) {
                                markMessageProcessed(userId, fullMsg.getId(), threadId, threadToInvoice.get(threadId).getId(), senderEmail, subjectHeader, fullMsg.getSnippet(), "OUTGOING", "SKIPPED_SELF_SENT");
                                continue;
                            }

                            // Process this incoming reply
                            Invoice matchedInvoice = threadToInvoice.get(threadId);
                            boolean handled = processIncomingReply(userId, fullMsg, matchedInvoice, senderEmail, subjectHeader);
                            if (handled) {
                                repliesProcessed++;
                            }
                        }
                    }
                } catch (Exception e) {
                    log.warn("Failed checking Gmail thread {}: {}", threadId, e.getMessage());
                }
            }

            // Also search for recent unread replies mentioning invoice keywords in the subject
            try {
                String query = "to:me is:unread (subject:\"Invoice\" OR subject:\"Reminder\")";
                ListMessagesResponse response = gmail.users().messages().list("me").setQ(query).setMaxResults(15L).execute();
                if (response != null && response.getMessages() != null) {
                    for (Message m : response.getMessages()) {
                        if (processedMessageRepository.existsByGmailMessageId(m.getId())) {
                            continue;
                        }

                        Message fullMsg = gmail.users().messages().get("me", m.getId()).setFormat("full").execute();
                        String fromHeader = getHeader(fullMsg, "From");
                        String subjectHeader = getHeader(fullMsg, "Subject");
                        String senderEmail = extractEmail(fromHeader);

                        if (senderEmail != null && senderEmail.equalsIgnoreCase(userEmail)) {
                            markMessageProcessed(userId, fullMsg.getId(), fullMsg.getThreadId(), null, senderEmail, subjectHeader, fullMsg.getSnippet(), "OUTGOING", "SKIPPED_SELF_SENT");
                            continue;
                        }

                        // Try to match with an invoice by number in subject or body
                        Invoice matchedInvoice = matchInvoiceBySubjectOrContent(activeInvoices, subjectHeader, fullMsg.getSnippet(), senderEmail);
                        boolean handled = processIncomingReply(userId, fullMsg, matchedInvoice, senderEmail, subjectHeader);
                        if (handled) {
                            repliesProcessed++;
                        }
                    }
                }
            } catch (Exception ex) {
                log.warn("Gmail query search for replies encountered: {}", ex.getMessage());
            }

            // Update sync checkpoint
            integration.setLastSyncAt(Instant.now());
            gmailIntegrationRepository.save(integration);

        } catch (Exception e) {
            log.error("Error during Gmail reply sync for user {}: {}", userId, e.getMessage(), e);
        }

        return repliesProcessed;
    }

    private boolean processIncomingReply(String userId, Message message, Invoice invoice, String senderEmail, String subject) {
        String snippet = message.getSnippet() != null ? message.getSnippet() : "";
        String classification = classifyReply(snippet, subject);

        log.info("Classified incoming message {} as '{}' for invoice {}",
                message.getId(), classification, invoice != null ? invoice.getInvoiceNumber() : "UNMATCHED");

        String actionTaken;

        if ("OUT_OF_OFFICE".equals(classification)) {
            // Out of office responses are logged but DO NOT pause reminders permanently
            actionTaken = "RECORDED_OUT_OF_OFFICE";
        } else if (invoice != null) {
            actionTaken = "PAUSED_FOLLOW_UP";

            // Mark invoice follow-up status
            invoice.setFollowUpStatus("PAUSED_FOR_REVIEW");
            invoice.setLastReplyClassification(classification);
            invoice.setLastReplySnippet(snippet.length() > 500 ? snippet.substring(0, 497) + "..." : snippet);
            invoice.setLastReplyAt(Instant.now());
            invoiceRepository.save(invoice);

            // Cancel/pause scheduled future reminders
            int cancelled = scheduledReminderRepository.cancelPendingForInvoice(invoice.getId());
            log.info("Cancelled {} pending reminders for invoice {} due to client reply ({})",
                    cancelled, invoice.getInvoiceNumber(), classification);

            // Create notification for freelancer
            String title = "Client replied to " + invoice.getInvoiceNumber();
            String description = String.format("Client (%s) replied: \"%s\" [%s]. Follow-ups paused pending your review.",
                    senderEmail != null ? senderEmail : "Client",
                    snippet.length() > 100 ? snippet.substring(0, 97) + "..." : snippet,
                    classification);
            notificationService.createNotification(userId, title, description, "CLIENT_REPLY", invoice.getId());
        } else {
            actionTaken = "UNMATCHED_REVIEW_NEEDED";
            // Create general notification that an unassigned reply arrived
            notificationService.createNotification(userId, "New invoice reply received",
                    "Received an email from " + senderEmail + " regarding an invoice, but could not match automatically. Please review.",
                    "CLIENT_REPLY", null);
        }

        markMessageProcessed(userId, message.getId(), message.getThreadId(), invoice != null ? invoice.getId() : null, senderEmail, subject, snippet, classification, actionTaken);
        return true;
    }

    private void markMessageProcessed(String userId, String messageId, String threadId, String invoiceId, String senderEmail, String subject, String snippet, String classification, String actionTaken) {
        ProcessedGmailMessage pgm = new ProcessedGmailMessage(
                userId,
                messageId,
                threadId,
                invoiceId,
                senderEmail,
                subject,
                snippet != null && snippet.length() > 500 ? snippet.substring(0, 497) + "..." : snippet,
                classification,
                actionTaken
        );
        processedMessageRepository.save(pgm);
    }

    /**
     * Deterministic, safe classification rules for incoming replies.
     * Content is strictly treated as untrusted text.
     */
    public String classifyReply(String snippet, String subject) {
        String combined = ((subject != null ? subject : "") + " " + (snippet != null ? snippet : "")).toLowerCase();

        // 1. Out of office / automated responder
        if (combined.contains("out of office") || combined.contains("automatic reply") || combined.contains("autoreply")
                || combined.contains("on leave") || combined.contains("vacation responder") || combined.contains("auto-response")) {
            return "OUT_OF_OFFICE";
        }

        // 2. Opt out / Unsubscribe
        if (combined.contains("unsubscribe") || combined.contains("stop sending") || combined.contains("do not email")
                || combined.contains("remove me") || combined.contains("opt out")) {
            return "OPT_OUT";
        }

        // 3. Payment reportedly made (NEVER marks paid automatically)
        if (combined.contains("already paid") || combined.contains("payment made") || combined.contains("have paid")
                || combined.contains("transferred") || combined.contains("paid today") || combined.contains("paid yesterday")
                || combined.contains("payment completed") || combined.contains("receipt attached") || combined.contains("settled this")
                || combined.contains("sent the money") || combined.contains("initiated the payment")) {
            return "PAYMENT_REPORTED";
        }

        // 4. Need more time / payment later
        if (combined.contains("need more time") || combined.contains("pay next week") || combined.contains("pay by")
                || combined.contains("will pay on") || combined.contains("give me a few days") || combined.contains("delay")
                || combined.contains("processing with accounts") || combined.contains("cash flow") || combined.contains("end of month")) {
            return "NEED_MORE_TIME";
        }

        // 5. Invoice correction requested
        if (combined.contains("wrong amount") || combined.contains("incorrect") || combined.contains("revise")
                || combined.contains("correction") || combined.contains("discrepancy") || combined.contains("discount missing")
                || combined.contains("tax error") || combined.contains("tax amount is wrong") || combined.contains("is wrong")
                || combined.contains("bill to wrong") || combined.contains("missing") || combined.contains("wrong")) {
            return "CORRECTION_REQUESTED";
        }

        // 6. Question about invoice
        if (combined.contains("question") || combined.contains("clarification") || combined.contains("clarify")
                || combined.contains("what is this") || combined.contains("what the") || combined.contains("how do i pay")
                || combined.contains("can you explain") || combined.contains("po number") || combined.contains("purchase order")
                || combined.contains("which account") || combined.contains("could you")) {
            return "QUESTION";
        }


        // 7. General reply if some text present
        if (snippet != null && snippet.trim().length() > 5) {
            return "GENERAL_REPLY";
        }

        return "UNCERTAIN";
    }

    private Invoice matchInvoiceBySubjectOrContent(List<Invoice> userInvoices, String subject, String snippet, String senderEmail) {
        String text = ((subject != null ? subject : "") + " " + (snippet != null ? snippet : "")).toLowerCase();

        // 1. Direct invoice number match
        for (Invoice inv : userInvoices) {
            if (inv.getInvoiceNumber() != null && text.contains(inv.getInvoiceNumber().toLowerCase())) {
                return inv;
            }
        }

        // 2. Match by client email
        if (senderEmail != null && !senderEmail.isBlank()) {
            List<Invoice> matchingClientInvoices = userInvoices.stream()
                    .filter(inv -> inv.getClient() != null && senderEmail.equalsIgnoreCase(inv.getClient().getEmail()))
                    .toList();

            // If client has only one active unpaid invoice, associate with that invoice
            if (matchingClientInvoices.size() == 1) {
                return matchingClientInvoices.get(0);
            }
        }

        return null;
    }

    private String getHeader(Message message, String name) {
        if (message.getPayload() != null && message.getPayload().getHeaders() != null) {
            for (MessagePartHeader header : message.getPayload().getHeaders()) {
                if (name.equalsIgnoreCase(header.getName())) {
                    return header.getValue();
                }
            }
        }
        return null;
    }

    private String extractEmail(String headerValue) {
        if (headerValue == null) return null;
        Pattern pattern = Pattern.compile("<([^>]+)>");
        Matcher matcher = pattern.matcher(headerValue);
        if (matcher.find()) {
            return matcher.group(1).trim();
        }
        if (headerValue.contains("@")) {
            return headerValue.trim();
        }
        return null;
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
}
