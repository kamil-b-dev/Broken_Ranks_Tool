package pl.brokenranks.tool.broken_ranks_tool.core.ratelimit;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.regex.Pattern;
import org.slf4j.MDC;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import pl.brokenranks.tool.broken_ranks_tool.core.config.RequestTracingFilter;
import pl.brokenranks.tool.broken_ranks_tool.core.exception.ApiError;

/** Rejects oversized or excessively frequent requests before request bodies are parsed. */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 1)
@EnableConfigurationProperties(AbuseProtectionProperties.class)
public class AbuseProtectionFilter extends OncePerRequestFilter {

    private static final Pattern SAFE_CLIENT_ID = Pattern.compile("[0-9A-Fa-f:.]{1,64}");
    private static final String OPTIMIZER_PATH = "/api/optimizer/drifs";
    private static final String CALCULATOR_PATH = "/api/calculator/calculate";

    private final AbuseProtectionProperties properties;
    private final RequestRateLimiter rateLimiter;
    private final ObjectMapper objectMapper;

    @Autowired
    public AbuseProtectionFilter(AbuseProtectionProperties properties, ObjectMapper objectMapper) {
        this(properties, new RequestRateLimiter(), objectMapper);
    }

    AbuseProtectionFilter(
            AbuseProtectionProperties properties,
            RequestRateLimiter rateLimiter,
            ObjectMapper objectMapper) {
        this.properties = properties;
        this.rateLimiter = rateLimiter;
        this.objectMapper = objectMapper;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        if (!"POST".equals(request.getMethod())) return true;
        String path = request.getRequestURI();
        return !OPTIMIZER_PATH.equals(path) && !CALCULATOR_PATH.equals(path);
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        long contentLength = request.getContentLengthLong();
        if (contentLength > properties.maxRequestBytes()) {
            writeError(
                    response,
                    HttpServletResponse.SC_REQUEST_ENTITY_TOO_LARGE,
                    "REQUEST_TOO_LARGE",
                    "Żądanie przekracza dozwolony rozmiar.");
            return;
        }

        String policy;
        AbuseProtectionProperties.Limit limit;
        if (OPTIMIZER_PATH.equals(request.getRequestURI())) {
            policy = "optimizer";
            limit = properties.optimizer();
        } else {
            policy = "calculator";
            limit = properties.calculator();
        }

        RequestRateLimiter.Decision decision =
                rateLimiter.acquire(policy, clientId(request), limit);
        if (!decision.allowed()) {
            response.setHeader("Retry-After", Integer.toString(decision.retryAfterSeconds()));
            writeError(
                    response,
                    HttpStatus.TOO_MANY_REQUESTS.value(),
                    "RATE_LIMITED",
                    "Przekroczono limit żądań. Spróbuj ponownie później.");
            return;
        }

        filterChain.doFilter(request, response);
    }

    private String clientId(HttpServletRequest request) {
        String forwardedFor = request.getHeader("X-Forwarded-For");
        if (forwardedFor != null) {
            String candidate = forwardedFor.split(",", 2)[0].trim();
            if (SAFE_CLIENT_ID.matcher(candidate).matches()) return candidate;
        }
        return request.getRemoteAddr();
    }

    private void writeError(HttpServletResponse response, int status, String code, String message)
            throws IOException {
        response.setStatus(status);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        objectMapper.writeValue(
                response.getOutputStream(),
                new ApiError(code, message, MDC.get(RequestTracingFilter.REQUEST_ID)));
    }
}
