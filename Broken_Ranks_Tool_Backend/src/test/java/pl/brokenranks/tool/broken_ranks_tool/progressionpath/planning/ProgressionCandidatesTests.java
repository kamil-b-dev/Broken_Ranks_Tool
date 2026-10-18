package pl.brokenranks.tool.broken_ranks_tool.progressionpath.planning;

import static org.junit.jupiter.api.Assertions.*;

import java.util.*;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.Test;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.*;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.rules.EquipmentRulesRegistry;
import pl.brokenranks.tool.broken_ranks_tool.equipment.dto.EquipmentRequest;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.*;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.calculator.NumericStats;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.calculator.input.EquipmentDataProvider.CalculationContext;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.validator.*;
import pl.brokenranks.tool.broken_ranks_tool.progressionpath.model.*;
import pl.brokenranks.tool.broken_ranks_tool.progressionpath.service.ProgressionDrifReplayService;

class ProgressionCandidatesTests {
    @Test
    void defaultOrbLevelsAndStarsDoNotInventEquipmentChanges() {
        var legacy = new EquipmentRequest.SlotData();
        legacy.setItemId(1L);
        legacy.setOrbIds(List.of(2L));
        var explicit = new EquipmentRequest.SlotData();
        explicit.setItemId(1L);
        explicit.setItemStars(1);
        explicit.setOrbIds(List.of(2L));
        explicit.setOrbLevels(List.of(1));
        assertTrue(ProgressionTransition.sameFrame(legacy, explicit));
        explicit.setOrbLevels(List.of(2));
        assertFalse(ProgressionTransition.sameFrame(legacy, explicit));
    }

    @Test
    void filtersRepeatedBonusesElementsAndCapacityBeforeTheAuthoritativeCalculator() {
        var item =
                ItemTemplate.builder()
                        .id(1L)
                        .name("Helmet")
                        .category(ITEM_CATEGORY.HELMET)
                        .tier("X")
                        .rarity(RARITY.RARE)
                        .capacity(3)
                        .build();
        var drifs =
                Map.of(
                        1L,
                        drif(1, DRIF_BONUS_TYPE.DAMAGE_PHYSICAL),
                        2L,
                        drif(2, DRIF_BONUS_TYPE.CC_PROTECTION),
                        3L,
                        drif(3, DRIF_BONUS_TYPE.DAMAGE_FIRE));
        var context = new CalculationContext(Map.of(1L, item), Map.of(), drifs);
        var placement = new EquipmentPlacementRules(new EquipmentRulesRegistry());
        var transitions =
                new ProgressionTransition(context, new ProgressionDrifReplayService(placement));
        var calls = new AtomicInteger();
        var candidates =
                new ProgressionCandidates(
                        context,
                        placement,
                        new UpgradeLevelPolicy(),
                        transitions,
                        request -> {
                            calls.incrementAndGet();
                            return new NumericStats(Map.of(), Set.of());
                        });
        var equipment = equipment(1L, List.of(), Map.of());
        var result =
                candidates.fill(
                        new ProgressionStage("middle", 140, equipment),
                        List.of(
                                new ProgressionDrif("first", 1L, 6, null),
                                        new ProgressionDrif("second", 2L, 6, null),
                                new ProgressionDrif("duplicate", 1L, 6, null),
                                        new ProgressionDrif("element", 3L, 6, null)),
                        false,
                        false,
                        () -> {});
        assertEquals(List.of(1L), result.getSlots().get("helmet").getDrifIds());
        assertEquals(1, calls.get());
    }

    @Test
    void retainedBuiltInStonesCannotBeDowngradedOrBecomeTransferableInventory() {
        var item = ItemTemplate.builder().id(1L).name("Allenor").rarity(RARITY.EPIC).build();
        var context = new CalculationContext(Map.of(1L, item), Map.of(), Map.of());
        var placement = new EquipmentPlacementRules(new EquipmentRulesRegistry());
        var transitions =
                new ProgressionTransition(context, new ProgressionDrifReplayService(placement));
        var before = equipment(1L, List.of(1L, 2L), Map.of("0", 16, "1", 16));
        var after = equipment(1L, List.of(1L, 2L), Map.of("0", 6, "1", 16));
        assertTrue(transitions.equipped(before).isEmpty());
        assertThrows(
                IllegalArgumentException.class,
                () -> transitions.toStage(List.of(), before, after, 1, true));
    }

    private DrifTemplate drif(long id, DRIF_BONUS_TYPE type) {
        return DrifTemplate.builder()
                .id(id)
                .size(DRIF_SIZE.SUBDRIF)
                .bonusType(type)
                .baseValue("1%")
                .increment("1%")
                .build();
    }

    private EquipmentRequest equipment(long item, List<Long> ids, Map<String, Integer> levels) {
        var slot = new EquipmentRequest.SlotData();
        slot.setItemId(item);
        slot.setDrifIds(ids);
        slot.setDrifLevels(levels);
        var equipment = new EquipmentRequest();
        equipment.setSlots(Map.of("helmet", slot));
        return equipment;
    }
}
