package pl.brokenranks.tool.broken_ranks_tool.optimization.engine.search.placement;

import static org.junit.jupiter.api.Assertions.*;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.EnumSource;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.*;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.rules.EquipmentRulesRegistry;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.*;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.validator.EquipmentPlacementRules;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model.*;

class OptimizationPlacementOperationsTests {
    private final EquipmentRulesRegistry rules = new EquipmentRulesRegistry();
    private final OptimizationPlacementOperations operations =
            new OptimizationPlacementOperations(new EquipmentPlacementRules(rules), rules);

    @ParameterizedTest
    @CsvSource({
        "III,SUBDRIF,true",
        "III,BIDRIF,false",
        "VI,BIDRIF,true",
        "VI,MAGNIDRIF,false",
        "IX,MAGNIDRIF,true",
        "IX,ARCYDRIF,false",
        "X,ARCYDRIF,true",
        "X,SUBDRIF,true"
    })
    void placementRespectsItemTierIndependentlyOfDrifLevel(
            String tier, DRIF_SIZE size, boolean valid) {
        DrifTemplate drif = drif(1, DRIF_BONUS_TYPE.CRITICAL_CHANCE, size);
        assertEquals(valid, operations.isValidForSlot(drif, slot("helmet", tier, 2, Set.of())));
    }

    @ParameterizedTest
    @EnumSource(
            value = DRIF_BONUS_TYPE.class,
            names = {"DAMAGE_FIRE", "DAMAGE_FROST", "DAMAGE_ENERGY"})
    void elementalDrifsRequireWeaponAndCannotCoexist(DRIF_BONUS_TYPE type) {
        DrifTemplate candidate = drif(1, type, DRIF_SIZE.SUBDRIF);
        assertTrue(operations.isValidForSlot(candidate, slot("weapon", "X", 3, Set.of())));
        assertFalse(operations.isValidForSlot(candidate, slot("helmet", "X", 3, Set.of())));
        DrifTemplate existing = drif(2, DRIF_BONUS_TYPE.DAMAGE_FIRE, DRIF_SIZE.SUBDRIF);
        BuildState state = state(null, new Placement(existing, 6, false));
        assertTrue(operations.containsAnotherElemental(state, candidate, null));
        assertFalse(operations.containsAnotherElemental(state, candidate, existing));
    }

    @ParameterizedTest
    @EnumSource(
            value = DRIF_BONUS_TYPE.class,
            names = {"DAMAGE_MAGIC", "DAMAGE_PHYSICAL"})
    void nonElementalDamageCanCoexistWithElementAndUseArmor(DRIF_BONUS_TYPE type) {
        DrifTemplate candidate = drif(1, type, DRIF_SIZE.SUBDRIF);
        assertTrue(operations.isValidForSlot(candidate, slot("helmet", "X", 3, Set.of())));
        BuildState state =
                state(
                        new Placement(
                                drif(2, DRIF_BONUS_TYPE.DAMAGE_FIRE, DRIF_SIZE.SUBDRIF), 6, false));
        assertFalse(operations.containsAnotherElemental(state, candidate, null));
    }

    @Test
    void duplicateDetectionUsesBonusTypeAcrossDifferentTemplatesAndSizes() {
        DRIF_BONUS_TYPE type = DRIF_BONUS_TYPE.CRITICAL_CHANCE;
        List<Placement> placements =
                Arrays.asList(
                        null,
                        new Placement(drif(1, type, DRIF_SIZE.SUBDRIF), 6, false),
                        new Placement(drif(2, type, DRIF_SIZE.BIDRIF), 11, false));
        assertTrue(operations.containsBonus(placements, type));
        assertTrue(operations.containsBonusExcept(placements, type, 1));
        assertFalse(operations.containsBonusExcept(placements.subList(0, 2), type, 1));
        assertFalse(operations.containsBonus(placements, DRIF_BONUS_TYPE.DAMAGE_FIRE));
    }

    @Test
    void insertionSkipsLockedEmptySocketAndInvalidatesStateSignature() {
        SlotContext slot = slot("weapon", "X", 3, Set.of(0));
        Placement existing =
                new Placement(drif(1, DRIF_BONUS_TYPE.DAMAGE_FIRE, DRIF_SIZE.SUBDRIF), 6, true);
        Placement added =
                new Placement(
                        drif(2, DRIF_BONUS_TYPE.CRITICAL_CHANCE, DRIF_SIZE.SUBDRIF), 6, false);
        BuildState state = state(null, existing, null);
        String before = state.signature();
        assertTrue(operations.hasFreeDrifPosition(state.slots().get("weapon"), slot));
        operations.putNextFree(state, slot, added);
        assertEquals(Arrays.asList(null, existing, added), state.slots().get("weapon"));
        assertNotEquals(before, state.signature());
        assertFalse(operations.hasFreeDrifPosition(state.slots().get("weapon"), slot));
    }

    @Test
    void insertionDoesNotUsePositionsBeyondSocketLimitOrOverwriteOccupiedSocket() {
        Placement existing =
                new Placement(
                        drif(1, DRIF_BONUS_TYPE.CRITICAL_CHANCE, DRIF_SIZE.SUBDRIF), 6, false);
        BuildState state = state(existing, null);
        SlotContext slot = slot("weapon", "I", 1, Set.of());
        assertFalse(operations.hasFreeDrifPosition(state.slots().get("weapon"), slot));
        operations.putNextFree(state, slot, existing.withLevel(1));
        assertEquals(Arrays.asList(existing, null), state.slots().get("weapon"));
    }

    private BuildState state(Placement... placements) {
        BuildState state = new BuildState();
        state.slots().put("weapon", new ArrayList<>(Arrays.asList(placements)));
        return state;
    }

    private DrifTemplate drif(long id, DRIF_BONUS_TYPE type, DRIF_SIZE size) {
        return DrifTemplate.builder().id(id).bonusType(type).size(size).build();
    }

    private SlotContext slot(String key, String tier, int sockets, Set<Integer> locks) {
        return new SlotContext(
                key,
                null,
                ItemTemplate.builder().tier(tier).rarity(RARITY.RARE).build(),
                30,
                sockets,
                0,
                List.of(),
                locks,
                false);
    }
}
