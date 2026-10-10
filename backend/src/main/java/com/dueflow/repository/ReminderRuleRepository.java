package com.dueflow.repository;

import com.dueflow.domain.ReminderRule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ReminderRuleRepository extends JpaRepository<ReminderRule, String> {

    List<ReminderRule> findByUserIdOrderByCreatedAtAsc(String userId);

    List<ReminderRule> findByUserIdAndEnabledTrue(String userId);

    Optional<ReminderRule> findByIdAndUserId(String id, String userId);

    void deleteByIdAndUserId(String id, String userId);
}
