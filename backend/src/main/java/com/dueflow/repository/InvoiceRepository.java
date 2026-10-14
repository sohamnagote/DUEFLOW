package com.dueflow.repository;

import com.dueflow.domain.Invoice;
import com.dueflow.domain.InvoiceStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface InvoiceRepository extends JpaRepository<Invoice, String> {

    List<Invoice> findByUserIdOrderByCreatedAtDesc(String userId);

    Page<Invoice> findByUserId(String userId, Pageable pageable);

    Optional<Invoice> findByIdAndUserId(String id, String userId);

    Optional<Invoice> findByUserIdAndInvoiceNumber(String userId, String invoiceNumber);

    boolean existsByUserIdAndInvoiceNumber(String userId, String invoiceNumber);

    boolean existsByClientId(String clientId);

    List<Invoice> findByUserIdAndClientId(String userId, String clientId);

    List<Invoice> findByUserIdAndStatus(String userId, InvoiceStatus status);

    long countByUserId(String userId);

    long countByUserIdAndStatus(String userId, InvoiceStatus status);

    @Query("SELECT i FROM Invoice i WHERE i.status = :status AND i.dueDate < :currentDate")
    List<Invoice> findOverdueInvoices(@Param("status") InvoiceStatus status, @Param("currentDate") LocalDate currentDate);

    @Query("SELECT i FROM Invoice i WHERE i.userId = :userId AND " +
           "(LOWER(i.invoiceNumber) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(i.client.name) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(i.description) LIKE LOWER(CONCAT('%', :query, '%')))")
    List<Invoice> searchInvoices(@Param("userId") String userId, @Param("query") String query);

    @Query("SELECT i.currency, SUM(i.totalAmount) FROM Invoice i WHERE i.userId = :userId GROUP BY i.currency")
    List<Object[]> sumTotalAmountByCurrency(@Param("userId") String userId);

    @Query("SELECT i.currency, SUM(i.totalAmount) FROM Invoice i WHERE i.userId = :userId AND i.status != 'PAID' AND i.status != 'CANCELLED' GROUP BY i.currency")
    List<Object[]> sumOutstandingAmountByCurrency(@Param("userId") String userId);

    @Query("SELECT i.currency, SUM(i.totalAmount) FROM Invoice i WHERE i.userId = :userId AND i.status = 'PAID' GROUP BY i.currency")
    List<Object[]> sumCollectedAmountByCurrency(@Param("userId") String userId);
}
