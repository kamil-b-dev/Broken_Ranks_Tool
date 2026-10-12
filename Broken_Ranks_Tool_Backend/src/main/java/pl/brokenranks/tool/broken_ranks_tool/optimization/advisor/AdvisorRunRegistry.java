package pl.brokenranks.tool.broken_ranks_tool.optimization.advisor;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.function.LongSupplier;
import org.springframework.stereotype.Component;

/** Cancellation stops search while allowing the original request to return verified plans. */
@Component
public class AdvisorRunRegistry {
    private static final int MAX_PENDING_CANCELLATIONS = 128;
    private static final long PENDING_CANCELLATION_TTL_NANOS = 10_000_000_000L;
    private final Map<RunKey, Long> pendingCancellations = new LinkedHashMap<>();
    private final LongSupplier clock;
    private ActiveRun active;

    public AdvisorRunRegistry() {
        this(System::nanoTime);
    }

    AdvisorRunRegistry(LongSupplier clock) {
        this.clock = clock;
    }

    synchronized AtomicBoolean start(String id, String cancellationToken) {
        expirePending();
        AtomicBoolean flag = new AtomicBoolean();
        if (active != null) {
            boolean sameOwner =
                    java.util.Objects.equals(active.id(), id)
                            && java.util.Objects.equals(
                                    active.cancellationToken(), cancellationToken);
            if (!active.cancelled().get() && !sameOwner)
                throw new IllegalArgumentException("Inna analiza Doradcy już trwa.");
            active.cancelled().set(true);
        }
        if (id != null
                && cancellationToken != null
                && pendingCancellations.remove(new RunKey(id, cancellationToken)) != null) {
            flag.set(true);
        }
        active = new ActiveRun(id, cancellationToken, flag);
        return flag;
    }

    synchronized void finish(String id, AtomicBoolean flag) {
        if (active != null
                && java.util.Objects.equals(active.id(), id)
                && active.cancelled() == flag) active = null;
    }

    public synchronized boolean cancel(String id, String cancellationToken) {
        if (id == null || cancellationToken == null) return false;
        expirePending();
        if (active != null && java.util.Objects.equals(active.id(), id)) {
            if (!java.util.Objects.equals(active.cancellationToken(), cancellationToken))
                return false;
            active.cancelled().set(true);
            return true;
        }
        RunKey key = new RunKey(id, cancellationToken);
        pendingCancellations.remove(key);
        pendingCancellations.put(key, clock.getAsLong() + PENDING_CANCELLATION_TTL_NANOS);
        if (pendingCancellations.size() > MAX_PENDING_CANCELLATIONS) {
            pendingCancellations.remove(pendingCancellations.keySet().iterator().next());
        }
        // No active flag was set; retain the intent for a matching request still in transit.
        return false;
    }

    private void expirePending() {
        long now = clock.getAsLong();
        pendingCancellations.values().removeIf(deadline -> deadline <= now);
    }

    private record RunKey(String id, String token) {}

    private record ActiveRun(String id, String cancellationToken, AtomicBoolean cancelled) {}
}
