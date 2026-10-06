package in.dueflow.controller;

import in.dueflow.dto.ClientDtos.ClientResponseDto;
import in.dueflow.dto.ClientDtos.CreateClientRequest;
import in.dueflow.dto.ClientDtos.UpdateClientRequest;
import in.dueflow.entity.Client;
import in.dueflow.exception.ResourceNotFoundException;
import in.dueflow.security.SecurityUtils;
import in.dueflow.service.ClientService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/clients")
public class ClientController {

    private final ClientService clientService;

    public ClientController(ClientService clientService) {
        this.clientService = clientService;
    }

    @GetMapping
    public ResponseEntity<Map<String, List<ClientResponseDto>>> listClients() {
        UUID userId = SecurityUtils.getCurrentUserId();
        List<ClientResponseDto> clients = clientService.listClients(userId);
        return ResponseEntity.ok(Map.of("clients", clients));
    }

    @PostMapping
    public ResponseEntity<Client> createClient(@Valid @RequestBody CreateClientRequest request) {
        UUID userId = SecurityUtils.getCurrentUserId();
        Client created = clientService.createClient(userId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Client> getClient(@PathVariable("id") UUID id) {
        UUID userId = SecurityUtils.getCurrentUserId();
        Client client = clientService.getClient(userId, id)
                .orElseThrow(() -> new ResourceNotFoundException("Client not found"));
        return ResponseEntity.ok(client);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Client> updateClient(@PathVariable("id") UUID id, @Valid @RequestBody UpdateClientRequest request) {
        UUID userId = SecurityUtils.getCurrentUserId();
        Client updated = clientService.updateClient(userId, id, request)
                .orElseThrow(() -> new ResourceNotFoundException("Client not found"));
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> deleteClient(@PathVariable("id") UUID id) {
        UUID userId = SecurityUtils.getCurrentUserId();
        boolean deleted = clientService.deleteClient(userId, id);
        if (!deleted) {
            throw new ResourceNotFoundException("Client not found");
        }
        return ResponseEntity.ok(Map.of("message", "Client deleted successfully"));
    }
}
