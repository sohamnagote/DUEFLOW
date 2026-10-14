package com.dueflow.repository;

import com.dueflow.domain.Client;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ClientRepository extends JpaRepository<Client, String> {

    List<Client> findByUserId(String userId);

    List<Client> findByUserIdOrderByCreatedAtDesc(String userId);

    Page<Client> findByUserId(String userId, Pageable pageable);

    Optional<Client> findByIdAndUserId(String id, String userId);

    Optional<Client> findByUserIdAndNameIgnoreCase(String userId, String name);

    Optional<Client> findByUserIdAndEmailIgnoreCase(String userId, String email);

    boolean existsByIdAndUserId(String id, String userId);

    @Query("SELECT c FROM Client c WHERE c.userId = :userId AND " +
           "(LOWER(c.name) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(c.email) LIKE LOWER(CONCAT('%', :query, '%')))")
    List<Client> searchClients(@Param("userId") String userId, @Param("query") String query);

    long countByUserId(String userId);
}
