package in.dueflow.repository;

import in.dueflow.entity.Invoice;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface InvoiceRepository extends JpaRepository<Invoice, UUID> {
    List<Invoice> findByUserIdOrderByCreatedAtDesc(UUID userId);
    
    Optional<Invoice> findByUserIdAndId(UUID userId, UUID id);
    
    boolean existsByUserIdAndInvoiceNumber(UUID userId, String invoiceNumber);
    
    boolean existsByUserIdAndInvoiceNumberAndIdNot(UUID userId, String invoiceNumber, UUID id);
    
    List<Invoice> findByUserIdAndStatus(UUID userId, String status);

    @Query("SELECT i FROM Invoice i WHERE i.userId = :userId " +
           "AND (:status IS NULL OR i.status = :status) " +
           "AND (:search IS NULL OR LOWER(i.invoiceNumber) LIKE LOWER(CONCAT('%', :search, '%')) " +
           "     OR LOWER(i.clientNameSnapshot) LIKE LOWER(CONCAT('%', :search, '%')) " +
           "     OR LOWER(i.clientEmailSnapshot) LIKE LOWER(CONCAT('%', :search, '%')))")
    Page<Invoice> findFiltered(
        @Param("userId") UUID userId,
        @Param("status") String status,
        @Param("search") String search,
        Pageable pageable
    );
}
