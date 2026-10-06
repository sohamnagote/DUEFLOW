package in.dueflow.security;

import in.dueflow.exception.UnauthorizedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.UUID;

public class SecurityUtils {

    public static AuthenticatedUser getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof AuthenticatedUser user) {
            return user;
        }
        throw new UnauthorizedException("Unauthorized: Valid JWT session required");
    }

    public static UUID getCurrentUserId() {
        return getCurrentUser().getId();
    }
}
