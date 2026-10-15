package com.dueflow.controller;

import com.dueflow.domain.Invoice;
import com.dueflow.dto.InvoiceDto;
import com.dueflow.security.SecurityUtils;
import com.dueflow.service.InvoiceService;
import com.dueflow.service.PdfGenerationService;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/invoices")
public class InvoiceController {

    private final InvoiceService invoiceService;
    private final PdfGenerationService pdfGenerationService;
    private final com.dueflow.service.ClientResponseService clientResponseService;

    public InvoiceController(InvoiceService invoiceService,
                             PdfGenerationService pdfGenerationService,
                             com.dueflow.service.ClientResponseService clientResponseService) {
        this.invoiceService = invoiceService;
        this.pdfGenerationService = pdfGenerationService;
        this.clientResponseService = clientResponseService;
    }


    @GetMapping
    public ResponseEntity<List<InvoiceDto>> getInvoices(@RequestParam(value = "search", required = false) String search) {
        String userId = SecurityUtils.getRequiredUserId();
        if (search != null && !search.isBlank()) {
            return ResponseEntity.ok(invoiceService.searchInvoices(userId, search));
        }
        return ResponseEntity.ok(invoiceService.getInvoices(userId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<InvoiceDto> getInvoice(@PathVariable String id) {
        String userId = SecurityUtils.getRequiredUserId();
        return ResponseEntity.ok(invoiceService.getInvoice(id, userId));
    }

    @PostMapping
    public ResponseEntity<InvoiceDto> createInvoice(@Valid @RequestBody InvoiceDto dto) {
        String userId = SecurityUtils.getRequiredUserId();
        InvoiceDto created = invoiceService.createInvoice(userId, dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/{id}")
    public ResponseEntity<InvoiceDto> updateInvoice(@PathVariable String id, @Valid @RequestBody InvoiceDto dto) {
        String userId = SecurityUtils.getRequiredUserId();
        return ResponseEntity.ok(invoiceService.updateInvoice(id, userId, dto));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> deleteInvoice(@PathVariable String id) {
        String userId = SecurityUtils.getRequiredUserId();
        invoiceService.deleteInvoice(id, userId);
        return ResponseEntity.ok(Map.of("message", "Invoice deleted successfully"));
    }

    @PostMapping("/{id}/mark-paid")
    public ResponseEntity<InvoiceDto> markAsPaid(@PathVariable String id) {
        String userId = SecurityUtils.getRequiredUserId();
        return ResponseEntity.ok(invoiceService.markInvoiceAsPaid(id, userId));
    }

    @GetMapping("/{id}/pdf")
    public ResponseEntity<byte[]> downloadInvoicePdf(@PathVariable String id) {
        String userId = SecurityUtils.getRequiredUserId();
        Invoice invoice = invoiceService.getInvoiceEntity(id, userId);

        byte[] pdfBytes = pdfGenerationService.generateInvoicePdf(invoice);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_PDF);
        String filename = (invoice.getInvoiceNumber() != null ? invoice.getInvoiceNumber() : "invoice") + ".pdf";
        headers.set(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + filename + "\"");

        return ResponseEntity.ok()
                .headers(headers)
                .body(pdfBytes);
    }

    @PostMapping({"/import-csv", "/import"})
    public ResponseEntity<com.dueflow.dto.InvoiceImportResultDto> importInvoices(@RequestBody List<com.dueflow.dto.InvoiceCsvRowDto> rows) {
        String userId = SecurityUtils.getRequiredUserId();
        com.dueflow.dto.InvoiceImportResultDto result = invoiceService.importInvoices(userId, rows);
        return ResponseEntity.ok(result);
    }

    @PostMapping("/{id}/pause-followup")
    public ResponseEntity<InvoiceDto> pauseFollowUp(@PathVariable String id) {
        String userId = SecurityUtils.getRequiredUserId();
        return ResponseEntity.ok(invoiceService.pauseFollowUp(id, userId));
    }

    @PostMapping("/{id}/resume-followup")
    public ResponseEntity<InvoiceDto> resumeFollowUp(@PathVariable String id) {
        String userId = SecurityUtils.getRequiredUserId();
        return ResponseEntity.ok(invoiceService.resumeFollowUp(id, userId));
    }

    @GetMapping("/{id}/responses")
    public ResponseEntity<List<com.dueflow.dto.ClientResponseDto>> getResponsesForInvoice(@PathVariable String id) {
        String userId = SecurityUtils.getRequiredUserId();
        return ResponseEntity.ok(clientResponseService.getResponsesForInvoice(id, userId));
    }

    @PostMapping("/responses/{responseId}/resolve")
    public ResponseEntity<com.dueflow.dto.ClientResponseDto> resolveResponse(
            @PathVariable String responseId,
            @RequestBody(required = false) Map<String, String> body) {
        String userId = SecurityUtils.getRequiredUserId();
        String resolution = body != null && body.containsKey("resolution") ? body.get("resolution") : "RESOLVED";
        return ResponseEntity.ok(clientResponseService.resolveResponse(responseId, userId, resolution));
    }
}

