package in.dueflow.repository;

import in.dueflow.entity.ReminderRule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ReminderRuleRepository extends JpaRepository<ReminderRule, UUID> {
    List<ReminderRule> findByInvoiceIdOrderByScheduledForAsc(UUID invoiceId);
    
    Optional<ReminderRule> findByInvoiceIdAndOccurrenceKey(UUID invoiceId, String occurrenceKey);
    
    List<ReminderRule> findByStatusAndScheduledForLessThanEqual(String status, Instant threshold);

    List<ReminderRule> findByStatusAndEnabledTrueAndScheduledForLessThanEqualOrderByScheduledForAsc(String status, Instant threshold);

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query("UPDATE ReminderRule r SET r.status = 'processing', r.lastAttemptedAt = :now, r.updatedAt = :now WHERE r.id = :id AND r.status = 'pending'")
    int claimRuleForProcessing(@org.springframework.data.repository.query.Param("id") UUID id, @org.springframework.data.repository.query.Param("now") Instant now);

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query("UPDATE ReminderRule r SET r.status = 'pending', r.updatedAt = :now WHERE r.status = 'processing' AND (r.lastAttemptedAt IS NULL OR r.lastAttemptedAt < :stuckThreshold)")
    int recoverStuckProcessingRules(@org.springframework.data.repository.query.Param("stuckThreshold") Instant stuckThreshold, @org.springframework.data.repository.query.Param("now") Instant now);

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query("DELETE FROM ReminderRule r WHERE r.invoiceId = :invoiceId")
    void deleteByInvoiceId(@org.springframework.data.repository.query.Param("invoiceId") UUID invoiceId);
    
    List<ReminderRule> findByInvoiceIdIn(List<UUID> invoiceIds);
}
