package in.dueflow.repository;

import in.dueflow.entity.Client;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ClientRepository extends JpaRepository<Client, UUID> {
    List<Client> findByUserIdOrderByCreatedAtDesc(UUID userId);
    Optional<Client> findByUserIdAndId(UUID userId, UUID id);
    void deleteByUserIdAndId(UUID userId, UUID id);
    boolean existsByUserIdAndId(UUID userId, UUID id);
}
