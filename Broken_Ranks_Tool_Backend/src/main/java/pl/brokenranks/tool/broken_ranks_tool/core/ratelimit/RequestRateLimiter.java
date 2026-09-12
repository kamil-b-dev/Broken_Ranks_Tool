package pl.brokenranks.tool.broken_ranks_tool.core.ratelimit;

import java.time.Clock;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

/** Maintains bounded, in-memory fixed-window counters for one application instance. */
public class RequestRateLimiter {

    private static final long WINDOW_SECONDS = 60;

    private final Clock clock;
    private final Map<String, WindowCounter> clientCounters = new HashMap<>();
    private final Map<String, WindowCounter> globalCounters = new HashMap<>();

    public RequestRateLimiter() {
        this(Clock.systemUTC());
    }

    RequestRateLimiter(Clock clock) {
        this.clock = clock;
    }

    /** Atomically consumes both the client and global allowance for a named policy. */
    public synchronized Decision acquire(
            String policy, String clientId, AbuseProtectionProperties.Limit limit) {
        long epochSecond = Instant.now(clock).getEpochSecond();
        long window = epochSecond / WINDOW_SECONDS;
        String clientKey = policy + ':' + clientId;

        WindowCounter global = current(globalCounters, policy, window);
        int retryAfterSeconds = (int) (WINDOW_SECONDS - epochSecond % WINDOW_SECONDS);

        if (global.count >= limit.globalRequestsPerMinute()) {
            return new Decision(false, retryAfterSeconds);
        }

        WindowCounter client = current(clientCounters, clientKey, window);
        if (client.count >= limit.clientRequestsPerMinute()) {
            return new Decision(false, retryAfterSeconds);
        }

        client.count++;
        global.count++;
        removeExpiredCounters(window);
        return new Decision(true, 0);
    }

    private WindowCounter current(
            Map<String, WindowCounter> counters, String key, long currentWindow) {
        WindowCounter counter = counters.get(key);
        if (counter == null || counter.window != currentWindow) {
            counter = new WindowCounter(currentWindow);
            counters.put(key, counter);
        }
        return counter;
    }

    private void removeExpiredCounters(long currentWindow) {
        if (clientCounters.size() > 256) {
            clientCounters.values().removeIf(counter -> counter.window < currentWindow);
        }
    }

    /** Result returned without exposing mutable counter state. */
    public record Decision(boolean allowed, int retryAfterSeconds) {}

    private static final class WindowCounter {
        private final long window;
        private int count;

        private WindowCounter(long window) {
            this.window = window;
        }
    }
}
