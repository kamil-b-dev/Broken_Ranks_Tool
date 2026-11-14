package pl.brokenranks.tool.broken_ranks_tool.core.ratelimit;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;
import pl.brokenranks.tool.broken_ranks_tool.core.web.error.ApiErrorCode;
import pl.brokenranks.tool.broken_ranks_tool.core.web.error.ApiException;

/** Charges the expensive-work allowance after MVC has parsed and validated the request DTO. */
@Component
public class ValidatedCalculationRateLimiter {
    private final AbuseProtectionProperties.Limit limit;
    private final AbuseProtectionProperties.Limit sharedLimit;
    private final RequestRateLimiter limiter;
    private final ClientAddressResolver addresses;

    @Autowired
    public ValidatedCalculationRateLimiter(
            AbuseProtectionProperties properties, ClientAddressResolver addresses) {
        this(properties, addresses, new RequestRateLimiter());
    }

    ValidatedCalculationRateLimiter(
            AbuseProtectionProperties properties,
            ClientAddressResolver addresses,
            RequestRateLimiter limiter) {
        this.limit = properties.optimizer();
        this.sharedLimit =
                new AbuseProtectionProperties.Limit(
                        limit.globalRequestsPerMinute(), limit.globalRequestsPerMinute());
        this.addresses = addresses;
        this.limiter = limiter;
    }

    public void checkCurrentRequest() {
        if (!(RequestContextHolder.getRequestAttributes()
                instanceof ServletRequestAttributes current)) return;
        String client = addresses.individualClient(current.getRequest());
        var decision =
                limiter.acquire(
                        RateLimitPolicy.OPTIMIZER,
                        client != null ? client : addresses.resolve(current.getRequest()),
                        client != null ? limit : sharedLimit);
        if (decision.allowed()) return;
        if (current.getResponse() != null) {
            current.getResponse()
                    .setHeader("Retry-After", Integer.toString(decision.retryAfterSeconds()));
        }
        throw new ApiException(
                HttpStatus.TOO_MANY_REQUESTS,
                ApiErrorCode.RATE_LIMITED,
                "Przekroczono limit analiz. Spróbuj ponownie później.");
    }
}
