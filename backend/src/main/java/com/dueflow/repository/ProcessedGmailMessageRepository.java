package com.dueflow.repository;

import com.dueflow.domain.ProcessedGmailMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProcessedGmailMessageRepository extends JpaRepository<ProcessedGmailMessage, String> {

    boolean existsByGmailMessageId(String gmailMessageId);

    Optional<ProcessedGmailMessage> findByGmailMessageId(String gmailMessageId);

    List<ProcessedGmailMessage> findByUserIdOrderByProcessedAtDesc(String userId);

    List<ProcessedGmailMessage> findByInvoiceIdOrderByProcessedAtDesc(String invoiceId);
}
