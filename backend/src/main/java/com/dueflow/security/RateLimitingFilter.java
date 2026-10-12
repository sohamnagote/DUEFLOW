package com.dueflow.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Lightweight, thread-safe in-memory rate limiting filter for sensitive endpoints.
 * Protects against brute-force, trigger spam, and OAuth generation flooding.
 */
@Component
@Order(1)
public class RateLimitingFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(RateLimitingFilter.class);

    private static final int MAX_REQUESTS_PER_MINUTE = 30;
    private static final long WINDOW_MILLIS = 60_000L;

    private static class RequestCounter {
        final long windowStart;
        final AtomicInteger count;

        RequestCounter(long windowStart) {
            this.windowStart = windowStart;
            this.count = new AtomicInteger(1);
        }
    }

    private final Map<String, RequestCounter> requestCounts = new ConcurrentHashMap<>();

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        String path = request.getRequestURI();

        if (isSensitiveEndpoint(path)) {
            String clientIp = getClientIp(request);
            String key = clientIp + ":" + path;
            long now = System.currentTimeMillis();

            RequestCounter counter = requestCounts.compute(key, (k, current) -> {
                if (current == null || (now - current.windowStart) > WINDOW_MILLIS) {
                    return new RequestCounter(now);
                }
                current.count.incrementAndGet();
                return current;
            });

            if (counter.count.get() > MAX_REQUESTS_PER_MINUTE) {
                log.warn("Rate limit exceeded for client {} on sensitive endpoint {}", clientIp, path);
                response.setStatus(429);
                response.setContentType("application/json");
                response.getWriter().write("{\"success\":false,\"error\":\"Too Many Requests\",\"message\":\"Rate limit exceeded. Please wait a moment before retrying.\"}");
                return;
            }
        }

        filterChain.doFilter(request, response);
    }

    private boolean isSensitiveEndpoint(String path) {
        if (path == null) return false;
        return path.contains("/integrations/gmail/oauth") ||
               (path.contains("/reminders/") && path.endsWith("/trigger")) ||
               path.contains("/settings/payment/qr") ||
               path.contains("/user/profile/qr-code");
    }

    private String getClientIp(HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isBlank()) {
            return xForwardedFor.split(",")[0].trim();
        }
        String realIp = request.getHeader("X-Real-IP");
        if (realIp != null && !realIp.isBlank()) {
            return realIp.trim();
        }
        return request.getRemoteAddr();
    }
}
