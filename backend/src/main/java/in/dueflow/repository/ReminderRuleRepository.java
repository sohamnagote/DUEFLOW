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
    
    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query("DELETE FROM ReminderRule r WHERE r.invoiceId = :invoiceId")
    void deleteByInvoiceId(@org.springframework.data.repository.query.Param("invoiceId") UUID invoiceId);
    
    List<ReminderRule> findByInvoiceIdIn(List<UUID> invoiceIds);
}
