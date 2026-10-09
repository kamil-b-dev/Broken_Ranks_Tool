package pl.brokenranks.tool.broken_ranks_tool.core.ratelimit;

import jakarta.servlet.ReadListener;
import jakarta.servlet.ServletInputStream;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletRequestWrapper;
import java.io.BufferedReader;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.Charset;
import java.nio.charset.StandardCharsets;
import java.util.Objects;
import java.util.concurrent.atomic.AtomicBoolean;

/** Replays an already size-checked request body for downstream JSON parsing. */
final class CachedBodyHttpServletRequest extends HttpServletRequestWrapper {

    private final byte[] body;
    private final AtomicBoolean listenerRegistered = new AtomicBoolean();

    CachedBodyHttpServletRequest(HttpServletRequest request, byte[] body) {
        super(request);
        this.body = body.clone();
    }

    @Override
    public ServletInputStream getInputStream() {
        return new CachedBodyServletInputStream(body, this, listenerRegistered);
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

    private static final class CachedBodyServletInputStream extends ServletInputStream {

        private final ByteArrayInputStream input;
        private final HttpServletRequest request;
        private final AtomicBoolean listenerRegistered;
        private final AtomicBoolean completionScheduled = new AtomicBoolean();
        private ReadListener listener;
        private volatile boolean notifyingData;
        private volatile boolean failed;

        private CachedBodyServletInputStream(
                byte[] body, HttpServletRequest request, AtomicBoolean listenerRegistered) {
            input = new ByteArrayInputStream(body);
            this.request = request;
            this.listenerRegistered = listenerRegistered;
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
            if (!request.isAsyncStarted())
                throw new IllegalStateException(
                        "Non-blocking reads require an active asynchronous request");
            if (!listenerRegistered.compareAndSet(false, true))
                throw new IllegalStateException(
                        "A read listener is already registered for this request");
            listener = readListener;
            notifyingData = true;
            request.getAsyncContext()
                    .start(
                            () -> {
                                try {
                                    if (!isFinished()) listener.onDataAvailable();
                                } catch (IOException | RuntimeException exception) {
                                    failed = true;
                                    listener.onError(exception);
                                } finally {
                                    notifyingData = false;
                                    notifyCompletion();
                                }
                            });
        }

        @Override
        public int read() {
            int value = input.read();
            notifyCompletion();
            return value;
        }

        @Override
        public int read(byte[] bytes, int offset, int length) {
            int count = input.read(bytes, offset, length);
            notifyCompletion();
            return count;
        }

        private void notifyCompletion() {
            if (listener == null
                    || notifyingData
                    || failed
                    || !isFinished()
                    || !completionScheduled.compareAndSet(false, true)) return;
            request.getAsyncContext()
                    .start(
                            () -> {
                                try {
                                    listener.onAllDataRead();
                                } catch (IOException | RuntimeException exception) {
                                    failed = true;
                                    listener.onError(exception);
                                }
                            });
        }
    }
}
