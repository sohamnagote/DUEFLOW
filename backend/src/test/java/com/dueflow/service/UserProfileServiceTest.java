package com.dueflow.service;

import com.dueflow.domain.UserProfile;
import com.dueflow.repository.PaymentSettingsRepository;
import com.dueflow.repository.UserProfileRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.dao.DataIntegrityViolationException;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
public class UserProfileServiceTest {

    private static final String USER_ID = "user-test-uuid-555";
    private static final String USER_EMAIL = "developer@example.com";

    @Mock
    private UserProfileRepository userProfileRepository;

    @Mock
    private PaymentSettingsRepository paymentSettingsRepository;

    private UserProfileService userProfileService;

    @BeforeEach
    void setUp() {
        userProfileService = new UserProfileService(userProfileRepository, paymentSettingsRepository);
    }

    @Test
    @DisplayName("First login: Profile is auto-provisioned and persisted in database")
    void testFirstLoginCreatesProfile() {
        when(userProfileRepository.findById(USER_ID)).thenReturn(Optional.empty());

        UserProfile savedProfile = new UserProfile(USER_ID, USER_EMAIL);
        when(userProfileRepository.saveAndFlush(any(UserProfile.class))).thenReturn(savedProfile);

        UserProfile result = userProfileService.getOrCreateProfile(USER_ID, USER_EMAIL);

        assertNotNull(result);
        assertEquals(USER_ID, result.getUserId());
        assertEquals(USER_EMAIL, result.getEmail());
        verify(userProfileRepository).saveAndFlush(any(UserProfile.class));
    }

    @Test
    @DisplayName("Repeated initialization preserves existing profile without duplicating")
    void testRepeatedInitializationPreservesExistingProfile() {
        UserProfile existing = new UserProfile(USER_ID, USER_EMAIL);
        existing.setFullName("Jane Doe");
        existing.setPreferredCurrency("USD");
        when(userProfileRepository.findById(USER_ID)).thenReturn(Optional.of(existing));

        UserProfile result = userProfileService.getOrCreateProfile(USER_ID, USER_EMAIL);

        assertNotNull(result);
        assertEquals("Jane Doe", result.getFullName());
        assertEquals("USD", result.getPreferredCurrency());
        verify(userProfileRepository, never()).saveAndFlush(any());
    }

    @Test
    @DisplayName("Concurrent race condition: Recovers safely if another thread creates profile simultaneously")
    void testConcurrentRaceConditionRecovery() {
        UserProfile concurrentProfile = new UserProfile(USER_ID, USER_EMAIL);

        // First findById returns empty (both threads see empty)
        when(userProfileRepository.findById(USER_ID))
                .thenReturn(Optional.empty())
                .thenReturn(Optional.of(concurrentProfile));

        // saveAndFlush throws unique constraint violation because other thread committed first
        when(userProfileRepository.saveAndFlush(any(UserProfile.class)))
                .thenThrow(new DataIntegrityViolationException("duplicate key value violates unique constraint user_profiles_pkey"));

        UserProfile result = userProfileService.getOrCreateProfile(USER_ID, USER_EMAIL);

        assertNotNull(result);
        assertEquals(USER_ID, result.getUserId());
    }

    @Test
    @DisplayName("Updates profile email if existing profile had empty email")
    void testUpdatesEmptyEmailWhenProvided() {
        UserProfile existing = new UserProfile(USER_ID, "");
        when(userProfileRepository.findById(USER_ID)).thenReturn(Optional.of(existing));
        when(userProfileRepository.save(existing)).thenReturn(existing);

        UserProfile result = userProfileService.getOrCreateProfile(USER_ID, "new@example.com");

        assertNotNull(result);
        assertEquals("new@example.com", result.getEmail());
        verify(userProfileRepository).save(existing);
    }
}
