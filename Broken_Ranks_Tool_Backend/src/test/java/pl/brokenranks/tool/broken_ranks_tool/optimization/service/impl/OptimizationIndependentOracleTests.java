package pl.brokenranks.tool.broken_ranks_tool.optimization.service.impl;

import static org.junit.jupiter.api.Assertions.*;
import static pl.brokenranks.tool.broken_ranks_tool.optimization.service.impl.OptimizationCalculatorFixture.*;

import java.util.*;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.*;
import pl.brokenranks.tool.broken_ranks_tool.equipment.dto.EquipmentRequest;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.ItemTemplate;
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.OptimizationRequest;

/** Exhaustive oracle deliberately does not use production scoring, level, power or penalty helpers. */
class OptimizationIndependentOracleTests {
    private static final DRIF_BONUS_TYPE A = DRIF_BONUS_TYPE.CRITICAL_CHANCE;
    private static final DRIF_BONUS_TYPE B = DRIF_BONUS_TYPE.DAMAGE_MAGIC;

    @ParameterizedTest
    @ValueSource(
            strings = {
                "multipleSockets",
                "reversePriorities",
                "minimums",
                "lockedLevel",
                "penalty",
                "competingTargets"
            })
    void matchesIndependentOptimumAndCalculatorOnSmallSearchSpaces(String profile) {
        boolean penalty = profile.equals("penalty");
        int[] capacities = penalty ? new int[] {4, 4, 4, 4} : new int[] {7, 10};
        int sockets = penalty ? 1 : 2;
        int maxLevel = penalty ? 6 : 11;
        int weightA = profile.equals("reversePriorities") ? 10 : 30;
        int weightB = profile.equals("reversePriorities") ? 30 : 10;
        int minimum = profile.equals("minimums") ? 1 : 0;
        boolean locked = profile.equals("lockedLevel");
        double targetA = profile.equals("competingTargets") ? 18 : 0;
        double targetB = profile.equals("competingTargets") ? 30 : 0;
        String[] keys = {"helmet", "armor", "boots", "legs"};
        ITEM_CATEGORY[] categories = {
            ITEM_CATEGORY.HELMET, ITEM_CATEGORY.ARMOR, ITEM_CATEGORY.BOOTS, ITEM_CATEGORY.LEGS
        };
        List<ItemTemplate> items = new ArrayList<>();
        Map<String, EquipmentRequest.SlotData> slots = new LinkedHashMap<>();
        for (int i = 0; i < capacities.length; i++) {
            items.add(item(i + 1, categories[i], penalty ? "I" : "IV", capacities[i]));
            slots.put(keys[i], slot(i + 1));
        }
        if (locked) {
            slots.get("helmet").setDrifIds(List.of(10L));
            slots.get("helmet").setDrifLevels(Map.of("0", 1));
        }
        var size = penalty ? DRIF_SIZE.SUBDRIF : DRIF_SIZE.BIDRIF;
        var fixture =
                create(
                        items,
                        List.of(drif(10, A, size, "2%", "1%"), drif(11, B, size, "1%", "2%")),
                        List.of());
        var request = request(slots, Map.of(A, weightA, B, weightB));
        request.setTargetQuantities(
                Map.of(
                        A,
                        new OptimizationRequest.QuantityRange(minimum, 4),
                        B,
                        new OptimizationRequest.QuantityRange(minimum, 4)));
        if (locked) request.setLockedDrifs(Map.of("helmet", Set.of(0)));
        if (targetA > 0) request.setForcedPercentageTargets(Map.of(A, targetA, B, targetB));
        var response = fixture.service().optimize(request);
        assertNotNull(response.getOptimizedSetup());
        List<Levels> selected = new ArrayList<>();
        for (int i = 0; i < capacities.length; i++) {
            var output = response.getOptimizedSetup().getSlots().get(keys[i]);
            int a = 0;
            int b = 0;
            for (int index = 0; index < output.getDrifIds().size(); index++) {
                Long id = output.getDrifIds().get(index);
                if (id == null) continue;
                int level = output.getDrifLevels().get(String.valueOf(index));
                assertTrue(level >= 1 && level <= maxLevel);
                if (id == 10L) {
                    assertEquals(0, a, "Duplicate critical drif");
                    a = level;
                } else {
                    assertEquals(11L, id);
                    assertEquals(0, b, "Duplicate magic drif");
                    b = level;
                }
            }
            Levels levels = new Levels(a, b);
            assertTrue(levels.power() <= capacities[i]);
            assertTrue(levels.count() <= sockets);
            selected.add(levels);
        }
        if (locked) {
            assertEquals(1, selected.getFirst().a);
            assertEquals(
                    10L,
                    response.getOptimizedSetup().getSlots().get("helmet").getDrifIds().getFirst());
        }
        var spec =
                new Spec(
                        capacities,
                        sockets,
                        maxLevel,
                        weightA,
                        weightB,
                        minimum,
                        locked,
                        targetA,
                        targetB);
        Objective best = enumerate(spec, 0, new ArrayList<>());
        Objective actual = objective(selected, spec);
        assertNotNull(actual, "Result must satisfy both quantity minimums");
        assertEquals(best.deficit, actual.deficit, 1e-8, profile + ": target deficit");
        assertEquals(best.utility, actual.utility, 1e-8, profile + ": weighted utility");
        var stats = fixture.calculator().calculateTotalStats(response.getOptimizedSetup());
        assertEquals(actual.a, number(stats, A.name()), 0.0051);
        assertEquals(actual.b, number(stats, B.name()), 0.0051);
    }

    private Objective enumerate(Spec spec, int index, List<Levels> partial) {
        if (index == spec.capacities.length) return objective(partial, spec);
        Objective best = null;
        for (int a = 0; a <= spec.maxLevel; a++) {
            if (spec.locked && index == 0 && a != 1) continue;
            for (int b = 0; b <= spec.maxLevel; b++) {
                Levels levels = new Levels(a, b);
                if (levels.power() > spec.capacities[index] || levels.count() > spec.sockets)
                    continue;
                partial.add(levels);
                Objective next = enumerate(spec, index + 1, partial);
                partial.removeLast();
                if (next != null
                        && (best == null
                                || next.deficit < best.deficit - 1e-9
                                || Math.abs(next.deficit - best.deficit) < 1e-9
                                        && next.utility > best.utility)) best = next;
            }
        }
        return best;
    }

    private Objective objective(List<Levels> levels, Spec spec) {
        int countA = 0, countB = 0;
        double a = 0, b = 0;
        for (Levels level : levels) {
            if (level.a > 0) {
                countA++;
                a += level.a + 1;
            }
            if (level.b > 0) {
                countB++;
                b += 2 * level.b - 1;
            }
        }
        if (countA < spec.minimum || countB < spec.minimum) return null;
        a = a * (countA == 4 ? 0.95 : 1) + 2;
        b *= countB == 4 ? 0.95 : 1;
        double deficit =
                spec.targetA > 0
                        ? Math.max(0, spec.targetA - a) * spec.weightA
                                + Math.max(0, spec.targetB - b) * spec.weightB
                        : 0;
        double utility =
                spec.targetA > 0
                        ? Math.min(spec.targetA, a) * spec.weightA
                                + Math.min(spec.targetB, b) * spec.weightB
                        : a * spec.weightA + b * spec.weightB;
        return new Objective(deficit, utility, a, b);
    }

    private record Levels(int a, int b) {
        int count() {
            return (a > 0 ? 1 : 0) + (b > 0 ? 1 : 0);
        }

        int power() {
            return (a == 0 ? 0 : a <= 6 ? 4 : 8) + (b == 0 ? 0 : b <= 6 ? 3 : 6);
        }
    }

    private record Spec(
            int[] capacities,
            int sockets,
            int maxLevel,
            int weightA,
            int weightB,
            int minimum,
            boolean locked,
            double targetA,
            double targetB) {}

    private record Objective(double deficit, double utility, double a, double b) {}
}
