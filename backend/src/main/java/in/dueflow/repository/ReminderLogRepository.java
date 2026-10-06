package in.dueflow.repository;

import in.dueflow.entity.ReminderLog;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ReminderLogRepository extends JpaRepository<ReminderLog, UUID> {
    List<ReminderLog> findByInvoiceIdOrderByCreatedAtDesc(UUID invoiceId);
    
    Optional<ReminderLog> findByProviderMessageId(String providerMessageId);
    
    List<ReminderLog> findByInvoiceIdInOrderByCreatedAtDesc(List<UUID> invoiceIds);

    List<ReminderLog> findByInvoiceIdInOrderByCreatedAtDesc(List<UUID> invoiceIds, Pageable pageable);
}
