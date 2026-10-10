package com.dueflow.security;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;

import java.util.Optional;

public final class SecurityUtils {

    private SecurityUtils() {
    }

    public static Optional<String> getCurrentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            return Optional.empty();
        }

        Object principal = auth.getPrincipal();
        if (principal instanceof Jwt jwt) {
            String subject = jwt.getSubject();
            if (subject != null && !subject.isBlank()) {
                return Optional.of(subject);
            }
        } else if (principal instanceof String principalStr && !"anonymousUser".equals(principalStr)) {
            return Optional.of(principalStr);
        }

        return Optional.empty();
    }

    public static String getRequiredUserId() {
        return getCurrentUserId()
                .orElseThrow(() -> new org.springframework.security.access.AccessDeniedException("User is not authenticated"));
    }

    public static Optional<String> getCurrentUserEmail() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            return Optional.empty();
        }

        Object principal = auth.getPrincipal();
        if (principal instanceof Jwt jwt) {
            String email = jwt.getClaimAsString("email");
            if (email != null && !email.isBlank()) {
                return Optional.of(email);
            }
        }

        return Optional.empty();
    }
}
