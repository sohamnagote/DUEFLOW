package com.dueflow.repository;

import com.dueflow.domain.PaymentSettings;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface PaymentSettingsRepository extends JpaRepository<PaymentSettings, String> {
    Optional<PaymentSettings> findByUserId(String userId);
}
