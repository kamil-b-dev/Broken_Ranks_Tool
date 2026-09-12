package pl.brokenranks.tool.broken_ranks_tool.optimization.advisor;

import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicBoolean;
import org.springframework.stereotype.Component;

/** Cancellation stops search while allowing the original request to return verified plans. */
@Component
public class AdvisorRunRegistry {
    private final ConcurrentHashMap<String, AtomicBoolean> active = new ConcurrentHashMap<>();

    AtomicBoolean start(String id) {
        AtomicBoolean flag = new AtomicBoolean();
        if (id != null && active.putIfAbsent(id, flag) != null) {
            throw new IllegalArgumentException("Ta analiza już trwa.");
        }
        return flag;
    }

    void finish(String id) {
        if (id != null) active.remove(id);
    }

    public boolean cancel(String id) {
        if (id == null) return false;
        AtomicBoolean flag = active.get(id);
        if (flag == null) return false;
        flag.set(true);
        return true;
    }
}
