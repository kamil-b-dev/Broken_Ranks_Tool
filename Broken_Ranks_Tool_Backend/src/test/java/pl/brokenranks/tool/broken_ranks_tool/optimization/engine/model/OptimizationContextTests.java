package pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model;

import static org.junit.jupiter.api.Assertions.*;
import static pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model.OptimizationEngineFixture.*;

import java.util.*;
import org.junit.jupiter.api.Test;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_BONUS_TYPE;

class OptimizationContextTests {
    @Test
    void slotDetachesCollectionsWithoutClaimingDeeplyImmutableTemplates() {
        var template = drif(1, DRIF_BONUS_TYPE.CRITICAL_CHANCE);
        var original = slot("helmet", 10, 2, 0, false, Set.of(), template);
        var candidates = new ArrayList<>(List.of(template));
        var locks = new LinkedHashSet<>(List.of(0));
        var snapshot =
                new SlotContext(
                        original.key(),
                        original.original(),
                        original.item(),
                        original.capacity(),
                        original.maxDrifs(),
                        original.drifBonus(),
                        candidates,
                        locks,
                        false);
        candidates.clear();
        locks.clear();

        assertEquals(List.of(template), snapshot.candidates());
        assertEquals(Set.of(0), snapshot.lockedIndices());
        assertSame(original.original(), snapshot.original());
        assertSame(original.item(), snapshot.item());
        assertSame(template, snapshot.candidates().getFirst());
        assertThrows(UnsupportedOperationException.class, () -> snapshot.candidates().clear());
        assertThrows(UnsupportedOperationException.class, () -> snapshot.lockedIndices().add(1));
    }

    @Test
    void contextSnapshotsInputsButKeepsRunLocalCachesAndBudgetsMutable() {
        var request = request(DRIF_BONUS_TYPE.CRITICAL_CHANCE);
        var slot =
                slot("helmet", 10, 2, 0, false, Set.of(), drif(1, DRIF_BONUS_TYPE.CRITICAL_CHANCE));
        var source = context(request, slot);
        var items = new LinkedHashMap<>(source.items());
        var drifs = new LinkedHashMap<>(source.drifs());
        var slots = new ArrayList<>(source.slots());
        var group = new ArrayList<>(List.of(slot));
        Map<Double, List<SlotContext>> groups = new LinkedHashMap<>();
        groups.put(0.0, group);
        var priority = new AbstractMap.SimpleEntry<>(DRIF_BONUS_TYPE.CRITICAL_CHANCE, 10);
        var priorities = new ArrayList<Map.Entry<DRIF_BONUS_TYPE, Integer>>(List.of(priority));
        var snapshot =
                new OptimizationContext(
                        request,
                        items,
                        drifs,
                        slots,
                        groups,
                        priorities,
                        source.sortedQuantities(),
                        source.beamSearchBudget(),
                        source.maximizationSearchBudget(),
                        source.refinementSearchBudget(),
                        source.calculatorBaseline(),
                        source.maximizationScaleCache(),
                        source.calculatorCache(),
                        source.evaluationCache(),
                        source.drifValueCache(),
                        source.calculatorSession());
        items.clear();
        drifs.clear();
        slots.clear();
        groups.clear();
        group.clear();
        priorities.clear();
        priority.setValue(99);

        assertEquals(source.items(), snapshot.items());
        assertEquals(source.drifs(), snapshot.drifs());
        assertEquals(List.of(slot), snapshot.slots());
        assertEquals(List.of(slot), snapshot.slotsByDrifBonus().get(0.0));
        assertEquals(10, snapshot.sortedPriorities().getFirst().getValue());
        assertThrows(UnsupportedOperationException.class, () -> snapshot.items().clear());
        assertThrows(UnsupportedOperationException.class, () -> snapshot.drifs().clear());
        assertThrows(UnsupportedOperationException.class, () -> snapshot.slots().clear());
        assertThrows(
                UnsupportedOperationException.class,
                () -> snapshot.slotsByDrifBonus().get(0.0).clear());
        assertThrows(
                UnsupportedOperationException.class,
                () -> snapshot.sortedPriorities().getFirst().setValue(99));

        snapshot.calculatorCache().put("build", Map.of("stat", "1%"));
        assertEquals(Map.of("stat", "1%"), source.calculatorCache().get("build"));
        assertSame(source.evaluationCache(), snapshot.evaluationCache());
        assertSame(source.drifValueCache(), snapshot.drifValueCache());
        assertSame(source.beamSearchBudget(), snapshot.beamSearchBudget());
        assertSame(source.calculatorSession(), snapshot.calculatorSession());
    }
}
