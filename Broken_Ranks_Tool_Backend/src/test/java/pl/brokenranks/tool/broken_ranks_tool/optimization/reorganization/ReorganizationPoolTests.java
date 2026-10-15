package pl.brokenranks.tool.broken_ranks_tool.optimization.reorganization;

import static org.junit.jupiter.api.Assertions.*;
import static pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model.OptimizationEngineFixture.*;

import java.util.*;
import org.junit.jupiter.api.Test;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_BONUS_TYPE;
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.OptimizationRequest;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model.*;
import pl.brokenranks.tool.broken_ranks_tool.optimization.reorganization.ReorganizationPool.Stone;

class ReorganizationPoolTests {
    private final pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.DrifTemplate
            crit = drif(10, DRIF_BONUS_TYPE.CRITICAL_CHANCE);

    private OptimizationRequest.BackpackDrif owned(String id, int level) {
        var entry = new OptimizationRequest.BackpackDrif();
        entry.setId(id);
        entry.setTemplateId(crit.getId());
        entry.setLevel(level);
        return entry;
    }

    private SlotContext equipped(String key, int level, Set<Integer> locks) {
        var slot = slot(key, 12, 2, 0, false, locks, crit);
        slot.original().setDrifIds(List.of(crit.getId()));
        slot.original().setDrifLevels(Map.of("0", level));
        return slot;
    }

    @Test
    void groupsOnlyIdenticalTemplatesAndLevelsAndPreservesEveryOccurrence() {
        var request = request(DRIF_BONUS_TYPE.CRITICAL_CHANCE);
        request.setBackpackDrifs(List.of(owned("six-b", 6), owned("two", 2), owned("six-a", 6)));
        var pool = new ReorganizationPool(context(request, equipped("helmet", 6, Set.of())));
        assertEquals(Map.of(new Stone(10, 6), 3, new Stone(10, 2), 1), pool.supply);
        assertEquals(4, pool.sources.size());
        assertEquals(
                List.of("six-a", "six-b", "two"),
                pool.sources.stream()
                        .map(ReorganizationPool.Source::entryId)
                        .filter(Objects::nonNull)
                        .toList());
    }

    @Test
    void excludesSlotLocksSocketLocksAndBuiltInsWithoutChangingTheirLevels() {
        var request = request(DRIF_BONUS_TYPE.CRITICAL_CHANCE);
        request.setLockedSlots(Set.of("armor"));
        var special = slot("weapon", 0, 0, 0, true, Set.of(), crit);
        special.original().setDrifLevels(Map.of("0", 4));
        var pool =
                new ReorganizationPool(
                        context(
                                request,
                                equipped("helmet", 2, Set.of(0)),
                                equipped("armor", 3, Set.of()),
                                special,
                                equipped("boots", 6, Set.of())));
        assertEquals(Map.of(new Stone(10, 6), 1), pool.supply);
        assertEquals(2, pool.fixed.slots().get("helmet").getFirst().level());
        assertEquals(3, pool.fixed.slots().get("armor").getFirst().level());
        assertEquals(4, pool.fixed.slots().get("weapon").getFirst().level());
        assertTrue(
                pool.positions.stream()
                        .noneMatch(p -> Set.of("armor", "weapon").contains(p.slot().key())));
        assertTrue(
                pool.positions.stream()
                        .noneMatch(p -> p.slot().key().equals("helmet") && p.index() == 0));
    }

    @Test
    void availabilityDoesNotConsumeFixedStonesAndReturnsDetachedCounts() {
        var request = request(DRIF_BONUS_TYPE.CRITICAL_CHANCE);
        request.setBackpackDrifs(List.of(owned("spare", 6)));
        var pool =
                new ReorganizationPool(
                        context(
                                request,
                                equipped("helmet", 6, Set.of(0)),
                                equipped("armor", 6, Set.of())));
        assertEquals(2, pool.available(pool.fixed).get(new Stone(10, 6)));
        assertEquals(1, pool.available(pool.original).get(new Stone(10, 6)));
        var remaining = pool.available(pool.original);
        remaining.clear();
        assertEquals(2, pool.supply.get(new Stone(10, 6)));
    }

    @Test
    void reservesUnchangedSourcesBeforeAssigningIdenticalCopiesToEarlierDestinations() {
        var request = request(DRIF_BONUS_TYPE.CRITICAL_CHANCE);
        request.setBackpackDrifs(List.of(owned("spare", 6)));
        var emptyHelmet = slot("helmet", 12, 2, 0, false, Set.of(), crit);
        var pool =
                new ReorganizationPool(
                        context(request, emptyHelmet, equipped("armor", 6, Set.of())));
        var result = pool.original.copy();
        result.setPlacement("helmet", 0, new Placement(crit, 6, false));
        var usages = pool.usages(result);
        var armor =
                usages.stream().filter(u -> u.slotKey().equals("armor")).findFirst().orElseThrow();
        var helmet =
                usages.stream().filter(u -> u.slotKey().equals("helmet")).findFirst().orElseThrow();
        assertEquals("armor", armor.sourceSlotKey());
        assertNull(armor.entryId());
        assertEquals("spare", helmet.entryId());
        assertNull(helmet.sourceSlotKey());
    }

    @Test
    void prefersMovingEquippedCopiesToConsumingIdenticalBackpackOccurrences() {
        var request = request(DRIF_BONUS_TYPE.CRITICAL_CHANCE);
        request.setBackpackDrifs(List.of(owned("spare", 6)));
        var pool =
                new ReorganizationPool(
                        context(
                                request,
                                equipped("armor", 6, Set.of()),
                                slot("helmet", 12, 2, 0, false, Set.of(), crit)));
        var result = pool.fixed.copy();
        result.setPlacement("helmet", 1, new Placement(crit, 6, false));
        var usage = pool.usages(result).getFirst();
        assertEquals("armor", usage.sourceSlotKey());
        assertEquals(0, usage.sourceDrifIndex());
        assertEquals(1, usage.drifIndex());
        assertNull(usage.entryId());
        assertEquals(pool.usages(result), pool.usages(result));
    }

    @Test
    void rejectsFabricatedLevelsAndDuplicateUsesBeyondTheOwnedMultiplicity() {
        var pool =
                new ReorganizationPool(
                        context(
                                request(DRIF_BONUS_TYPE.CRITICAL_CHANCE),
                                equipped("helmet", 6, Set.of())));
        var upgraded = pool.original.copy();
        upgraded.setPlacement("helmet", 0, new Placement(crit, 5, false));
        assertThrows(IllegalStateException.class, () -> pool.usages(upgraded));
        var duplicated = pool.original.copy();
        duplicated.setPlacement("helmet", 1, new Placement(crit, 6, false));
        assertThrows(IllegalStateException.class, () -> pool.usages(duplicated));
    }

    @Test
    void supportsEmptyInventoryAndSparseEquippedSocketsWithDefaultLevels() {
        var slot = slot("helmet", 12, 3, 0, false, Set.of(), crit);
        slot.original().setDrifIds(Arrays.asList(null, crit.getId()));
        var pool = new ReorganizationPool(context(request(DRIF_BONUS_TYPE.CRITICAL_CHANCE), slot));
        assertEquals(1, pool.sources.getFirst().stone().level());
        assertEquals(1, pool.sources.getFirst().index());
        assertEquals(3, pool.positions.size());
        assertNull(pool.original.slots().get("helmet").get(0));
        assertTrue(pool.usages(pool.fixed).isEmpty());
    }
}
