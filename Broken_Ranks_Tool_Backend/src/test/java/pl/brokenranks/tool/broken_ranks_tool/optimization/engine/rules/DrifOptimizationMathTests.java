package pl.brokenranks.tool.broken_ranks_tool.optimization.engine.rules;

import static org.junit.jupiter.api.Assertions.*;
import static pl.brokenranks.tool.broken_ranks_tool.optimization.engine.rules.DrifOptimizationMath.*;

import java.util.Arrays;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.EnumSource;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_BONUS_TYPE;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_SIZE;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.DrifTemplate;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model.*;

class DrifOptimizationMathTests {
    @ParameterizedTest
    @CsvSource({"1,1", "6,1", "7,2", "11,2", "12,3", "16,3", "17,4", "21,4"})
    void powerChangesOnlyAtLevelBandBoundaries(int level, int multiplier) {
        DrifTemplate drif = drif(DRIF_SIZE.ARCYDRIF);
        assertEquals(drif.getBonusType().getBasePower() * multiplier, power(drif, level));
    }

    @ParameterizedTest
    @EnumSource(DRIF_SIZE.class)
    void fittingLevelRespectsBothSizeAndRemainingCapacity(DRIF_SIZE size) {
        DrifTemplate drif = drif(size);
        int basePower = drif.getBonusType().getBasePower();
        int[] levels = {6, 11, 16, 21};
        for (int multiplier = 1; multiplier <= 4; multiplier++) {
            for (int extra = 0; extra < basePower; extra++) {
                BuildState state = new BuildState();
                state.slots().put("helmet", List.of(new Placement(drif, 1, false)));
                SlotContext slot = slot(basePower + multiplier * basePower + extra);
                assertEquals(
                        Math.min(levels[multiplier - 1], size.getMaxLevel()),
                        highestFittingLevel(state, slot, drif));
                assertEquals(6, lowestTierFittingLevel(state, slot, drif));
            }
        }
    }

    @Test
    void freeSocketDoesNotAllowPlacementWithoutEnoughPower() {
        DrifTemplate drif = drif(DRIF_SIZE.ARCYDRIF);
        BuildState state = new BuildState();
        state.slots().put("helmet", Arrays.asList(new Placement(drif, 6, false), null));
        SlotContext slot = slot(2 * drif.getBonusType().getBasePower() - 1);
        assertNull(highestFittingLevel(state, slot, drif));
        assertNull(lowestTierFittingLevel(state, slot, drif));
    }

    @Test
    void capacityAccountingIgnoresEmptySocketsAndExcludesOnlyReplacedPosition() {
        DrifTemplate drif = drif(DRIF_SIZE.ARCYDRIF);
        List<Placement> placements =
                Arrays.asList(null, new Placement(drif, 6, true), new Placement(drif, 7, false));
        int basePower = drif.getBonusType().getBasePower();
        assertEquals(2, countPlaced(placements));
        assertEquals(3 * basePower, usedPower(placements));
        assertEquals(2 * basePower, usedPowerExcept(placements, 1));
        assertEquals(3 * basePower, usedPowerExcept(placements, 0));
        assertTrue(fitsCapacity(placements, slot(3 * basePower)));
        assertFalse(fitsCapacity(placements, slot(3 * basePower - 1)));
        assertTrue(fitsCapacity(List.of(), slot(0)));
    }

    @ParameterizedTest
    @CsvSource({"1,2", "18,10.5", "19,11.5", "20,12.5", "21,13.5"})
    void doublesValueIncrementsOnlyForLastThreeLevels(int level, double expected) {
        assertEquals(expected, calculateDrifValue(drif(DRIF_SIZE.ARCYDRIF), level), 1e-9);
    }

    @Test
    void parsesNegativePercentagesWithDecimalComma() {
        DrifTemplate drif = drif(DRIF_SIZE.ARCYDRIF);
        drif.setBaseValue(" -2,5% ");
        drif.setIncrement(" -0,5% ");
        assertEquals(-14, calculateDrifValue(drif, 21), 1e-9);
    }

    @ParameterizedTest
    @CsvSource(
            value = {"NULL|1%", "2%|NULL", "invalid|1%", "2%|invalid"},
            delimiter = '|',
            nullValues = "NULL")
    void missingOrMalformedValuesDoNotBreakSearch(String base, String increment) {
        DrifTemplate drif = drif(DRIF_SIZE.SUBDRIF);
        drif.setBaseValue(base);
        drif.setIncrement(increment);
        assertEquals(0, calculateDrifValue(drif, 6));
    }

    private DrifTemplate drif(DRIF_SIZE size) {
        return DrifTemplate.builder()
                .id(1L)
                .bonusType(DRIF_BONUS_TYPE.CRITICAL_CHANCE)
                .size(size)
                .baseValue("2%")
                .increment("0.5%")
                .build();
    }

    private SlotContext slot(int capacity) {
        return new SlotContext("helmet", null, null, capacity, 2, 0, List.of(), Set.of(), false);
    }
}
