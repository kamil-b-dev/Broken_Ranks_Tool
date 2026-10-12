package pl.brokenranks.tool.broken_ranks_tool.optimization.cache;

import java.util.LinkedHashMap;
import java.util.Map;

/** Run-local LRU memoization: evicted states are recalculated without changing search budgets. */
public final class BoundedSearchCache<K, V> extends LinkedHashMap<K, V> {
    public static final int MAX_EVALUATIONS = 8_192;
    public static final int MAX_CALCULATIONS = 512;

    private final int maxEntries;

    public BoundedSearchCache(int maxEntries) {
        super(16, 0.75f, true);
        if (maxEntries <= 0) throw new IllegalArgumentException("Cache limit must be positive");
        this.maxEntries = maxEntries;
    }

    @Override
    protected boolean removeEldestEntry(Map.Entry<K, V> eldest) {
        return size() > maxEntries;
    }
}
