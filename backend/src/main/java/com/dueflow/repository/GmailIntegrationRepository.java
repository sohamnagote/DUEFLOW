package com.dueflow.repository;

import com.dueflow.domain.GmailIntegration;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface GmailIntegrationRepository extends JpaRepository<GmailIntegration, String> {
    Optional<GmailIntegration> findByUserId(String userId);
    boolean existsByUserIdAndConnectionStatus(String userId, String connectionStatus);
    void deleteByUserId(String userId);
}
