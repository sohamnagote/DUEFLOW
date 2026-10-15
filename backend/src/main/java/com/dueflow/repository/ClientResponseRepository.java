package com.dueflow.repository;

import com.dueflow.domain.ClientResponse;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ClientResponseRepository extends JpaRepository<ClientResponse, String> {

    List<ClientResponse> findByInvoiceIdOrderByCreatedAtDesc(String invoiceId);

    List<ClientResponse> findByUserIdOrderByCreatedAtDesc(String userId);

    List<ClientResponse> findByUserIdAndReviewStatus(String userId, String reviewStatus);

    Optional<ClientResponse> findByIdempotencyKey(String idempotencyKey);

    Optional<ClientResponse> findByIdAndUserId(String id, String userId);

    long countByUserIdAndReviewStatus(String userId, String reviewStatus);
}
