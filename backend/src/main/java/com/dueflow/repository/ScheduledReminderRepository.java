package com.dueflow.repository;

import com.dueflow.domain.ReminderStatus;
import com.dueflow.domain.ScheduledReminder;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Repository
public interface ScheduledReminderRepository extends JpaRepository<ScheduledReminder, String> {

    Optional<ScheduledReminder> findByIdempotencyKey(String idempotencyKey);

    boolean existsByIdempotencyKey(String idempotencyKey);

    List<ScheduledReminder> findByUserIdOrderByScheduledAtAsc(String userId);

    List<ScheduledReminder> findByInvoiceIdAndStatus(String invoiceId, ReminderStatus status);

    List<ScheduledReminder> findByInvoiceId(String invoiceId);

    @Query("SELECT r FROM ScheduledReminder r WHERE r.status = :status AND r.scheduledAt <= :now ORDER BY r.scheduledAt ASC")
    List<ScheduledReminder> findDueReminders(@Param("status") ReminderStatus status, @Param("now") Instant now, Pageable pageable);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT r FROM ScheduledReminder r WHERE r.id = :id AND r.status = :status")
    Optional<ScheduledReminder> claimReminderForProcessing(@Param("id") String id, @Param("status") ReminderStatus status);

    @Modifying
    @Query("UPDATE ScheduledReminder r SET r.status = 'CANCELLED' WHERE r.invoice.id = :invoiceId AND r.status = 'PENDING'")
    int cancelPendingForInvoice(@Param("invoiceId") String invoiceId);

    @Modifying
    @Query("UPDATE ScheduledReminder r SET r.status = 'CANCELLED' WHERE r.userId = :userId AND r.status = 'PENDING'")
    int cancelPendingForUser(@Param("userId") String userId);

    long countByUserIdAndStatus(String userId, ReminderStatus status);

    @Query("SELECT r FROM ScheduledReminder r WHERE r.userId = :userId AND r.status = 'PENDING' ORDER BY r.scheduledAt ASC")
    List<ScheduledReminder> findUpcomingForUser(@Param("userId") String userId, Pageable pageable);
}
