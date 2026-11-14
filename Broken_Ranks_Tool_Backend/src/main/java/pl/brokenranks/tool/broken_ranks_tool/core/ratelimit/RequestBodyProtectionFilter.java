package pl.brokenranks.tool.broken_ranks_tool.core.ratelimit;

import jakarta.servlet.AsyncContext;
import jakarta.servlet.AsyncEvent;
import jakarta.servlet.AsyncListener;
import jakarta.servlet.DispatcherType;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ReadListener;
import jakarta.servlet.ServletException;
import jakarta.servlet.ServletInputStream;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.atomic.AtomicBoolean;
import org.springframework.http.MediaType;
import org.springframework.web.filter.OncePerRequestFilter;
import pl.brokenranks.tool.broken_ranks_tool.core.web.error.ApiError;
import pl.brokenranks.tool.broken_ranks_tool.core.web.error.ApiErrorCode;
import pl.brokenranks.tool.broken_ranks_tool.core.web.filter.RequestTracingFilter;
import tools.jackson.databind.ObjectMapper;

/** Receives bounded bodies with non-blocking I/O, then dispatches their cached bytes to MVC. */
public final class RequestBodyProtectionFilter extends OncePerRequestFilter {
    private static final String BODY = RequestBodyProtectionFilter.class.getName() + ".body";
    private final RequestBodyProtectionProperties properties;
    private final int maxBytes;
    private final ObjectMapper mapper;
    private final ClientAddressResolver addresses;
    private final Map<String, Integer> pendingByClient = new HashMap<>();
    private int pending;

    public RequestBodyProtectionFilter(
            RequestBodyProtectionProperties properties,
            int maxBytes,
            ObjectMapper mapper,
            ClientAddressResolver addresses) {
        this.properties = properties;
        this.maxBytes = maxBytes;
        this.mapper = mapper;
        this.addresses = addresses;
    }

    @Override
    protected boolean shouldNotFilterAsyncDispatch() {
        return false;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        if (request.getDispatcherType() == DispatcherType.ASYNC) {
            Object body = request.getAttribute(BODY);
            if (body instanceof byte[] bytes) {
                request.removeAttribute(BODY);
                chain.doFilter(new CachedBodyHttpServletRequest(request, bytes), response);
            } else {
                chain.doFilter(request, response);
            }
            return;
        }
        if (request.getContentLengthLong() > maxBytes) {
            reject(
                    response,
                    413,
                    ApiErrorCode.REQUEST_TOO_LARGE,
                    "Żądanie przekracza dozwolony rozmiar.");
            return;
        }
        ServletInputStream input = request.getInputStream();
        if (input.isFinished()) {
            chain.doFilter(request, response);
            return;
        }
        String client = addresses.individualClient(request);
        if (!acquire(client)) {
            response.setHeader("Retry-After", "1");
            reject(
                    response,
                    429,
                    ApiErrorCode.RATE_LIMITED,
                    "Serwer przyjmuje zbyt wiele żądań. Spróbuj ponownie za chwilę.");
            return;
        }
        AsyncContext async;
        try {
            async = request.startAsync();
        } catch (RuntimeException exception) {
            release(client);
            throw exception;
        }
        var reader = new BodyReader(request, response, input, async, client);
        try {
            async.setTimeout(properties.timeout().toMillis());
            async.addListener(reader);
            input.setReadListener(reader);
        } catch (RuntimeException exception) {
            reader.release();
            async.complete();
            throw exception;
        }
    }

    private synchronized boolean acquire(String client) {
        if (pending >= properties.maxPendingRequests()
                || client != null
                        && pendingByClient.getOrDefault(client, 0)
                                >= properties.maxPendingPerClient()) return false;
        pending++;
        if (client != null) pendingByClient.merge(client, 1, Integer::sum);
        return true;
    }

    private synchronized void release(String client) {
        pending--;
        if (client != null)
            pendingByClient.computeIfPresent(client, (key, count) -> count == 1 ? null : count - 1);
    }

    private void reject(HttpServletResponse response, int status, ApiErrorCode code, String message)
            throws IOException {
        response.setStatus(status);
        response.setHeader("Connection", "close");
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        mapper.writeValue(
                response.getOutputStream(),
                new ApiError(
                        code, message, response.getHeader(RequestTracingFilter.REQUEST_ID_HEADER)));
    }

    private final class BodyReader implements ReadListener, AsyncListener {
        private final HttpServletRequest request;
        private final HttpServletResponse response;
        private final ServletInputStream input;
        private final AsyncContext async;
        private final ByteArrayOutputStream body =
                new ByteArrayOutputStream(Math.min(maxBytes, 8192));
        private final byte[] buffer = new byte[8192];
        private final AtomicBoolean finished = new AtomicBoolean();
        private final String client;

        private BodyReader(
                HttpServletRequest request,
                HttpServletResponse response,
                ServletInputStream input,
                AsyncContext async,
                String client) {
            this.request = request;
            this.response = response;
            this.input = input;
            this.async = async;
            this.client = client;
        }

        @Override
        public void onDataAvailable() throws IOException {
            while (!finished.get() && input.isReady() && !input.isFinished()) {
                int count =
                        input.read(
                                buffer,
                                0,
                                (int) Math.min(buffer.length, (long) maxBytes - body.size() + 1));
                if (count <= 0) break;
                if (body.size() + count > maxBytes) {
                    fail(
                            413,
                            ApiErrorCode.REQUEST_TOO_LARGE,
                            "Żądanie przekracza dozwolony rozmiar.");
                    return;
                }
                body.write(buffer, 0, count);
            }
        }

        @Override
        public synchronized void onAllDataRead() {
            if (release()) {
                request.setAttribute(BODY, body.toByteArray());
                async.dispatch();
            }
        }

        @Override
        public void onError(Throwable error) {
            try {
                fail(400, ApiErrorCode.INVALID_REQUEST, "Nie można odebrać treści żądania.");
            } catch (IOException ignored) {
                // A disconnected client cannot receive the error response.
            }
        }

        @Override
        public void onTimeout(AsyncEvent event) throws IOException {
            fail(
                    408,
                    ApiErrorCode.REQUEST_TIMEOUT,
                    "Przekroczono czas przesyłania żądania. Spróbuj ponownie.");
        }

        @Override
        public void onError(AsyncEvent event) {
            onError(event.getThrowable());
        }

        @Override
        public void onComplete(AsyncEvent event) {
            release();
        }

        @Override
        public void onStartAsync(AsyncEvent event) {}

        private synchronized void fail(int status, ApiErrorCode code, String message)
                throws IOException {
            if (!release()) return;
            try {
                reject(response, status, code, message);
            } finally {
                async.complete();
            }
        }

        private boolean release() {
            if (!finished.compareAndSet(false, true)) return false;
            RequestBodyProtectionFilter.this.release(client);
            return true;
        }
    }
}
