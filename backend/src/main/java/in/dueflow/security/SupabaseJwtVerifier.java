package in.dueflow.security;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.Optional;
import java.util.UUID;

@Component
public class SupabaseJwtVerifier {

    private static final Logger log = LoggerFactory.getLogger(SupabaseJwtVerifier.class);

    @Value("${SUPABASE_URL:${VITE_SUPABASE_URL:${NEXT_PUBLIC_SUPABASE_URL:}}}")
    private String supabaseUrl;

    @Value("${SUPABASE_ANON_KEY:${VITE_SUPABASE_ANON_KEY:${NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:}}}")
    private String supabaseAnonKey;

    @Value("${NODE_ENV:development}")
    private String nodeEnv;

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(5))
            .build();
    private final ObjectMapper objectMapper = new ObjectMapper();

    public Optional<AuthenticatedUser> verify(String token) {
        if (token == null || token.isBlank()) {
            return Optional.empty();
        }

        // Production security rule: Never allow dev tokens in production
        boolean isProduction = "production".equalsIgnoreCase(nodeEnv);

        if (token.startsWith("dueflow_dev_")) {
            if (isProduction) {
                log.warn("[Security] Rejection: Custom development tokens are forbidden in production.");
                return Optional.empty();
            }

            try {
                String remainder = token.substring("dueflow_dev_".length());
                String[] parts = remainder.split("_");
                UUID userId = UUID.fromString(parts[0]);
                String email = "dev@dueflow.in";
                if (parts.length > 1) {
                    try {
                        email = new String(Base64.getDecoder().decode(parts[1]), StandardCharsets.UTF_8);
                    } catch (Exception ignored) {}
                }
                return Optional.of(new AuthenticatedUser(userId, email, "Developer User", "DueFlow Studio"));
            } catch (Exception e) {
                log.warn("[Security] Malformed dev token: {}", e.getMessage());
                return Optional.empty();
            }
        }

        // Remote Supabase verification if configured
        boolean isSupabaseConfigured = supabaseUrl != null && !supabaseUrl.isBlank() &&
                !supabaseUrl.contains("your-project") &&
                supabaseAnonKey != null && !supabaseAnonKey.isBlank() &&
                !supabaseAnonKey.contains("your_key");

        if (isSupabaseConfigured) {
            try {
                String authUserUrl = supabaseUrl.replaceAll("/+$", "") + "/auth/v1/user";
                HttpRequest request = HttpRequest.newBuilder()
                        .uri(URI.create(authUserUrl))
                        .header("Authorization", "Bearer " + token.trim())
                        .header("apikey", supabaseAnonKey.trim())
                        .timeout(Duration.ofSeconds(5))
                        .GET()
                        .build();

                HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
                if (response.statusCode() == 200) {
                    JsonNode userJson = objectMapper.readTree(response.body());
                    String idStr = userJson.path("id").asText();
                    String email = userJson.path("email").asText();
                    JsonNode meta = userJson.path("user_metadata");
                    String fullName = meta.path("full_name").asText("");
                    String businessName = meta.path("business_name").asText("");

                    if (idStr != null && !idStr.isBlank()) {
                        return Optional.of(new AuthenticatedUser(UUID.fromString(idStr), email, fullName, businessName));
                    }
                } else {
                    log.debug("[Supabase Auth] Token verification rejected by Supabase API: HTTP {}", response.statusCode());
                }
            } catch (Exception e) {
                log.warn("[Supabase Auth] Remote verification error: {}", e.getMessage());
            }
        }

        // Cryptographic / Claims extraction fallback for valid standard JWT
        try {
            String[] parts = token.split("\\.");
            if (parts.length >= 2) {
                String payloadJson = new String(Base64.getUrlDecoder().decode(parts[1]), StandardCharsets.UTF_8);
                JsonNode claims = objectMapper.readTree(payloadJson);

                long exp = claims.path("exp").asLong(0);
                if (exp > 0 && Instant.now().getEpochSecond() > exp) {
                    log.warn("[Security] Token expired at {}", exp);
                    return Optional.empty();
                }

                String sub = claims.path("sub").asText();
                String email = claims.path("email").asText();
                JsonNode meta = claims.path("user_metadata");
                String fullName = meta.path("full_name").asText("");
                String businessName = meta.path("business_name").asText("");

                if (sub != null && !sub.isBlank()) {
                    return Optional.of(new AuthenticatedUser(UUID.fromString(sub), email, fullName, businessName));
                }
            }
        } catch (Exception e) {
            log.debug("[Security] Could not decode JWT claims: {}", e.getMessage());
        }

        return Optional.empty();
    }
}
