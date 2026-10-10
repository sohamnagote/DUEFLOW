package com.dueflow.repository;

import com.dueflow.domain.ReminderHistory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ReminderHistoryRepository extends JpaRepository<ReminderHistory, String> {

    List<ReminderHistory> findByUserIdOrderByAttemptedAtDesc(String userId);

    Page<ReminderHistory> findByUserIdOrderByAttemptedAtDesc(String userId, Pageable pageable);

    List<ReminderHistory> findByInvoiceIdOrderByAttemptedAtDesc(String invoiceId);

    long countByUserIdAndStatus(String userId, String status);
}
