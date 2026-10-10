package com.dueflow.controller;

import com.dueflow.dto.ClientDto;
import com.dueflow.security.SecurityUtils;
import com.dueflow.service.ClientService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/clients")
public class ClientController {

    private final ClientService clientService;

    public ClientController(ClientService clientService) {
        this.clientService = clientService;
    }

    @GetMapping
    public ResponseEntity<List<ClientDto>> getClients() {
        String userId = SecurityUtils.getRequiredUserId();
        return ResponseEntity.ok(clientService.getClients(userId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ClientDto> getClient(@PathVariable String id) {
        String userId = SecurityUtils.getRequiredUserId();
        return ResponseEntity.ok(clientService.getClient(id, userId));
    }

    @PostMapping
    public ResponseEntity<ClientDto> createClient(@Valid @RequestBody ClientDto dto) {
        String userId = SecurityUtils.getRequiredUserId();
        ClientDto created = clientService.createClient(userId, dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/{id}")
    public ResponseEntity<ClientDto> updateClient(@PathVariable String id, @Valid @RequestBody ClientDto dto) {
        String userId = SecurityUtils.getRequiredUserId();
        return ResponseEntity.ok(clientService.updateClient(id, userId, dto));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> deleteClient(@PathVariable String id) {
        String userId = SecurityUtils.getRequiredUserId();
        clientService.deleteClient(id, userId);
        return ResponseEntity.ok(Map.of("message", "Client deleted successfully"));
    }
}
