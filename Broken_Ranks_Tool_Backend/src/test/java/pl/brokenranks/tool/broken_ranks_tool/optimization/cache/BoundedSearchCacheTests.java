package pl.brokenranks.tool.broken_ranks_tool.optimization.cache;

import static org.junit.jupiter.api.Assertions.*;

import java.util.LinkedHashMap;
import java.util.List;
import org.junit.jupiter.api.Test;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model.OptimizationCalculatorSession;

class BoundedSearchCacheTests {
    @Test
    void retainsRecentlyReadEntriesAndEvictsTheLeastRecentlyUsed() {
        var cache = new BoundedSearchCache<String, Integer>(2);
        cache.put("hot", 1);
        cache.put("cold", 2);
        assertEquals(1, cache.get("hot"));
        cache.put("new", 3);
        assertEquals(2, cache.size());
        assertFalse(cache.containsKey("cold"));
        assertEquals(List.of("hot", "new"), List.copyOf(cache.keySet()));

        cache.put("hot", 4);
        cache.computeIfAbsent("next", ignored -> 5);
        assertFalse(cache.containsKey("new"));
        assertEquals(4, cache.get("hot"));
        assertEquals(2, cache.size());
    }

    @Test
    void bulkInsertionAndCalculatorSessionRemainBounded() {
        var cache = new BoundedSearchCache<Integer, Integer>(2);
        var entries = new LinkedHashMap<Integer, Integer>();
        for (int index = 0; index < 10_000; index++) entries.put(index, index);
        cache.putAll(entries);
        assertEquals(List.of(9998, 9999), List.copyOf(cache.keySet()));

        var session = new OptimizationCalculatorSession();
        for (int index = 0; index < 10_000; index++) {
            session.numericCache()
                    .put(
                            Integer.toString(index),
                            pl.brokenranks.tool.broken_ranks_tool.equipment.service.calculator
                                    .NumericStats.fromFormatted(java.util.Map.of("stat", "1%")));
        }
        assertEquals(BoundedSearchCache.MAX_CALCULATIONS, session.numericCache().size());
        assertFalse(session.numericCache().containsKey("0"));
        assertTrue(session.numericCache().containsKey("9999"));
    }

    @Test
    void rejectsNonPositiveLimits() {
        assertThrows(IllegalArgumentException.class, () -> new BoundedSearchCache<>(0));
        assertThrows(IllegalArgumentException.class, () -> new BoundedSearchCache<>(-1));
    }
}
