package pl.brokenranks.tool.broken_ranks_tool.core.ratelimit;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ReadListener;
import jakarta.servlet.ServletException;
import jakarta.servlet.ServletInputStream;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletRequestWrapper;
import jakarta.servlet.http.HttpServletResponse;
import java.io.BufferedReader;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.Charset;
import java.nio.charset.StandardCharsets;
import java.util.Objects;
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

    private static final String OPTIMIZER_PATH = "/api/optimizer/drifs";
    private static final String CALCULATOR_PATH = "/api/calculator/calculate";
    private static final String ADVISOR_PATH_PREFIX = "/api/optimizer/advisor/";
    private static final String CANCELLATION_PATH_SUFFIX = "/cancel";
    private static final String API_PATH_PREFIX = "/api/";

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
        String path = request.getRequestURI();
        if ("GET".equals(request.getMethod())) return !path.startsWith(API_PATH_PREFIX);
        if (!"POST".equals(request.getMethod())) return true;
        return !OPTIMIZER_PATH.equals(path)
                && !CALCULATOR_PATH.equals(path)
                && !isCancellationPath(path);
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        boolean publicDataRequest = "GET".equals(request.getMethod());
        long contentLength = request.getContentLengthLong();
        if (!publicDataRequest && contentLength > properties.maxRequestBytes()) {
            writeError(
                    response,
                    HttpServletResponse.SC_REQUEST_ENTITY_TOO_LARGE,
                    "REQUEST_TOO_LARGE",
                    "Żądanie przekracza dozwolony rozmiar.");
            return;
        }

        String policy;
        AbuseProtectionProperties.Limit limit;
        if (publicDataRequest) {
            policy = "public-data";
            limit = properties.publicData();
        } else if (OPTIMIZER_PATH.equals(request.getRequestURI())) {
            policy = "optimizer";
            limit = properties.optimizer();
        } else if (CALCULATOR_PATH.equals(request.getRequestURI())) {
            policy = "calculator";
            limit = properties.calculator();
        } else {
            policy = "control";
            limit = properties.control();
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

        if (publicDataRequest) {
            filterChain.doFilter(request, response);
            return;
        }

        byte[] requestBody = readBodyUpToLimit(request, properties.maxRequestBytes());
        if (requestBody == null) {
            writeError(
                    response,
                    HttpServletResponse.SC_REQUEST_ENTITY_TOO_LARGE,
                    "REQUEST_TOO_LARGE",
                    "Żądanie przekracza dozwolony rozmiar.");
            return;
        }

        filterChain.doFilter(new CachedBodyRequest(request, requestBody), response);
    }

    private String clientId(HttpServletRequest request) {
        String remoteAddress = request.getRemoteAddr();
        return remoteAddress == null || remoteAddress.isBlank() ? "unknown" : remoteAddress;
    }

    private boolean isCancellationPath(String path) {
        return path.startsWith(ADVISOR_PATH_PREFIX) && path.endsWith(CANCELLATION_PATH_SUFFIX);
    }

    private byte[] readBodyUpToLimit(HttpServletRequest request, int maxRequestBytes)
            throws IOException {
        try (ByteArrayOutputStream body =
                new ByteArrayOutputStream(Math.min(maxRequestBytes, 8192))) {
            byte[] buffer = new byte[8192];
            int totalBytes = 0;
            ServletInputStream inputStream = request.getInputStream();

            while (true) {
                long remainingWithSentinel = (long) maxRequestBytes - totalBytes + 1;
                int bytesToRead = (int) Math.min(buffer.length, remainingWithSentinel);
                int bytesRead = inputStream.read(buffer, 0, bytesToRead);
                if (bytesRead == -1) return body.toByteArray();
                if (totalBytes + bytesRead > maxRequestBytes) return null;

                body.write(buffer, 0, bytesRead);
                totalBytes += bytesRead;
            }
        }
    }

    private void writeError(HttpServletResponse response, int status, String code, String message)
            throws IOException {
        response.setStatus(status);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        objectMapper.writeValue(
                response.getOutputStream(),
                new ApiError(code, message, MDC.get(RequestTracingFilter.REQUEST_ID)));
    }

    private static final class CachedBodyRequest extends HttpServletRequestWrapper {

        private final byte[] body;

        private CachedBodyRequest(HttpServletRequest request, byte[] body) {
            super(request);
            this.body = body;
        }

        @Override
        public ServletInputStream getInputStream() {
            return new CachedBodyServletInputStream(body);
        }

        @Override
        public BufferedReader getReader() {
            String encoding = getCharacterEncoding();
            Charset charset = StandardCharsets.UTF_8;
            if (encoding != null) {
                try {
                    charset = Charset.forName(encoding);
                } catch (IllegalArgumentException ignored) {
                    // Invalid client-provided encodings are handled downstream as malformed input.
                }
            }
            return new BufferedReader(new InputStreamReader(getInputStream(), charset));
        }

        @Override
        public int getContentLength() {
            return body.length;
        }

        @Override
        public long getContentLengthLong() {
            return body.length;
        }
    }

    private static final class CachedBodyServletInputStream extends ServletInputStream {

        private final ByteArrayInputStream input;

        private CachedBodyServletInputStream(byte[] body) {
            input = new ByteArrayInputStream(body);
        }

        @Override
        public boolean isFinished() {
            return input.available() == 0;
        }

        @Override
        public boolean isReady() {
            return true;
        }

        @Override
        public void setReadListener(ReadListener readListener) {
            Objects.requireNonNull(readListener, "readListener");
            try {
                if (!isFinished()) readListener.onDataAvailable();
                if (isFinished()) readListener.onAllDataRead();
            } catch (IOException exception) {
                readListener.onError(exception);
            }
        }

        @Override
        public int read() {
            return input.read();
        }

        @Override
        public int read(byte[] bytes, int offset, int length) {
            return input.read(bytes, offset, length);
        }
    }
}
