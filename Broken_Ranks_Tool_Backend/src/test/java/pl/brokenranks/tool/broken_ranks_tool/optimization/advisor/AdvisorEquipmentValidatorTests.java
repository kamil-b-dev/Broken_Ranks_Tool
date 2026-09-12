package pl.brokenranks.tool.broken_ranks_tool.optimization.advisor;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.mock;

import java.util.*;
import org.junit.jupiter.api.Test;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.*;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.rules.DrifValueCalculator;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.rules.EquipmentRulesRegistry;
import pl.brokenranks.tool.broken_ranks_tool.equipment.dto.EquipmentRequest.SlotData;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.*;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.calculator.input.EquipmentDataProvider.CalculationContext;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.calculator.processor.ItemStatProcessor;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.calculator.processor.OrbStatProcessor;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.validator.EquipmentPlacementRules;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.validator.UpgradeLevelPolicy;
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.OptimizationRequest;

class AdvisorEquipmentValidatorTests {

    @Test
    void rejectsInvalidStarsLevelsSizesDuplicatesCapacityAndSocketCount() {
        DrifTemplate small = drif(10, DRIF_SIZE.SUBDRIF, DRIF_BONUS_TYPE.CRITICAL_CHANCE);
        DrifTemplate duplicate = drif(11, DRIF_SIZE.SUBDRIF, DRIF_BONUS_TYPE.CRITICAL_CHANCE);
        DrifTemplate large = drif(12, DRIF_SIZE.ARCYDRIF, DRIF_BONUS_TYPE.DAMAGE_MAGIC);
        Fixture f =
                fixture(
                        List.of(rare(1, ITEM_CATEGORY.HELMET, "I", 4)),
                        List.of(small, duplicate, large),
                        List.of());

        assertFalse(f.validator.validSlot("helmet", slot(1, 0, List.of(10L), Map.of("0", 7))));
        assertFalse(f.validator.validSlot("helmet", slot(1, 10, List.of(), Map.of())));
        assertFalse(f.validator.validSlot("helmet", slot(1, 1, List.of(12L), Map.of("0", 1))));
        assertFalse(f.validator.validSlot("helmet", slot(1, 1, List.of(10L, 11L), Map.of())));
        assertFalse(f.validator.validSlot("helmet", slot(1, 1, List.of(10L, 10L), Map.of())));
        assertTrue(f.validator.validSlot("helmet", slot(1, 1, List.of(10L), Map.of("0", 6))));
    }

    @Test
    void enforcesElementalWeaponRules() {
        DrifTemplate fire = drif(10, DRIF_SIZE.SUBDRIF, DRIF_BONUS_TYPE.DAMAGE_FIRE);
        DrifTemplate frost = drif(11, DRIF_SIZE.SUBDRIF, DRIF_BONUS_TYPE.DAMAGE_FROST);
        Fixture f =
                fixture(
                        List.of(
                                rare(1, ITEM_CATEGORY.HELMET, "IV", 20),
                                rare(2, ITEM_CATEGORY.WEAPON_1H, "IV", 20)),
                        List.of(fire, frost),
                        List.of());

        assertFalse(f.validator.validSlot("helmet", slot(1, 1, List.of(10L), Map.of())));
        assertFalse(f.validator.validSlot("weapon", slot(2, 1, List.of(10L, 11L), Map.of())));
        assertTrue(f.validator.validSlot("weapon", slot(2, 1, List.of(10L), Map.of())));
    }

    @Test
    void requiresExactBuiltInDrifsForEpicAndSetItems() {
        DrifTemplate physical = drif(10, DRIF_SIZE.MAGNIDRIF, DRIF_BONUS_TYPE.DAMAGE_PHYSICAL);
        DrifTemplate critical = drif(11, DRIF_SIZE.MAGNIDRIF, DRIF_BONUS_TYPE.CRITICAL_CHANCE);
        DrifTemplate wrongSize = drif(12, DRIF_SIZE.SUBDRIF, DRIF_BONUS_TYPE.DAMAGE_PHYSICAL);
        ItemTemplate allenor = rare(1, ITEM_CATEGORY.WEAPON_1H, "VII", 0);
        allenor.setName("Allenor II");
        allenor.setRarity(RARITY.EPIC);
        Fixture f = fixture(List.of(allenor), List.of(physical, critical, wrongSize), List.of());

        assertTrue(
                f.validator.validSlot(
                        "weapon", slot(1, 1, List.of(10L, 11L), Map.of("0", 16, "1", 16))));
        assertFalse(f.validator.validSlot("weapon", slot(1, 1, List.of(11L, 10L), Map.of())));
        assertFalse(f.validator.validSlot("weapon", slot(1, 1, List.of(12L, 11L), Map.of())));
        assertFalse(f.validator.validSlot("weapon", slot(1, 1, List.of(10L, 11L, 10L), Map.of())));
    }

    @Test
    void validatesLegendaryOrbPositionsLevelsGapsAndLocalDuplicates() {
        ItemTemplate legendary = rare(1, ITEM_CATEGORY.HELMET, "VII", 20);
        legendary.setRarity(RARITY.LEGENDARY);
        OrbTemplate defensive =
                orb(20, ORB_SIZE.BIORB, ORB_CATEGORY.DEFENSIVE, ORB_BONUS_TYPE.DMG_REDUCTION_MELEE);
        OrbTemplate offensive =
                orb(
                        21,
                        ORB_SIZE.BIORB,
                        ORB_CATEGORY.OFFENSIVE,
                        ORB_BONUS_TYPE.STRONGER_CRIT_CHANCE);
        OrbTemplate sameBonus =
                orb(22, ORB_SIZE.BIORB, ORB_CATEGORY.OFFENSIVE, ORB_BONUS_TYPE.DMG_REDUCTION_MELEE);
        Fixture f =
                fixture(List.of(legendary), List.of(), List.of(defensive, offensive, sameBonus));

        assertTrue(
                f.validator.validSlot("helmet", slotWithOrbs(1, List.of(20L, 21L), List.of(3, 3))));
        assertFalse(
                f.validator.validSlot(
                        "helmet", slotWithOrbs(1, Arrays.asList(null, 21L), List.of(1, 3))));
        assertFalse(
                f.validator.validSlot("helmet", slotWithOrbs(1, List.of(20L, 21L), List.of(4, 3))));
        assertFalse(
                f.validator.validSlot("helmet", slotWithOrbs(1, List.of(20L, 20L), List.of(1, 1))));
        assertFalse(
                f.validator.validSlot("helmet", slotWithOrbs(1, List.of(20L, 22L), List.of(1, 1))));
        assertFalse(
                f.validator.validSlot(
                        "helmet", slotWithOrbs(1, List.of(20L, 21L, 21L), List.of(1, 1, 1))));
    }

    @Test
    void rejectsAnOrbBonusRepeatedAcrossSlots() {
        ItemTemplate helmet = rare(1, ITEM_CATEGORY.HELMET, "VII", 20);
        ItemTemplate armor = rare(2, ITEM_CATEGORY.ARMOR, "VII", 20);
        OrbTemplate first =
                orb(
                        20,
                        ORB_SIZE.SUBORB,
                        ORB_CATEGORY.DEFENSIVE,
                        ORB_BONUS_TYPE.DMG_REDUCTION_MELEE);
        OrbTemplate second =
                orb(
                        21,
                        ORB_SIZE.SUBORB,
                        ORB_CATEGORY.DEFENSIVE,
                        ORB_BONUS_TYPE.DMG_REDUCTION_MELEE);
        Fixture f = fixture(List.of(helmet, armor), List.of(), List.of(first, second));

        assertFalse(
                f.validator.valid(
                        Map.of(
                                "helmet", slotWithOrbs(1, List.of(20L), List.of(1)),
                                "armor", slotWithOrbs(2, List.of(21L), List.of(1)))));
    }

    private static Fixture fixture(
            List<ItemTemplate> items, List<DrifTemplate> drifs, List<OrbTemplate> orbs) {
        EquipmentRulesRegistry rules = new EquipmentRulesRegistry();
        UpgradeLevelPolicy levels = new UpgradeLevelPolicy();
        OptimizationRequest request = new OptimizationRequest();
        request.setLockedSlots(Set.of());
        request.setLockedDrifs(Map.of());
        AdvisorEquipmentModel model =
                new AdvisorEquipmentModel(
                        new CalculationContext(index(items), index(orbs), index(drifs)),
                        request,
                        new EquipmentPlacementRules(rules),
                        levels,
                        rules,
                        mock(ItemStatProcessor.class),
                        mock(OrbStatProcessor.class),
                        new DrifValueCalculator());
        return new Fixture(new AdvisorEquipmentValidator(model, rules, levels));
    }

    private static <T extends pl.brokenranks.tool.broken_ranks_tool.core.entity.BaseEntity>
            Map<Long, T> index(List<T> values) {
        Map<Long, T> result = new HashMap<>();
        for (T value : values) result.put(value.getId(), value);
        return result;
    }

    private static ItemTemplate rare(long id, ITEM_CATEGORY category, String tier, int capacity) {
        return ItemTemplate.builder()
                .id(id)
                .name("Item " + id)
                .category(category)
                .tier(tier)
                .capacity(capacity)
                .rarity(RARITY.RARE)
                .stats(Map.of())
                .build();
    }

    private static DrifTemplate drif(long id, DRIF_SIZE size, DRIF_BONUS_TYPE type) {
        return DrifTemplate.builder()
                .id(id)
                .name(type.name())
                .size(size)
                .bonusType(type)
                .baseValue("1%")
                .increment("0%")
                .build();
    }

    private static OrbTemplate orb(
            long id, ORB_SIZE size, ORB_CATEGORY category, ORB_BONUS_TYPE type) {
        return OrbTemplate.builder()
                .id(id)
                .name(type.name())
                .size(size)
                .category(category)
                .bonusType(type)
                .bonusLvl1("1%")
                .bonusLvl2("2%")
                .bonusLvl3("3%")
                .build();
    }

    private static SlotData slot(
            long item, int stars, List<Long> drifs, Map<String, Integer> levels) {
        SlotData slot = new SlotData();
        slot.setItemId(item);
        slot.setItemStars(stars);
        slot.setDrifIds(new ArrayList<>(drifs));
        slot.setDrifLevels(new HashMap<>(levels));
        slot.setOrbIds(new ArrayList<>());
        slot.setOrbLevels(new ArrayList<>());
        return slot;
    }

    private static SlotData slotWithOrbs(long item, List<Long> orbs, List<Integer> levels) {
        SlotData slot = slot(item, 1, List.of(), Map.of());
        slot.setOrbIds(new ArrayList<>(orbs));
        slot.setOrbLevels(new ArrayList<>(levels));
        return slot;
    }

    private record Fixture(AdvisorEquipmentValidator validator) {}
}
