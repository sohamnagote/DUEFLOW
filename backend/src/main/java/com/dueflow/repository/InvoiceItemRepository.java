package com.dueflow.repository;

import com.dueflow.domain.InvoiceItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface InvoiceItemRepository extends JpaRepository<InvoiceItem, String> {
    List<InvoiceItem> findByInvoiceId(String invoiceId);
    void deleteByInvoiceId(String invoiceId);
}
