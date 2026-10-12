package pl.brokenranks.tool.broken_ranks_tool.optimization.advisor;

import static org.junit.jupiter.api.Assertions.*;

import java.util.Map;
import java.util.stream.IntStream;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.ITEM_CATEGORY;

class AdvisorCacheEvictionTests extends AdvisorOptimizationTestSupport {
    @Test
    void catalogCachesStayBoundedAndEvictedContributionsRecalculateTheSameStats() {
        var items =
                IntStream.rangeClosed(1, 2300)
                        .mapToObj(id -> item(id, ITEM_CATEGORY.HELMET, "X", 30, 0))
                        .toList();
        var drifs =
                IntStream.rangeClosed(1, 2300).mapToObj(id -> drif(10_000L + id, A, "2%")).toList();
        var initial = Map.of("helmet", slot(1, 1, 10_001L));
        var model = model(items, drifs, request(A, initial));
        var expected = model.evaluate(initial);
        assertEquals(4, expected[A.ordinal()]);
        for (int id = 1; id <= 2300; id++) {
            var slots = Map.of("helmet", slot(id, 1, 10_000L + id));
            assertTrue(model.valid(slots));
            model.evaluate(slots);
            model.itemValues(items.get(id - 1), 1);
        }
        assertEquals(2048, cache(model, "contributions").size());
        assertEquals(1024, cache(model, "equipmentValues").size());
        assertEquals(1024, cache(model, "drifValues").size());
        assertEquals(1024, cache(model, "itemValues").size());
        assertFalse(cache(model, "drifValues").containsKey("10001@1"));
        assertArrayEquals(expected, model.evaluate(initial));
        assertTrue(model.valid(initial));
    }

    private Map<?, ?> cache(AdvisorEquipmentModel model, String name) {
        return (Map<?, ?>) ReflectionTestUtils.getField(model, name);
    }
}
