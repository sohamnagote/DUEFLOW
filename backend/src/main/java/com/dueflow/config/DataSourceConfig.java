package com.dueflow.config;

import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

import javax.sql.DataSource;

@Configuration
public class DataSourceConfig {

    private static final Logger log = LoggerFactory.getLogger(DataSourceConfig.class);

    @Bean
    @Primary
    public DataSource dataSource(
            @Value("${spring.datasource.url:jdbc:postgresql://localhost:5432/dueflow}") String rawUrl,
            @Value("${spring.datasource.username:postgres}") String username,
            @Value("${spring.datasource.password:postgres}") String password,
            @Value("${spring.datasource.driver-class-name:org.postgresql.Driver}") String driverClassName) {

        String jdbcUrl = rawUrl;
        String resolvedUser = username;
        String resolvedPassword = password;

        if (jdbcUrl != null && !jdbcUrl.isBlank()) {
            if (jdbcUrl.startsWith("postgres://") || jdbcUrl.startsWith("postgresql://")) {
                try {
                    String cleanUriStr = jdbcUrl.startsWith("jdbc:") ? jdbcUrl.substring(5) : jdbcUrl;
                    java.net.URI uri = new java.net.URI(cleanUriStr);
                    if (uri.getUserInfo() != null && uri.getUserInfo().contains(":")) {
                        String[] creds = uri.getUserInfo().split(":", 2);
                        resolvedUser = creds[0];
                        resolvedPassword = creds[1];
                    }
                    String host = uri.getHost();
                    int port = uri.getPort() > 0 ? uri.getPort() : 5432;
                    String path = uri.getPath() != null && !uri.getPath().isEmpty() ? uri.getPath() : "/postgres";
                    jdbcUrl = "jdbc:postgresql://" + host + ":" + port + path;
                } catch (Exception e) {
                    log.warn("Failed to parse postgres URL via URI parser, falling back to prefix strip: {}", e.getMessage());
                    if (jdbcUrl.startsWith("postgres://")) {
                        jdbcUrl = "jdbc:postgresql://" + jdbcUrl.substring("postgres://".length());
                    } else if (jdbcUrl.startsWith("postgresql://")) {
                        jdbcUrl = "jdbc:postgresql://" + jdbcUrl.substring("postgresql://".length());
                    }
                }
            }
        }

        HikariConfig config = new HikariConfig();
        config.setJdbcUrl(jdbcUrl);
        config.setUsername(resolvedUser);
        config.setPassword(resolvedPassword);

        // Do not crash Spring Boot startup if the database pool takes seconds to warm up
        config.setInitializationFailTimeout(15000); // Wait up to 15s instead of immediate fail

        if (jdbcUrl != null && jdbcUrl.contains(":h2:")) {
            config.setDriverClassName("org.h2.Driver");
        } else {
            config.setDriverClassName(driverClassName != null ? driverClassName : "org.postgresql.Driver");
            config.setMaximumPoolSize(10);
            config.setMinimumIdle(2);
            config.setIdleTimeout(30000);
            config.setConnectionTimeout(20000);
            config.setMaxLifetime(1800000);
        }

        log.info("Initialized DataSource for URL: {}", jdbcUrl != null && jdbcUrl.contains("@") ? jdbcUrl.replaceAll(":[^@]+@", ":***@") : jdbcUrl);
        return new HikariDataSource(config);
    }
}
