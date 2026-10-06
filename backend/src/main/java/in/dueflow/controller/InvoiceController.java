package in.dueflow.controller;

import in.dueflow.dto.InvoiceDtos.*;
import in.dueflow.security.SecurityUtils;
import in.dueflow.service.EmailService.RenderedEmail;
import in.dueflow.service.InvoiceService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/invoices")
public class InvoiceController {

    private final InvoiceService invoiceService;

    public InvoiceController(InvoiceService invoiceService) {
        this.invoiceService = invoiceService;
    }

    @GetMapping
    public ResponseEntity<InvoiceListResponse> listInvoices(
            @RequestParam(name = "search", required = false) String search,
            @RequestParam(name = "status", required = false) String status,
            @RequestParam(name = "sort", required = false) String sort,
            @RequestParam(name = "page", defaultValue = "1") int page,
            @RequestParam(name = "limit", defaultValue = "50") int limit) {
        UUID userId = SecurityUtils.getCurrentUserId();
        InvoiceListResponse response = invoiceService.listInvoices(userId, search, status, sort, page, limit);
        return ResponseEntity.ok(response);
    }

    @PostMapping
    public ResponseEntity<InvoiceResponseDto> createInvoice(@Valid @RequestBody CreateInvoiceRequest request) {
        UUID userId = SecurityUtils.getCurrentUserId();
        InvoiceResponseDto created = invoiceService.createInvoice(userId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @GetMapping("/{id}")
    public ResponseEntity<InvoiceDetailResponse> getInvoice(@PathVariable("id") UUID id) {
        UUID userId = SecurityUtils.getCurrentUserId();
        InvoiceDetailResponse response = invoiceService.getInvoiceDetail(userId, id);
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{id}")
    public ResponseEntity<InvoiceResponseDto> updateInvoice(
            @PathVariable("id") UUID id,
            @Valid @RequestBody UpdateInvoiceRequest request) {
        UUID userId = SecurityUtils.getCurrentUserId();
        InvoiceResponseDto updated = invoiceService.updateInvoice(userId, id, request);
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> deleteInvoice(@PathVariable("id") UUID id) {
        UUID userId = SecurityUtils.getCurrentUserId();
        invoiceService.deleteInvoice(userId, id);
        return ResponseEntity.ok(Map.of("message", "Invoice deleted successfully"));
    }

    @PostMapping("/{id}/mark-paid")
    public ResponseEntity<Map<String, Object>> markPaid(@PathVariable("id") UUID id) {
        UUID userId = SecurityUtils.getCurrentUserId();
        InvoiceResponseDto updated = invoiceService.markInvoicePaid(userId, id);
        return ResponseEntity.ok(Map.of(
                "message", "Invoice marked as paid. Future pending reminders have been cancelled.",
                "invoice", updated
        ));
    }

    @PostMapping("/{id}/mark-unpaid")
    public ResponseEntity<Map<String, Object>> markUnpaid(
            @PathVariable("id") UUID id,
            @Valid @RequestBody MarkUnpaidRequest request) {
        UUID userId = SecurityUtils.getCurrentUserId();
        InvoiceResponseDto updated = invoiceService.markInvoiceUnpaid(userId, id);
        return ResponseEntity.ok(Map.of(
                "message", "Invoice marked as unpaid. Future reminder schedule recomputed.",
                "invoice", updated,
                "rules", updated.getRules() != null ? updated.getRules() : List.of()
        ));
    }

    @PostMapping("/{id}/toggle-reminders")
    public ResponseEntity<Map<String, Object>> toggleReminders(
            @PathVariable("id") UUID id,
            @Valid @RequestBody ToggleRemindersRequest request) {
        UUID userId = SecurityUtils.getCurrentUserId();
        InvoiceResponseDto updated = invoiceService.toggleReminders(userId, id, request.getEnabled());
        return ResponseEntity.ok(Map.of(
                "message", "Reminders " + (request.getEnabled() ? "enabled" : "disabled") + " for this invoice.",
                "invoice", updated
        ));
    }

    @PostMapping("/{id}/nudge")
    public ResponseEntity<Map<String, Object>> nudge(
            @PathVariable("id") UUID id,
            @RequestBody NudgeRequest request) {
        UUID userId = SecurityUtils.getCurrentUserId();
        Map<String, Object> result = invoiceService.nudgeInvoice(userId, id, request);
        return ResponseEntity.ok(result);
    }

    @GetMapping("/{id}/preview-email")
    public ResponseEntity<RenderedEmail> previewEmail(
            @PathVariable("id") UUID id,
            @RequestParam(name = "stage", defaultValue = "1") int stage,
            @RequestParam(name = "tone", defaultValue = "professional") String tone) {
        UUID userId = SecurityUtils.getCurrentUserId();
        RenderedEmail preview = invoiceService.previewEmail(userId, id, stage, tone);
        return ResponseEntity.ok(preview);
    }
}
