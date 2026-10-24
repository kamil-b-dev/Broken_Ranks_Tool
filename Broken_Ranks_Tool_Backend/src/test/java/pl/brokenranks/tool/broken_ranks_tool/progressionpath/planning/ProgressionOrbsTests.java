package pl.brokenranks.tool.broken_ranks_tool.progressionpath.planning;

import static org.junit.jupiter.api.Assertions.*;

import java.util.*;
import org.junit.jupiter.api.Test;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.*;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.rules.EquipmentRulesRegistry;
import pl.brokenranks.tool.broken_ranks_tool.equipment.dto.EquipmentRequest;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.ItemTemplate;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.OrbTemplate;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.calculator.input.EquipmentDataProvider.CalculationContext;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.validator.EquipmentPlacementRules;
import pl.brokenranks.tool.broken_ranks_tool.progressionpath.model.ProgressionDrif.Position;

class ProgressionOrbsTests {
    private final Map<Long, OrbTemplate> templates =
            Map.of(
                    1L, orb(1, ORB_SIZE.ARCYORB, ORB_BONUS_TYPE.STRONGER_CRIT_CHANCE),
                    2L, orb(2, ORB_SIZE.BIORB, ORB_BONUS_TYPE.STRONGER_CRIT_CHANCE),
                    3L, orb(3, ORB_SIZE.ARCYORB, ORB_BONUS_TYPE.HIT_CHANCE_AFTER_MISS));
    private final ProgressionOrbs orbs =
            new ProgressionOrbs(
                    new CalculationContext(
                            Map.of(
                                    10L,
                                            ItemTemplate.builder()
                                                    .id(10L)
                                                    .category(ITEM_CATEGORY.CAPE)
                                                    .tier("X")
                                                    .rarity(RARITY.RARE)
                                                    .build(),
                                    11L,
                                            ItemTemplate.builder()
                                                    .id(11L)
                                                    .category(ITEM_CATEGORY.WEAPON_2H)
                                                    .tier("X")
                                                    .rarity(RARITY.EPIC)
                                                    .build(),
                                    12L,
                                            ItemTemplate.builder()
                                                    .id(12L)
                                                    .category(ITEM_CATEGORY.WEAPON_2H)
                                                    .tier("X")
                                                    .rarity(RARITY.LEGENDARY)
                                                    .build()),
                            templates,
                            Map.of()),
                    new EquipmentPlacementRules(new EquipmentRulesRegistry()));

    private OrbTemplate orb(long id, ORB_SIZE size, ORB_BONUS_TYPE type) {
        return OrbTemplate.builder()
                .id(id)
                .size(size)
                .bonusType(type)
                .category(ORB_CATEGORY.OFFENSIVE)
                .build();
    }

    private EquipmentRequest equipment(long cape, long weapon, int level) {
        var result = new EquipmentRequest();
        var slots = new LinkedHashMap<String, EquipmentRequest.SlotData>();
        for (var entry : Map.of("cape", cape, "weapon", weapon).entrySet()) {
            var slot = new EquipmentRequest.SlotData();
            slot.setItemId(entry.getKey().equals("cape") ? 10L : 11L);
            slot.setOrbIds(entry.getValue() == 0 ? List.of() : List.of(entry.getValue()));
            slot.setOrbLevels(entry.getValue() == 0 ? List.of() : List.of(level));
            slots.put(entry.getKey(), slot);
        }
        result.setSlots(slots);
        return result;
    }

    @Test
    void removesBothSourcesBeforeSwappingAndUpgradingWithoutDuplicatingOwnership() {
        var before = equipment(2, 3, 1);
        var after = equipment(3, 1, 3);
        var inventory = orbs.equipped(before);
        var snapshot = List.copyOf(inventory);
        var result = orbs.toStage(inventory, before, after);
        assertEquals(snapshot, inventory);
        assertEquals(2, result.inventory().size());
        assertEquals(
                2,
                result.inventory().stream()
                        .map(ProgressionOrbs.Stone::instanceId)
                        .distinct()
                        .count());
        assertTrue(
                result.actions().subList(0, 2).stream()
                        .allMatch(a -> a.type().equals("MOVE") && a.to() == null));
        assertEquals(2, result.actions().stream().filter(a -> a.type().equals("UPGRADE")).count());
        assertEquals(new HashSet<>(orbs.equipped(after)), new HashSet<>(result.inventory()));
    }

    @Test
    void rejectsDuplicateOwnershipAndEitherDimensionOfDowngradeWithoutMutatingInventory() {
        var before = equipment(1, 0, 3);
        var stone = orbs.equipped(before).getFirst();
        assertThrows(
                IllegalArgumentException.class,
                () -> orbs.toStage(List.of(stone, stone), before, before));
        for (var after : List.of(equipment(2, 0, 3), equipment(1, 0, 1), equipment(2, 0, 1))) {
            var inventory = new ArrayList<>(List.of(stone));
            assertThrows(
                    IllegalArgumentException.class, () -> orbs.toStage(inventory, before, after));
            assertEquals(List.of(stone), inventory);
        }
        var wrongBonus =
                new ProgressionOrbs.Stone(stone.instanceId(), 3, 1, new Position("cape", 0));
        assertThrows(
                IllegalArgumentException.class,
                () -> orbs.toStage(List.of(wrongBonus), before, before));
    }

    @Test
    void carriesTheEpicOrbIntoTheLegendAndAcquiresADistinctSecondOffensiveOrb() {
        var before = equipment(0, 2, 1);
        before.getSlots().get("weapon").setItemStars(9);
        var after = equipment(0, 1, 3);
        var legend = after.getSlots().get("weapon");
        legend.setItemId(12L);
        legend.setItemStars(1);
        legend.setOrbIds(List.of(1L, 3L));
        legend.setOrbLevels(List.of(3, 1));
        var initial = orbs.equipped(before);
        var result = orbs.toStage(initial, before, after);
        assertEquals(2, result.inventory().size());
        assertEquals(
                2,
                result.inventory().stream()
                        .map(ProgressionOrbs.Stone::instanceId)
                        .distinct()
                        .count());
        assertTrue(
                result.inventory().stream()
                        .anyMatch(
                                stone ->
                                        stone.instanceId().equals(initial.getFirst().instanceId())
                                                && stone.templateId() == 1
                                                && stone.level() == 3));
        assertEquals(
                List.of("MOVE", "UPGRADE", "MOVE", "ACQUIRE", "MOVE"),
                result.actions().stream().map(action -> action.type()).toList());
        assertEquals(new HashSet<>(orbs.equipped(after)), new HashSet<>(result.inventory()));
        assertEquals(1, initial.size());
    }
}
