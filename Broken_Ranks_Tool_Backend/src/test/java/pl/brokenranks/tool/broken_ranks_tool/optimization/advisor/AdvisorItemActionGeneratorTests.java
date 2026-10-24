package pl.brokenranks.tool.broken_ranks_tool.optimization.advisor;

import static org.junit.jupiter.api.Assertions.*;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.atomic.AtomicBoolean;
import org.junit.jupiter.api.Test;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.ITEM_CATEGORY;

class AdvisorItemActionGeneratorTests extends AdvisorOptimizationTestSupport {
    @Test
    void keepsNondominatedTradeoffsAndOrdersByDrifBonusThenStableIdAcrossInputOrders() {
        var original = item(1, ITEM_CATEGORY.HELMET, "X", 8, 0);
        var highBonus = item(2, ITEM_CATEGORY.HELMET, "X", 12, 20);
        var strength = item(3, ITEM_CATEGORY.HELMET, "X", 12, 10);
        var knowledge = item(4, ITEM_CATEGORY.HELMET, "X", 12, 10);
        strength.setStats(Map.of("Bonus drify", 10.0, "Siła", 10.0));
        knowledge.setStats(Map.of("Bonus drify", 10.0, "Wiedza", 10.0));
        for (var items :
                List.of(
                        List.of(original, knowledge, strength, highBonus),
                        List.of(highBonus, strength, knowledge, original))) {
            var slots = Map.of("helmet", slot(1, 1));
            var request = request(A, slots);
            request.getAdvisor().getAllowedChanges().setItems(true);
            var model = model(items, List.of(), request);
            var search =
                    new AdvisorSearch(
                            model,
                            request.getAdvisor(),
                            model.evaluate(slots),
                            Long.MAX_VALUE,
                            new AtomicBoolean());
            var generator = new AdvisorItemActionGenerator(search, new AdvisorNodeFactory(search));
            var source =
                    new AdvisorSearch.Node(slots, model.evaluate(slots), List.of(), Set.of(), 0, 0);
            var generated = new ArrayList<AdvisorSearch.Node>();
            generator.generateChanges(source, "helmet", slots.get("helmet"), generated::add);
            assertEquals(
                    List.of(2L, 3L, 4L),
                    generated.stream()
                            .map(node -> node.slots().get("helmet").getItemId())
                            .toList());
            assertTrue(generated.stream().allMatch(node -> model.valid(node.slots())));
            assertEquals(1L, slots.get("helmet").getItemId());
        }
    }
}
