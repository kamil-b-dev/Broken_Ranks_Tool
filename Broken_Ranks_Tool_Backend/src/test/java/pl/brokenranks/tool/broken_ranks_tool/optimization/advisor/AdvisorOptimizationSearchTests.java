package pl.brokenranks.tool.broken_ranks_tool.optimization.advisor;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import java.util.*;
import org.junit.jupiter.api.Test;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.*;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.rules.*;
import pl.brokenranks.tool.broken_ranks_tool.equipment.dto.EquipmentRequest.SlotData;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.*;
import pl.brokenranks.tool.broken_ranks_tool.equipment.persistence.repository.*;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.calculator.*;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.calculator.input.*;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.calculator.processor.*;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.validator.*;
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.*;

/** Advisor target completion, compensating plans, and bounded full-build search. */
class AdvisorOptimizationSearchTests extends AdvisorOptimizationTestSupport {
    @Test
    void returnsNoChangesWhenTargetIsAlreadyMet() {
        Fixture f =
                fixture(
                        List.of(item(1, ITEM_CATEGORY.HELMET, "I", 10, 0)),
                        List.of(drif(10, A, "10%")));
        var request = request(A, Map.of("helmet", slot(1, 1, 10L)));
        request.getAdvisor().setTargetValue(10.0);
        request.getAdvisor().getAllowedChanges().setStars(true);
        var result = f.service.optimize(request);
        assertTrue(result.getAdvisorReport().targetReached());
        assertEquals(0, result.getAdvisorReport().evaluatedStates());
        assertTrue(result.getSummary().getNextVariants().isEmpty());
    }

    @Test
    void findsACompensatingTwoSwapPlan() {
        var c = DRIF_BONUS_TYPE.DAMAGE_MAGIC;
        Fixture f =
                fixture(
                        List.of(
                                item(1, ITEM_CATEGORY.HELMET, "I", 10, 0),
                                item(2, ITEM_CATEGORY.BOOTS, "I", 10, 20),
                                item(3, ITEM_CATEGORY.ARMOR, "I", 10, 0),
                                item(4, ITEM_CATEGORY.BELT, "I", 10, 10)),
                        List.of(
                                drif(10, A, "10%"),
                                drif(20, B, "2%"),
                                drif(21, B, "10%"),
                                drif(30, c, "0%")));
        var request =
                request(
                        A,
                        Map.of(
                                "helmet",
                                slot(1, 1, 10L),
                                "boots",
                                slot(2, 1, 20L),
                                "armor",
                                slot(3, 1, 21L),
                                "belt",
                                slot(4, 1, 30L)));
        request.getAdvisor().setMaxActions(2);
        request.getAdvisor().setTargetGain(2.0);
        var result = f.service.optimize(request);
        assertTrue(result.getAdvisorReport().targetReached());
        assertNotNull(result.getCalculationResult());
        assertEquals(2, result.getAdvisorReport().plans().getFirst().actions().size());
        assertNotNull(result.getSummary().getNextVariants().getFirst().calculationResult());
        assertEquals(
                result.getSummary().getNextVariants().getFirst().calculationResult().stats(),
                result.getCalculationResult().stats());
        assertTrue(
                result.getSummary().getGoalResults().stream()
                        .filter(g -> g.statKey().equals(B.name()))
                        .findFirst()
                        .orElseThrow()
                        .targetSatisfied());
    }

    @Test
    void boundsWorkOnAFullBuildAndVerifiesEveryReturnedPlan() {
        String[] keys = {
            "helmet",
            "armor",
            "cape",
            "legs",
            "boots",
            "gloves",
            "belt",
            "necklace",
            "ring1",
            "ring2",
            "weapon",
            "shield"
        };
        ITEM_CATEGORY[] categories = {
            ITEM_CATEGORY.HELMET,
            ITEM_CATEGORY.ARMOR,
            ITEM_CATEGORY.CAPE,
            ITEM_CATEGORY.LEGS,
            ITEM_CATEGORY.BOOTS,
            ITEM_CATEGORY.GLOVES,
            ITEM_CATEGORY.BELT,
            ITEM_CATEGORY.NECKLACE,
            ITEM_CATEGORY.RING,
            ITEM_CATEGORY.RING,
            ITEM_CATEGORY.WEAPON_1H,
            ITEM_CATEGORY.OFF_HAND
        };
        List<ItemTemplate> items = new ArrayList<>();
        List<DrifTemplate> drifs = new ArrayList<>();
        var types =
                List.of(
                        A,
                        B,
                        DRIF_BONUS_TYPE.DAMAGE_MAGIC,
                        DRIF_BONUS_TYPE.DAMAGE_PHYSICAL,
                        DRIF_BONUS_TYPE.DODGE_CHANCE,
                        DRIF_BONUS_TYPE.HIT_CHANCE_MELEE);
        for (int i = 0; i < types.size(); i++) {
            DrifTemplate drif = drif(100 + i, types.get(i), "2%");
            drif.setSize(DRIF_SIZE.ARCYDRIF);
            drif.setIncrement("0.5%");
            drifs.add(drif);
        }
        Map<String, SlotData> slots = new LinkedHashMap<>();
        for (int i = 0; i < keys.length; i++) {
            items.add(item(i + 1, categories[i], "X", 48, (i % 3) * 10));
            SlotData slot =
                    slot(i + 1, 6 + i % 4, 100L + i % 6, 100L + (i + 1) % 6, 100L + (i + 2) % 6);
            slot.setDrifLevels(Map.of("0", 6 + i % 4 * 5, "1", 11, "2", 16));
            slots.put(keys[i], slot);
        }
        Fixture f = fixture(items, drifs);
        var request = request(A, slots);
        request.getAdvisor().setMaxActions(3);
        request.getAdvisor().getAllowedChanges().setStars(true);
        long started = System.nanoTime();
        var result = f.service.optimize(request);
        assertTrue(result.getSummary().isSuccess());
        assertTrue(result.getAdvisorReport().evaluatedStates() <= 20000);
        verify(f.calculator, atMost(19)).calculateTotalStats(any());
        verify(f.items, times(1)).findAll();
        System.out.printf(
                Locale.ROOT,
                "Advisor full-build benchmark: %.3f s, %d states, %d verified plans%n",
                (System.nanoTime() - started) / 1_000_000_000.0,
                result.getAdvisorReport().evaluatedStates(),
                result.getSummary().getNextVariants().size());
        for (var plan : result.getSummary().getNextVariants()) {
            Map<String, String> actual = f.calculator.calculateTotalStats(plan.setup());
            assertEquals(
                    plan.variantValue(),
                    Double.parseDouble(actual.get(A.name()).replace("%", "")),
                    0.0001);
            assertTrue(plan.gain() > 0);
            assertTrue(plan.changeCount() <= 3);
        }
    }
}
