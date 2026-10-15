package com.dueflow.controller;

import com.dueflow.dto.ClientResponseDto;
import com.dueflow.dto.PublicClientResponseSubmitDto;
import com.dueflow.dto.PublicInvoiceViewDto;
import com.dueflow.service.ClientResponseService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping({"/api/public/invoices", "/public/invoices"})
public class PublicResponseController {

    private final ClientResponseService clientResponseService;

    public PublicResponseController(ClientResponseService clientResponseService) {
        this.clientResponseService = clientResponseService;
    }

    @GetMapping("/respond")
    public ResponseEntity<PublicInvoiceViewDto> getInvoiceForResponse(@RequestParam("token") String token) {
        PublicInvoiceViewDto view = clientResponseService.getPublicInvoice(token);
        return ResponseEntity.ok(view);
    }

    @PostMapping("/respond")
    public ResponseEntity<ClientResponseDto> submitResponse(
            @RequestParam("token") String token,
            @Valid @RequestBody PublicClientResponseSubmitDto submitDto) {
        ClientResponseDto saved = clientResponseService.submitClientResponse(token, submitDto);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }
}
