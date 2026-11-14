package pl.brokenranks.tool.broken_ranks_tool.core.ratelimit;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.slf4j.MDC;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Import;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.web.servlet.util.matcher.PathPatternRequestMatcher;
import org.springframework.security.web.util.matcher.RequestMatcher;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import pl.brokenranks.tool.broken_ranks_tool.core.web.error.ApiError;
import pl.brokenranks.tool.broken_ranks_tool.core.web.error.ApiErrorCode;
import pl.brokenranks.tool.broken_ranks_tool.core.web.filter.RequestTracingFilter;
import tools.jackson.databind.ObjectMapper;

/** Rejects oversized declarations and excessive request rates before bodies are received. */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 1)
@EnableConfigurationProperties(AbuseProtectionProperties.class)
@Import(ClientAddressResolver.class)
public class AbuseProtectionFilter extends OncePerRequestFilter {

    // Match decoded path segments just like Spring Security and MVC, including encoded letters.
    private static final RequestMatcher OPTIMIZER_REQUEST =
            PathPatternRequestMatcher.pathPattern(HttpMethod.POST, "/api/optimizer/drifs");
    private static final RequestMatcher PROGRESSION_REQUEST =
            PathPatternRequestMatcher.pathPattern(HttpMethod.POST, "/api/progression-path/plan");
    private static final RequestMatcher CALCULATOR_REQUEST =
            PathPatternRequestMatcher.pathPattern(HttpMethod.POST, "/api/calculator/calculate");
    private static final RequestMatcher CANCELLATION_REQUEST =
            PathPatternRequestMatcher.pathPattern(
                    HttpMethod.POST, "/api/optimizer/advisor/*/cancel");
    private static final RequestMatcher PUBLIC_DATA_REQUEST =
            PathPatternRequestMatcher.pathPattern(HttpMethod.GET, "/api/**");

    private final AbuseProtectionProperties properties;
    private final RequestRateLimiter rateLimiter;
    private final ObjectMapper objectMapper;
    private final ClientAddressResolver addresses;

    @Autowired
    public AbuseProtectionFilter(
            AbuseProtectionProperties properties,
            ObjectMapper objectMapper,
            ClientAddressResolver addresses) {
        this(properties, new RequestRateLimiter(), objectMapper, addresses);
    }

    AbuseProtectionFilter(
            AbuseProtectionProperties properties,
            RequestRateLimiter rateLimiter,
            ObjectMapper objectMapper) {
        this(properties, rateLimiter, objectMapper, new ClientAddressResolver(false));
    }

    AbuseProtectionFilter(
            AbuseProtectionProperties properties,
            RequestRateLimiter rateLimiter,
            ObjectMapper objectMapper,
            ClientAddressResolver addresses) {
        this.properties = properties;
        this.rateLimiter = rateLimiter;
        this.objectMapper = objectMapper;
        this.addresses = addresses;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return !PUBLIC_DATA_REQUEST.matches(request)
                && !OPTIMIZER_REQUEST.matches(request)
                && !PROGRESSION_REQUEST.matches(request)
                && !CALCULATOR_REQUEST.matches(request)
                && !CANCELLATION_REQUEST.matches(request);
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        boolean publicDataRequest = HttpMethod.GET.matches(request.getMethod());
        long contentLength = request.getContentLengthLong();
        if (!publicDataRequest && contentLength > properties.maxRequestBytes()) {
            writeError(
                    response,
                    HttpServletResponse.SC_REQUEST_ENTITY_TOO_LARGE,
                    ApiErrorCode.REQUEST_TOO_LARGE,
                    "Żądanie przekracza dozwolony rozmiar.");
            return;
        }

        RateLimitPolicy policy;
        AbuseProtectionProperties.Limit limit;
        if (publicDataRequest) {
            policy = RateLimitPolicy.PUBLIC_DATA;
            limit = properties.publicData();
        } else if (OPTIMIZER_REQUEST.matches(request) || PROGRESSION_REQUEST.matches(request)) {
            policy = RateLimitPolicy.OPTIMIZER;
            limit = properties.optimizerIngress();
        } else if (CALCULATOR_REQUEST.matches(request)) {
            policy = RateLimitPolicy.CALCULATOR;
            limit = properties.calculator();
        } else {
            policy = RateLimitPolicy.CONTROL;
            limit = properties.control();
        }

        RequestRateLimiter.Decision decision =
                rateLimiter.acquire(policy, addresses.resolve(request), limit);
        if (!decision.allowed()) {
            response.setHeader("Retry-After", Integer.toString(decision.retryAfterSeconds()));
            writeError(
                    response,
                    HttpStatus.TOO_MANY_REQUESTS.value(),
                    ApiErrorCode.RATE_LIMITED,
                    "Przekroczono limit żądań. Spróbuj ponownie później.");
            return;
        }

        filterChain.doFilter(request, response);
    }

    private void writeError(
            HttpServletResponse response, int status, ApiErrorCode code, String message)
            throws IOException {
        response.setStatus(status);
        response.setHeader("Connection", "close");
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        objectMapper.writeValue(
                response.getOutputStream(),
                new ApiError(code, message, MDC.get(RequestTracingFilter.REQUEST_ID)));
    }
}
