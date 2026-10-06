package in.dueflow.repository;

import in.dueflow.entity.AiAction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface AiActionRepository extends JpaRepository<AiAction, UUID> {
    List<AiAction> findByUserIdOrderByCreatedAtDesc(UUID userId);
}
