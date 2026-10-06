package in.dueflow.security;

import in.dueflow.entity.Profile;
import in.dueflow.repository.ProfileRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;
import java.util.Optional;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final SupabaseJwtVerifier jwtVerifier;
    private final ProfileRepository profileRepository;

    public JwtAuthenticationFilter(SupabaseJwtVerifier jwtVerifier, ProfileRepository profileRepository) {
        this.jwtVerifier = jwtVerifier;
        this.profileRepository = profileRepository;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        String authHeader = request.getHeader("Authorization");
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7).trim();
            if (!token.isBlank()) {
                Optional<AuthenticatedUser> userOpt = jwtVerifier.verify(token);
                if (userOpt.isPresent()) {
                    AuthenticatedUser user = userOpt.get();

                    // Auto-provision or update Profile in database if needed
                    Profile profile = profileRepository.findById(user.getId()).orElse(null);
                    if (profile == null) {
                        Profile newProfile = new Profile(user.getId(), user.getEmail());
                        newProfile.setFullName(user.getFullName());
                        newProfile.setBusinessName(user.getBusinessName());
                        profileRepository.save(newProfile);
                    }

                    UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
                            user,
                            null,
                            List.of(new SimpleGrantedAuthority("ROLE_USER"))
                    );
                    SecurityContextHolder.getContext().setAuthentication(auth);
                }
            }
        }

        filterChain.doFilter(request, response);
    }
}
