package in.dueflow.service;

import in.dueflow.dto.ClientDtos.ClientResponseDto;
import in.dueflow.dto.ClientDtos.CreateClientRequest;
import in.dueflow.dto.ClientDtos.UpdateClientRequest;
import in.dueflow.entity.Client;
import in.dueflow.entity.Invoice;
import in.dueflow.repository.ClientRepository;
import in.dueflow.repository.InvoiceRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class ClientService {

    private final ClientRepository clientRepository;
    private final InvoiceRepository invoiceRepository;
    private final StatusService statusService;

    public ClientService(ClientRepository clientRepository, InvoiceRepository invoiceRepository, StatusService statusService) {
        this.clientRepository = clientRepository;
        this.invoiceRepository = invoiceRepository;
        this.statusService = statusService;
    }

    public List<ClientResponseDto> listClients(UUID userId) {
        List<Client> clients = clientRepository.findByUserIdOrderByCreatedAtDesc(userId);
        List<Invoice> invoices = invoiceRepository.findByUserIdOrderByCreatedAtDesc(userId);

        List<ClientResponseDto> results = new ArrayList<>();
        for (Client client : clients) {
            int count = 0;
            BigDecimal totalInvoiced = BigDecimal.ZERO;
            BigDecimal pendingBalance = BigDecimal.ZERO;

            for (Invoice inv : invoices) {
                boolean matches = (inv.getClientId() != null && inv.getClientId().equals(client.getId())) ||
                        (inv.getClientEmailSnapshot() != null && inv.getClientEmailSnapshot().equalsIgnoreCase(client.getEmail()));

                if (matches) {
                    count++;
                    totalInvoiced = totalInvoiced.add(inv.getAmount());
                    String opStatus = statusService.deriveOperationalStatus(inv);
                    if (!"paid".equalsIgnoreCase(opStatus)) {
                        pendingBalance = pendingBalance.add(inv.getAmount());
                    }
                }
            }

            results.add(ClientResponseDto.from(client, count, totalInvoiced, pendingBalance));
        }

        return results;
    }

    public Optional<Client> getClient(UUID userId, UUID clientId) {
        return clientRepository.findByUserIdAndId(userId, clientId);
    }

    @Transactional
    public Client createClient(UUID userId, CreateClientRequest req) {
        Client client = new Client(userId, req.getName().trim(), req.getEmail().toLowerCase().trim());
        if (req.getNotes() != null) client.setNotes(req.getNotes().trim());
        if (req.getCin() != null) client.setCin(req.getCin().trim());
        if (req.getPhone() != null) client.setPhone(req.getPhone().trim());
        if (req.getAttn() != null) client.setAttn(req.getAttn().trim());
        return clientRepository.save(client);
    }

    @Transactional
    public Optional<Client> updateClient(UUID userId, UUID clientId, UpdateClientRequest req) {
        Optional<Client> existingOpt = clientRepository.findByUserIdAndId(userId, clientId);
        if (existingOpt.isEmpty()) return Optional.empty();

        Client client = existingOpt.get();
        if (req.getName() != null) client.setName(req.getName().trim());
        if (req.getEmail() != null) client.setEmail(req.getEmail().toLowerCase().trim());
        if (req.getNotes() != null) client.setNotes(req.getNotes().trim());
        if (req.getCin() != null) client.setCin(req.getCin().trim());
        if (req.getPhone() != null) client.setPhone(req.getPhone().trim());
        if (req.getAttn() != null) client.setAttn(req.getAttn().trim());

        return Optional.of(clientRepository.save(client));
    }

    @Transactional
    public boolean deleteClient(UUID userId, UUID clientId) {
        if (!clientRepository.existsByUserIdAndId(userId, clientId)) {
            return false;
        }
        clientRepository.deleteByUserIdAndId(userId, clientId);
        return true;
    }
}
