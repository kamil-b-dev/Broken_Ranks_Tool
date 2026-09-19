package pl.brokenranks.tool.broken_ranks_tool.optimization.advisor;

import java.util.concurrent.atomic.AtomicBoolean;
import org.springframework.stereotype.Component;

/** Cancellation stops search while allowing the original request to return verified plans. */
@Component
public class AdvisorRunRegistry {
    private ActiveRun active;

    synchronized AtomicBoolean start(String id) {
        AtomicBoolean flag = new AtomicBoolean();
        if (active != null) {
            if (!active.cancelled().get() && !java.util.Objects.equals(active.id(), id))
                throw new IllegalArgumentException("Inna analiza Doradcy już trwa.");
            active.cancelled().set(true);
        }
        active = new ActiveRun(id, flag);
        return flag;
    }

    synchronized void finish(String id, AtomicBoolean flag) {
        if (active != null
                && java.util.Objects.equals(active.id(), id)
                && active.cancelled() == flag) active = null;
    }

    public synchronized boolean cancel(String id) {
        if (id == null || active == null || !java.util.Objects.equals(active.id(), id)) return false;
        active.cancelled().set(true);
        return true;
    }

    private record ActiveRun(String id, AtomicBoolean cancelled) {}
}
