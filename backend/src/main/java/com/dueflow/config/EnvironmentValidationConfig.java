package com.dueflow.config;

import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;

import java.util.ArrayList;
import java.util.List;

@Configuration
public class EnvironmentValidationConfig {

    private static final Logger log = LoggerFactory.getLogger(EnvironmentValidationConfig.class);

    private static final String WEAK_DEFAULT_KEY = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

    private final Environment environment;

    @Value("${dueflow.supabase.url:}")
    private String supabaseUrl;

    @Value("${dueflow.security.encryption-key:}")
    private String encryptionKey;

    @Value("${dueflow.google.client-id:}")
    private String googleClientId;

    @Value("${dueflow.google.client-secret:}")
    private String googleClientSecret;

    @Value("${spring.datasource.url:}")
    private String datasourceUrl;

    public EnvironmentValidationConfig(Environment environment) {
        this.environment = environment;
    }

    @PostConstruct
    public void validateConfiguration() {
        boolean isProduction = isProductionProfile();

        List<String> missingProductionVars = new ArrayList<>();

        if (isProduction) {
            log.info("Production profile active. Running mandatory security environment audit...");

            if (supabaseUrl == null || supabaseUrl.isBlank() || supabaseUrl.contains("placeholder")) {
                missingProductionVars.add("SUPABASE_URL");
            }

            if (encryptionKey == null || encryptionKey.isBlank()) {
                log.warn("Security notice: GMAIL_TOKEN_ENCRYPTION_KEY is not configured in environment. Gmail OAuth tokens cannot be encrypted until configured.");
            } else if (encryptionKey.equals(WEAK_DEFAULT_KEY) || encryptionKey.length() < 32) {
                log.warn("Security notice: GMAIL_TOKEN_ENCRYPTION_KEY is using a default or short sample key. For production, configure a dedicated 256-bit key in Render environment settings.");
            }

            if (datasourceUrl == null || datasourceUrl.isBlank() || datasourceUrl.contains("localhost:5432/dueflow")) {
                missingProductionVars.add("DATABASE_URL");
            }

            if (!missingProductionVars.isEmpty()) {
                String missingList = String.join(", ", missingProductionVars);
                log.error("Production startup failed: Mandatory environment variable(s) not configured: {}", missingList);
                throw new IllegalStateException("Production startup failed: The following required environment variable(s) are missing: " + missingList);
            }

            log.info("Production environment configuration validation: PASSED");
        } else {
            // Local / Development / Test checks
            if (encryptionKey != null && !encryptionKey.isBlank() && encryptionKey.length() < 16) {
                log.warn("GMAIL_TOKEN_ENCRYPTION_KEY is shorter than recommended (minimum 16 characters for dev, 32 for prod).");
            }
        }
    }

    private boolean isProductionProfile() {
        String[] activeProfiles = environment.getActiveProfiles();
        for (String profile : activeProfiles) {
            if ("prod".equalsIgnoreCase(profile) || "production".equalsIgnoreCase(profile)) {
                return true;
            }
        }
        return false;
    }
}
