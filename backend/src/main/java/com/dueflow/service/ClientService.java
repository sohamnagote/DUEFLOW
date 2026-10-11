package com.dueflow.service;

import com.dueflow.domain.Client;
import com.dueflow.domain.Invoice;
import com.dueflow.domain.InvoiceStatus;
import com.dueflow.domain.UserProfile;
import com.dueflow.dto.ClientDto;
import com.dueflow.exception.ResourceNotFoundException;
import com.dueflow.exception.ValidationException;
import com.dueflow.repository.ClientRepository;
import com.dueflow.repository.InvoiceRepository;
import com.dueflow.repository.UserProfileRepository;
import com.dueflow.security.SecurityUtils;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

@Service
public class ClientService {

    private final ClientRepository clientRepository;
    private final InvoiceRepository invoiceRepository;
    private final UserProfileRepository userProfileRepository;
    private final UserProfileService userProfileService;

    public ClientService(ClientRepository clientRepository,
                         InvoiceRepository invoiceRepository,
                         UserProfileRepository userProfileRepository,
                         UserProfileService userProfileService) {
        this.clientRepository = clientRepository;
        this.invoiceRepository = invoiceRepository;
        this.userProfileRepository = userProfileRepository;
        this.userProfileService = userProfileService;
    }

    private void ensureUserProfile(String userId) {
        userProfileService.ensureProfileExists(userId);
    }

    @Transactional(readOnly = true)
    public List<ClientDto> getClients(String userId) {
        List<Client> clients = clientRepository.findByUserIdOrderByCreatedAtDesc(userId);
        return clients.stream().map(c -> enrichClientStats(c, userId)).toList();
    }

    @Transactional(readOnly = true)
    public Page<ClientDto> getClientsPaged(String userId, Pageable pageable) {
        Page<Client> page = clientRepository.findByUserId(userId, pageable);
        return page.map(c -> enrichClientStats(c, userId));
    }

    @Transactional(readOnly = true)
    public ClientDto getClient(String id, String userId) {
        Client client = clientRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Client not found with id: " + id));
        return enrichClientStats(client, userId);
    }

    @Transactional
    public ClientDto createClient(String userId, ClientDto dto) {
        if (dto.getName() == null || dto.getName().isBlank()) {
            throw new ValidationException("Client name is required");
        }
        if (dto.getEmail() == null || dto.getEmail().isBlank()) {
            throw new ValidationException("Client email is required");
        }

        // Auto-provision user profile if not yet created to satisfy PostgreSQL FK constraint
        ensureUserProfile(userId);

        Client client = new Client(userId, dto.getName().trim(), dto.getEmail().trim());
        client.setPhone(dto.getPhone() != null ? dto.getPhone().trim() : null);
        client.setBillingAddress(dto.getBillingAddress() != null ? dto.getBillingAddress().trim() : null);
        client.setTaxIdentifier(dto.getTaxIdentifier() != null ? dto.getTaxIdentifier().trim() : null);
        client.setInternalNotes(dto.getInternalNotes() != null ? dto.getInternalNotes().trim() : null);

        Client saved = clientRepository.save(client);
        return enrichClientStats(saved, userId);
    }

    @Transactional
    public ClientDto updateClient(String id, String userId, ClientDto dto) {
        Client client = clientRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Client not found with id: " + id));

        if (dto.getName() != null && !dto.getName().isBlank()) {
            client.setName(dto.getName().trim());
        }
        if (dto.getEmail() != null && !dto.getEmail().isBlank()) {
            client.setEmail(dto.getEmail().trim());
        }
        if (dto.getPhone() != null) {
            client.setPhone(dto.getPhone().trim());
        }
        if (dto.getBillingAddress() != null) {
            client.setBillingAddress(dto.getBillingAddress().trim());
        }
        if (dto.getTaxIdentifier() != null) {
            client.setTaxIdentifier(dto.getTaxIdentifier().trim());
        }
        if (dto.getInternalNotes() != null) {
            client.setInternalNotes(dto.getInternalNotes().trim());
        }

        Client updated = clientRepository.save(client);
        return enrichClientStats(updated, userId);
    }

    @Transactional
    public void deleteClient(String id, String userId) {
        Client client = clientRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Client not found with id: " + id));

        // Safety check: Prevent deletion if invoices are attached to avoid orphan records
        boolean hasInvoices = invoiceRepository.existsByClientId(id);
        if (hasInvoices) {
            throw new ValidationException("Cannot delete client with active invoices. Please delete or archive the associated invoices first.");
        }

        clientRepository.delete(client);
    }

    @Transactional(readOnly = true)
    public List<ClientDto> searchClients(String userId, String query) {
        if (query == null || query.isBlank()) {
            return getClients(userId);
        }
        List<Client> matches = clientRepository.searchClients(userId, query.trim());
        return matches.stream().map(c -> enrichClientStats(c, userId)).toList();
    }

    private ClientDto enrichClientStats(Client client, String userId) {
        ClientDto dto = ClientDto.fromEntity(client);
        List<Invoice> clientInvoices = invoiceRepository.findByUserIdAndClientId(userId, client.getId());

        BigDecimal totalInvoiced = BigDecimal.ZERO;
        BigDecimal totalOutstanding = BigDecimal.ZERO;
        int count = 0;

        for (Invoice inv : clientInvoices) {
            count++;
            BigDecimal amt = inv.getTotalAmount() != null ? inv.getTotalAmount() : BigDecimal.ZERO;
            totalInvoiced = totalInvoiced.add(amt);
            if (inv.getStatus() != InvoiceStatus.PAID && inv.getStatus() != InvoiceStatus.CANCELLED) {
                totalOutstanding = totalOutstanding.add(amt);
            }
        }

        dto.setTotalInvoiced(totalInvoiced);
        dto.setTotalOutstanding(totalOutstanding);
        dto.setInvoicesCount(count);
        return dto;
    }
}
