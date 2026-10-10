package com.dueflow.service;

import com.dueflow.dto.ClientDto;
import com.dueflow.dto.InvoiceDto;
import com.dueflow.dto.SearchResponseDto;
import com.dueflow.repository.ClientRepository;
import com.dueflow.repository.InvoiceRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class SearchService {

    private final InvoiceRepository invoiceRepository;
    private final ClientRepository clientRepository;

    public SearchService(InvoiceRepository invoiceRepository, ClientRepository clientRepository) {
        this.invoiceRepository = invoiceRepository;
        this.clientRepository = clientRepository;
    }

    @Transactional(readOnly = true)
    public SearchResponseDto globalSearch(String userId, String query) {
        if (query == null || query.trim().isEmpty()) {
            return new SearchResponseDto(Collections.emptyList(), Collections.emptyList());
        }

        String trimmed = query.trim();

        List<ClientDto> matchedClients = clientRepository
                .searchClients(userId, trimmed)
                .stream()
                .limit(10)
                .map(ClientDto::fromEntity)
                .collect(Collectors.toList());

        List<InvoiceDto> matchedInvoices = invoiceRepository
                .searchInvoices(userId, trimmed)
                .stream()
                .limit(10)
                .map(InvoiceDto::fromEntity)
                .collect(Collectors.toList());

        return new SearchResponseDto(matchedInvoices, matchedClients);
    }
}
