package com.dueflow.config;

import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.List;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    @Value("${dueflow.cors.allowed-origins}")
    private String allowedOrigins;

    @Value("${spring.security.oauth2.resourceserver.jwt.jwk-set-uri}")
    private String jwkSetUri;

    @Value("${spring.security.oauth2.resourceserver.jwt.issuer-uri:}")
    private String issuerUri;

    @Value("${dueflow.supabase.jwt-secret:}")
    private String jwtSecret;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .csrf(AbstractHttpConfigurer::disable)
            .headers(headers -> headers
                .frameOptions(frame -> frame.deny())
                .contentTypeOptions(org.springframework.security.config.Customizer.withDefaults())
                .referrerPolicy(referrer -> referrer.policy(
                    org.springframework.security.web.header.writers.ReferrerPolicyHeaderWriter.ReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN))
                .permissionsPolicy(permissions -> permissions.policy("geolocation=(), camera=(), microphone=()"))
            )
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                .requestMatchers("/api/health", "/health", "/api/health/ready", "/health/ready").permitAll()
                .requestMatchers(
                    "/api/integrations/gmail/oauth/callback",
                    "/integrations/gmail/oauth/callback",
                    "/api/integrations/email/google/callback",
                    "/integrations/email/google/callback"
                ).permitAll()
                .requestMatchers("/error").permitAll()
                .requestMatchers("/api/**", "/settings/**", "/integrations/**", "/user/**", "/profile/**", "/clients/**", "/invoices/**", "/reminders/**", "/notifications/**", "/dashboard/**", "/search/**").authenticated()
                .anyRequest().permitAll()
            )
            .oauth2ResourceServer(oauth2 -> oauth2
                .jwt(jwt -> jwt.decoder(jwtDecoder()))
                .authenticationEntryPoint((request, response, authException) -> {
                    response.setContentType("application/json");
                    response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                    response.getWriter().write("{\"success\":false,\"error\":\"Unauthorized\",\"message\":\"Invalid or expired authentication token\"}");
                })
                .accessDeniedHandler((request, response, accessDeniedException) -> {
                    response.setContentType("application/json");
                    response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                    response.getWriter().write("{\"success\":false,\"error\":\"Forbidden\",\"message\":\"Access denied\"}");
                })
            );

        return http.build();
    }

    @Bean
    public JwtDecoder jwtDecoder() {
        final NimbusJwtDecoder hmacDecoder;
        if (jwtSecret != null && !jwtSecret.isBlank() && jwtSecret.length() >= 32) {
            SecretKeySpec secretKey = new SecretKeySpec(jwtSecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
            hmacDecoder = NimbusJwtDecoder.withSecretKey(secretKey).build();
        } else {
            hmacDecoder = null;
        }

        final NimbusJwtDecoder jwksDecoder;
        if (jwkSetUri != null && !jwkSetUri.isBlank() && !jwkSetUri.contains("placeholder")) {
            NimbusJwtDecoder decoder = NimbusJwtDecoder.withJwkSetUri(jwkSetUri)
                    .jwsAlgorithms(algorithms -> {
                        algorithms.add(org.springframework.security.oauth2.jose.jws.SignatureAlgorithm.ES256);
                        algorithms.add(org.springframework.security.oauth2.jose.jws.SignatureAlgorithm.RS256);
                        algorithms.add(org.springframework.security.oauth2.jose.jws.SignatureAlgorithm.ES384);
                        algorithms.add(org.springframework.security.oauth2.jose.jws.SignatureAlgorithm.ES512);
                    })
                    .build();
            if (issuerUri != null && !issuerUri.isBlank() && !issuerUri.contains("placeholder")) {
                decoder.setJwtValidator(org.springframework.security.oauth2.jwt.JwtValidators.createDefaultWithIssuer(issuerUri));
            }
            jwksDecoder = decoder;
        } else {
            jwksDecoder = null;
        }

        return token -> {
            try {
                com.nimbusds.jwt.SignedJWT signedJwt = com.nimbusds.jwt.SignedJWT.parse(token);
                String alg = signedJwt.getHeader().getAlgorithm().getName();
                if (alg.startsWith("HS") && hmacDecoder != null) {
                    return hmacDecoder.decode(token);
                }
                if (jwksDecoder != null) {
                    return jwksDecoder.decode(token);
                }
                if (hmacDecoder != null) {
                    return hmacDecoder.decode(token);
                }
            } catch (Exception ex) {
                if (hmacDecoder != null) {
                    try {
                        return hmacDecoder.decode(token);
                    } catch (Exception ignored) {}
                }
                if (jwksDecoder != null) {
                    return jwksDecoder.decode(token);
                }
            }
            throw new org.springframework.security.oauth2.jwt.BadJwtException("No matching JWT decoder available for token");
        };
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        List<String> origins = new java.util.ArrayList<>(
                Arrays.stream(allowedOrigins.split(","))
                        .map(String::trim)
                        .filter(s -> !s.isEmpty())
                        .toList()
        );

        if (!origins.contains("https://dueflow-kappa.vercel.app")) {
            origins.add("https://dueflow-kappa.vercel.app");
        }
        if (!origins.contains("https://dueflow.vercel.app")) {
            origins.add("https://dueflow.vercel.app");
        }

        configuration.setAllowedOrigins(origins);
        configuration.setAllowedOriginPatterns(List.of(
                "https://*.vercel.app",
                "http://localhost:*",
                "http://127.0.0.1:*"
        ));
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"));
        configuration.setAllowedHeaders(List.of("Authorization", "Content-Type", "Accept", "X-Requested-With", "Origin", "apiKey"));
        configuration.setExposedHeaders(List.of("Content-Disposition", "Content-Type"));
        configuration.setAllowCredentials(true);
        configuration.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}
