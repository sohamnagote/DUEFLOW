package com.dueflow.dto;

import java.util.List;

public class SearchResponseDto {
    private List<InvoiceDto> invoices;
    private List<ClientDto> clients;

    public SearchResponseDto() {
    }

    public SearchResponseDto(List<InvoiceDto> invoices, List<ClientDto> clients) {
        this.invoices = invoices;
        this.clients = clients;
    }

    public List<InvoiceDto> getInvoices() {
        return invoices;
    }

    public void setInvoices(List<InvoiceDto> invoices) {
        this.invoices = invoices;
    }

    public List<ClientDto> getClients() {
        return clients;
    }

    public void setClients(List<ClientDto> clients) {
        this.clients = clients;
    }
}
