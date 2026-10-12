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
        if (jdbcUrl != null && !jdbcUrl.isBlank()) {
            if (jdbcUrl.startsWith("postgres://")) {
                jdbcUrl = "jdbc:postgresql://" + jdbcUrl.substring("postgres://".length());
            } else if (jdbcUrl.startsWith("postgresql://")) {
                jdbcUrl = "jdbc:postgresql://" + jdbcUrl.substring("postgresql://".length());
            }
        }

        HikariConfig config = new HikariConfig();
        config.setJdbcUrl(jdbcUrl);
        config.setUsername(username);
        config.setPassword(password);

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

        log.info("Initialized DataSource for URL scheme: {}", jdbcUrl != null && jdbcUrl.startsWith("jdbc:h2:") ? "h2:mem" : "postgresql");
        return new HikariDataSource(config);
    }
}
