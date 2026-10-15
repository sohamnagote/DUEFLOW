package com.dueflow.service;

import com.dueflow.domain.ClientResponse;
import com.dueflow.domain.Invoice;
import com.dueflow.domain.UserProfile;
import com.dueflow.dto.ClientResponseDto;
import com.dueflow.dto.PublicClientResponseSubmitDto;
import com.dueflow.dto.PublicInvoiceViewDto;
import com.dueflow.exception.ResourceNotFoundException;
import com.dueflow.exception.ValidationException;
import com.dueflow.repository.ClientResponseRepository;
import com.dueflow.repository.InvoiceRepository;
import com.dueflow.repository.ScheduledReminderRepository;
import com.dueflow.repository.UserProfileRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Service
public class ClientResponseService {

    private static final Logger log = LoggerFactory.getLogger(ClientResponseService.class);

    private final ClientResponseRepository clientResponseRepository;
    private final InvoiceRepository invoiceRepository;
    private final ScheduledReminderRepository scheduledReminderRepository;
    private final NotificationService notificationService;
    private final UserProfileRepository userProfileRepository;

    public ClientResponseService(ClientResponseRepository clientResponseRepository,
                                 InvoiceRepository invoiceRepository,
                                 ScheduledReminderRepository scheduledReminderRepository,
                                 NotificationService notificationService,
                                 UserProfileRepository userProfileRepository) {
        this.clientResponseRepository = clientResponseRepository;
        this.invoiceRepository = invoiceRepository;
        this.scheduledReminderRepository = scheduledReminderRepository;
        this.notificationService = notificationService;
        this.userProfileRepository = userProfileRepository;
    }

    /**
     * Look up public invoice details using a secure, unguessable response token.
     * Never exposes user_id, private internal notes, other invoices, or secrets.
     */
    @Transactional(readOnly = true)
    public PublicInvoiceViewDto getPublicInvoice(String token) {
        if (token == null || token.trim().isBlank()) {
            throw new ValidationException("Response token is required");
        }

        Invoice invoice = invoiceRepository.findByResponseToken(token.trim())
                .orElseThrow(() -> new ResourceNotFoundException("Invoice not found or invalid response link"));

        if (invoice.getResponseTokenExpiry() != null && invoice.getResponseTokenExpiry().isBefore(Instant.now())) {
            throw new ValidationException("This response link has expired");
        }

        PublicInvoiceViewDto dto = new PublicInvoiceViewDto();
        dto.setInvoiceNumber(invoice.getInvoiceNumber());
        dto.setClientName(invoice.getClient() != null ? invoice.getClient().getName() : "Valued Client");
        dto.setTotalAmount(invoice.getTotalAmount());
        dto.setCurrency(invoice.getCurrency());
        dto.setDueDate(invoice.getDueDate());
        dto.setIssueDate(invoice.getIssueDate());
        dto.setPaymentInstructions(invoice.getPaymentInstructions());
        dto.setStatus(invoice.getStatus() != null ? invoice.getStatus().name() : "UNPAID");
        dto.setFollowUpStatus(invoice.getFollowUpStatus() != null ? invoice.getFollowUpStatus() : "ACTIVE");

        // Fetch business / sender name from user profile
        Optional<UserProfile> profile = userProfileRepository.findById(invoice.getUserId());
        if (profile.isPresent() && profile.get().getFullName() != null && !profile.get().getFullName().isBlank()) {
            dto.setBusinessName(profile.get().getFullName());
        } else {
            dto.setBusinessName("DueFlow Invoice");
        }


        return dto;
    }

    /**
     * Submit a client response using a secure token.
     * Pauses follow-ups, records the response, notifies the freelancer.
     * NEVER automatically marks an invoice as paid.
     */
    @Transactional
    public ClientResponseDto submitClientResponse(String token, PublicClientResponseSubmitDto submitDto) {
        if (token == null || token.trim().isBlank()) {
            throw new ValidationException("Response token is required");
        }
        if (submitDto == null || submitDto.getResponseType() == null || submitDto.getResponseType().isBlank()) {
            throw new ValidationException("Response action type is required");
        }

        Invoice invoice = invoiceRepository.findByResponseToken(token.trim())
                .orElseThrow(() -> new ResourceNotFoundException("Invoice not found or invalid response link"));

        if (invoice.getResponseTokenExpiry() != null && invoice.getResponseTokenExpiry().isBefore(Instant.now())) {
            throw new ValidationException("This response link has expired");
        }

        String action = submitDto.getResponseType().trim().toUpperCase();
        if (!List.of("PAYMENT_REPORTED", "NEED_MORE_TIME", "QUESTION", "CORRECTION_REQUESTED").contains(action)) {
            throw new ValidationException("Invalid response action type: " + action);
        }

        // Check idempotency if key provided
        if (submitDto.getIdempotencyKey() != null && !submitDto.getIdempotencyKey().isBlank()) {
            Optional<ClientResponse> existing = clientResponseRepository.findByIdempotencyKey(submitDto.getIdempotencyKey().trim());
            if (existing.isPresent()) {
                log.info("Client response already processed for idempotency key: {}", submitDto.getIdempotencyKey());
                return ClientResponseDto.fromEntity(existing.get());
            }
        }

        // Sanitize text
        String sanitizedText = submitDto.getResponseText() != null ? sanitizeContent(submitDto.getResponseText()) : null;

        ClientResponse response = new ClientResponse();
        response.setInvoiceId(invoice.getId());
        response.setUserId(invoice.getUserId());
        if (invoice.getClient() != null) {
            response.setClientId(invoice.getClient().getId());
            response.setClientEmail(invoice.getClient().getEmail());
        }
        if (submitDto.getClientEmail() != null && !submitDto.getClientEmail().isBlank()) {
            response.setClientEmail(submitDto.getClientEmail().trim());
        }
        response.setResponseType(action);
        response.setResponseText(sanitizedText);
        response.setProposedPaymentDate(submitDto.getProposedPaymentDate());
        response.setIdempotencyKey(submitDto.getIdempotencyKey());
        response.setReviewStatus("PENDING_REVIEW");

        ClientResponse saved = clientResponseRepository.save(response);

        // Update Invoice follow-up state (HOLD / PAUSE)
        invoice.setFollowUpStatus("PAUSED_FOR_REVIEW");
        invoice.setLastReplyClassification(action);
        invoice.setLastReplyAt(Instant.now());

        String snippet = switch (action) {
            case "PAYMENT_REPORTED" -> "Client reported payment has already been made.";
            case "NEED_MORE_TIME" -> "Client requested more time" + (submitDto.getProposedPaymentDate() != null ? " (expected: " + submitDto.getProposedPaymentDate() + ")" : "") + (sanitizedText != null ? ": " + sanitizedText : ".");
            case "QUESTION" -> "Client asked a question: " + (sanitizedText != null ? sanitizedText : "");
            case "CORRECTION_REQUESTED" -> "Client requested invoice correction: " + (sanitizedText != null ? sanitizedText : "");
            default -> "Client responded with " + action;
        };
        invoice.setLastReplySnippet(snippet.length() > 500 ? snippet.substring(0, 497) + "..." : snippet);
        invoiceRepository.save(invoice);

        // Cancel/pause future scheduled reminders for this invoice
        int cancelled = scheduledReminderRepository.cancelPendingForInvoice(invoice.getId());
        log.info("Paused {} scheduled reminders for invoice {} due to client response {}", cancelled, invoice.getInvoiceNumber(), action);

        // Notify freelancer
        String notifTitle = "Client responded to " + invoice.getInvoiceNumber();
        String notifMessage = snippet + " Scheduled reminders are paused pending your review.";
        notificationService.createNotification(invoice.getUserId(), notifTitle, notifMessage, "CLIENT_RESPONSE", invoice.getId());

        return ClientResponseDto.fromEntity(saved);
    }

    @Transactional(readOnly = true)
    public List<ClientResponseDto> getResponsesForInvoice(String invoiceId, String userId) {
        // Verify invoice belongs to user
        Invoice invoice = invoiceRepository.findByIdAndUserId(invoiceId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Invoice not found with id: " + invoiceId));
        return clientResponseRepository.findByInvoiceIdOrderByCreatedAtDesc(invoice.getId())
                .stream()
                .map(ClientResponseDto::fromEntity)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ClientResponseDto> getUserPendingResponses(String userId) {
        return clientResponseRepository.findByUserIdAndReviewStatus(userId, "PENDING_REVIEW")
                .stream()
                .map(ClientResponseDto::fromEntity)
                .toList();
    }

    @Transactional
    public ClientResponseDto resolveResponse(String responseId, String userId, String resolution) {
        ClientResponse response = clientResponseRepository.findByIdAndUserId(responseId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Response not found with id: " + responseId));

        response.setReviewStatus(resolution != null ? resolution.toUpperCase() : "RESOLVED");
        response.setReviewedAt(Instant.now());
        ClientResponse updated = clientResponseRepository.save(response);

        // Also check if there are any remaining pending responses for this invoice
        long remainingPending = clientResponseRepository.findByInvoiceIdOrderByCreatedAtDesc(response.getInvoiceId())
                .stream()
                .filter(r -> "PENDING_REVIEW".equalsIgnoreCase(r.getReviewStatus()))
                .count();

        if (remainingPending == 0) {
            invoiceRepository.findByIdAndUserId(response.getInvoiceId(), userId).ifPresent(inv -> {
                if ("PAUSED_FOR_REVIEW".equals(inv.getFollowUpStatus()) || "CLIENT_REPLIED".equals(inv.getFollowUpStatus())) {
                    inv.setFollowUpStatus("READY_TO_RESUME");
                    invoiceRepository.save(inv);
                }
            });
        }

        return ClientResponseDto.fromEntity(updated);
    }

    private String sanitizeContent(String input) {
        if (input == null) return null;
        // Strip out HTML tags, script blocks, normalize whitespace
        String cleaned = input.replaceAll("<[^>]*>", "").trim();
        return cleaned.length() > 2000 ? cleaned.substring(0, 2000) : cleaned;
    }
}
