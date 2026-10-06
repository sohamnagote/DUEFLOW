package in.dueflow.repository;

import in.dueflow.entity.Integration;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface IntegrationRepository extends JpaRepository<Integration, UUID> {
    List<Integration> findByUserId(UUID userId);
    
    Optional<Integration> findByUserIdAndProvider(UUID userId, String provider);
    
    Optional<Integration> findByUserIdAndChannelAndStatus(UUID userId, String channel, String status);
    
    void deleteByUserIdAndProvider(UUID userId, String provider);
    
    boolean existsByUserIdAndProvider(UUID userId, String provider);
}
