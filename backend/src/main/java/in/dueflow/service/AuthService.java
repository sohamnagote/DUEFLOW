package in.dueflow.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import in.dueflow.dto.AuthDtos.AuthResponse;
import in.dueflow.dto.AuthDtos.LoginRequest;
import in.dueflow.dto.AuthDtos.SignupRequest;
import in.dueflow.dto.AuthDtos.UpdateProfileRequest;
import in.dueflow.entity.Profile;
import in.dueflow.exception.BadRequestException;
import in.dueflow.repository.ProfileRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Base64;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Service
public class AuthService {

    private static final Logger log = LoggerFactory.getLogger(AuthService.class);

    @Value("${SUPABASE_URL:${VITE_SUPABASE_URL:${NEXT_PUBLIC_SUPABASE_URL:}}}")
    private String supabaseUrl;

    @Value("${SUPABASE_SECRET_KEY:}")
    private String supabaseSecretKey;

    @Value("${SUPABASE_ANON_KEY:${VITE_SUPABASE_ANON_KEY:${NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:}}}")
    private String supabaseAnonKey;

    private final ProfileRepository profileRepository;
    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();
    private final ObjectMapper objectMapper = new ObjectMapper();

    public AuthService(ProfileRepository profileRepository) {
        this.profileRepository = profileRepository;
    }

    private boolean isSupabaseConfigured() {
        return supabaseUrl != null && !supabaseUrl.isBlank() &&
                !supabaseUrl.contains("your-project") &&
                supabaseSecretKey != null && !supabaseSecretKey.isBlank() &&
                !supabaseSecretKey.contains("your_service_key");
    }

    @Transactional
    public AuthResponse signup(SignupRequest req) {
        String normalizedEmail = req.getEmail().toLowerCase().trim();

        if (isSupabaseConfigured()) {
            try {
                // Call Supabase Auth Admin to create confirmed user
                String adminUrl = supabaseUrl.replaceAll("/+$", "") + "/auth/v1/admin/users";
                Map<String, Object> body = Map.of(
                        "email", normalizedEmail,
                        "password", req.getPassword(),
                        "email_confirm", true,
                        "user_metadata", Map.of(
                                "full_name", req.getFull_name() != null ? req.getFull_name() : "",
                                "business_name", req.getBusiness_name() != null ? req.getBusiness_name() : ""
                        )
                );

                HttpRequest request = HttpRequest.newBuilder()
                        .uri(URI.create(adminUrl))
                        .header("Authorization", "Bearer " + supabaseSecretKey.trim())
                        .header("apikey", supabaseSecretKey.trim())
                        .header("Content-Type", "application/json")
                        .POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(body), StandardCharsets.UTF_8))
                        .build();

                HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

                if (response.statusCode() >= 200 && response.statusCode() < 300) {
                    JsonNode userJson = objectMapper.readTree(response.body());
                    String userIdStr = userJson.path("id").asText();
                    UUID userId = UUID.fromString(userIdStr);

                    Profile profile = profileRepository.findById(userId).orElse(new Profile(userId, normalizedEmail));
                    if (req.getFull_name() != null) profile.setFullName(req.getFull_name());
                    if (req.getBusiness_name() != null) profile.setBusinessName(req.getBusiness_name());
                    profile = profileRepository.save(profile);

                    // Login to get access token — must succeed since Supabase is configured.
                    // Never fall back to a dev token in a configured production environment.
                    String token = loginSupabase(normalizedEmail, req.getPassword())
                            .orElseThrow(() -> new BadRequestException(
                                    "Account created but sign-in failed. Please try logging in manually."));

                    return new AuthResponse(token, profile);
                } else {
                    log.warn("[Supabase Signup Failed]: {}", response.body());
                    JsonNode errJson = objectMapper.readTree(response.body());
                    String msg = errJson.path("msg").asText(errJson.path("message").asText("Signup failed with Supabase"));
                    throw new BadRequestException(msg);
                }
            } catch (BadRequestException e) {
                throw e;
            } catch (Exception e) {
                log.error("[Supabase Signup Error]: {}", e.getMessage());
            }
        }

        // Local / Dev Fallback
        UUID userId = UUID.randomUUID();
        Profile profile = new Profile(userId, normalizedEmail);
        profile.setFullName(req.getFull_name() != null ? req.getFull_name() : "");
        profile.setBusinessName(req.getBusiness_name() != null ? req.getBusiness_name() : "");
        profile = profileRepository.save(profile);

        String token = "dueflow_dev_" + userId + "_" + Base64.getEncoder().encodeToString(normalizedEmail.getBytes(StandardCharsets.UTF_8));
        return new AuthResponse(token, profile);
    }

    @Transactional
    public AuthResponse login(LoginRequest req) {
        String normalizedEmail = req.getEmail().toLowerCase().trim();

        if (isSupabaseConfigured() && supabaseAnonKey != null && !supabaseAnonKey.contains("your_key")) {
            Optional<String> tokenOpt = loginSupabase(normalizedEmail, req.getPassword());
            if (tokenOpt.isPresent()) {
                String token = tokenOpt.get();
                // Profile lookup
                Profile profile = profileRepository.findByEmailIgnoreCase(normalizedEmail)
                        .orElseGet(() -> profileRepository.save(new Profile(UUID.randomUUID(), normalizedEmail)));
                return new AuthResponse(token, profile);
            } else {
                throw new BadRequestException("Invalid login credentials");
            }
        }

        Profile profile = profileRepository.findByEmailIgnoreCase(normalizedEmail)
                .orElseGet(() -> {
                    Profile p = new Profile(UUID.randomUUID(), normalizedEmail);
                    p.setFullName("Freelancer Professional");
                    p.setBusinessName("Agency Studio");
                    return profileRepository.save(p);
                });

        String token = "dueflow_dev_" + profile.getId() + "_" + Base64.getEncoder().encodeToString(normalizedEmail.getBytes(StandardCharsets.UTF_8));
        return new AuthResponse(token, profile);
    }

    private Optional<String> loginSupabase(String email, String password) {
        try {
            String tokenUrl = supabaseUrl.replaceAll("/+$", "") + "/auth/v1/token?grant_type=password";
            Map<String, Object> body = Map.of("email", email, "password", password);

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(tokenUrl))
                    .header("apikey", supabaseAnonKey.trim())
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(body), StandardCharsets.UTF_8))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() == 200) {
                JsonNode resJson = objectMapper.readTree(response.body());
                String accessToken = resJson.path("access_token").asText(null);
                return Optional.ofNullable(accessToken);
            }
        } catch (Exception e) {
            log.warn("[Supabase Login Request Error]: {}", e.getMessage());
        }
        return Optional.empty();
    }

    public Profile getProfile(UUID userId) {
        return profileRepository.findById(userId).orElse(new Profile(userId, ""));
    }

    @Transactional
    public Profile updateProfile(UUID userId, UpdateProfileRequest req) {
        Profile profile = profileRepository.findById(userId).orElse(new Profile(userId, ""));
        if (req.getFull_name() != null) profile.setFullName(req.getFull_name().trim());
        if (req.getBusiness_name() != null) profile.setBusinessName(req.getBusiness_name().trim());
        if (req.getPhone() != null) profile.setPhone(req.getPhone().trim());
        if (req.getTimezone() != null) profile.setTimezone(req.getTimezone().trim());
        if (req.getUpi_id() != null) profile.setUpiId(req.getUpi_id().trim());
        if (req.getBank_account() != null) profile.setBankAccount(req.getBank_account().trim());
        if (req.getBank_ifsc() != null) profile.setBankIfsc(req.getBank_ifsc().trim());
        if (req.getReminder_default() != null) profile.setReminderDefault(req.getReminder_default().trim());

        return profileRepository.save(profile);
    }
}
