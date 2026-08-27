package pl.brokenranks.tool.broken_ranks_tool.equipment.service.validator;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_BONUS_TYPE;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_SIZE;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.ITEM_CATEGORY;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.ORB_BONUS_TYPE;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.ORB_CATEGORY;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.ORB_SIZE;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.RARITY;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.rules.EquipmentRulesRegistry;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.DrifTemplate;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.ItemTemplate;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.OrbTemplate;

class EquipmentValidatorTests {

    private final EquipmentValidator validator =
            new EquipmentValidator(new EquipmentRulesRegistry());

    @Test
    void calculatesCapacityAtStarBoundaries() {
        ItemTemplate item = item(10, ITEM_CATEGORY.HELMET, RARITY.RARE, "XII");

        assertEquals(10, validator.calculateItemCapacity(item, 6));
        assertEquals(11, validator.calculateItemCapacity(item, 7));
        assertEquals(12, validator.calculateItemCapacity(item, 8));
        assertEquals(14, validator.calculateItemCapacity(item, 9));
        assertEquals(14, validator.calculateItemCapacity(item, 99));
        assertEquals(0, validator.calculateItemCapacity(item(null), 9));
    }

    @Test
    void rejectsDuplicateDrifTypesAndCapacityOverflow() {
        ItemTemplate item = item(4, ITEM_CATEGORY.HELMET, RARITY.RARE, "XII");
        DrifTemplate critical = drif(DRIF_BONUS_TYPE.CRITICAL_CHANCE, DRIF_SIZE.SUBDRIF);

        assertThrows(
                IllegalArgumentException.class,
                () ->
                        validator.validateDrifsSecurity(
                                "helmet", item, 1, List.of(critical, critical), List.of(1, 1)));
        assertThrows(
                IllegalArgumentException.class,
                () ->
                        validator.validateDrifsSecurity(
                                "helmet",
                                item,
                                1,
                                List.of(drif(DRIF_BONUS_TYPE.CRITICAL_CHANCE, DRIF_SIZE.ARCYDRIF)),
                                List.of(21)));
        assertThrows(
                IllegalArgumentException.class,
                () ->
                        validator.validateDrifsSecurity(
                                "helmet",
                                item,
                                1,
                                List.of(drif(DRIF_BONUS_TYPE.DAMAGE_FIRE, DRIF_SIZE.SUBDRIF)),
                                List.of(1)));
    }

    @Test
    void validatesSlotsOrbRulesAndElementalDrifPositions() {
        ItemTemplate helmet = item(4, ITEM_CATEGORY.HELMET, RARITY.RARE, "XII");
        DrifTemplate fire = drif(DRIF_BONUS_TYPE.DAMAGE_FIRE, DRIF_SIZE.ARCYDRIF);
        OrbTemplate defensiveOrb = orb(ORB_CATEGORY.DEFENSIVE);
        OrbTemplate offensiveOrb = orb(ORB_CATEGORY.OFFENSIVE);

        assertTrue(validator.isValidItem(helmet, "helmet"));
        assertFalse(validator.isValidItem(helmet, "weapon"));
        assertTrue(validator.isValidOrb(defensiveOrb, "helmet", false));
        assertFalse(validator.isValidOrb(defensiveOrb, "helmet", true));
        assertTrue(validator.isValidOrb(offensiveOrb, "helmet", true));
        assertTrue(validator.isElementalDrifPositionValid(fire, "weapon"));
        assertFalse(validator.isElementalDrifPositionValid(fire, "helmet"));
        assertTrue(validator.isValidDrifSizeForTier(fire, helmet));
        assertEquals(
                6,
                validator.sanitizeDrifLevel(
                        20, drif(DRIF_BONUS_TYPE.DAMAGE_FIRE, DRIF_SIZE.SUBDRIF)));
        assertEquals(
                1,
                validator.sanitizeDrifLevel(
                        -5, drif(DRIF_BONUS_TYPE.DAMAGE_FIRE, DRIF_SIZE.SUBDRIF)));
        assertEquals(1, validator.sanitizeOrbLevel(-5, orb(ORB_CATEGORY.DEFENSIVE)));
    }

    @Test
    void rejectsTooManyOrbsOnNonLegendaryItems() {
        ItemTemplate rare = item(4, ITEM_CATEGORY.HELMET, RARITY.RARE, "XII");
        OrbTemplate first = orb(ORB_CATEGORY.DEFENSIVE);
        OrbTemplate second = orb(ORB_CATEGORY.OFFENSIVE);
        OrbTemplate third = orb(ORB_CATEGORY.UTILITY);

        assertThrows(
                IllegalArgumentException.class,
                () -> validator.validateOrbsSecurity(rare, List.of(first, second)));
        assertThrows(
                IllegalArgumentException.class,
                () ->
                        validator.validateOrbsSecurity(
                                item(4, ITEM_CATEGORY.HELMET, RARITY.LEGENDARY, "XII"),
                                List.of(first, second, third)));
        assertDoesNotThrow(() -> validator.validateOrbsSecurity(rare, List.of()));
    }

    @Test
    void rejectsDuplicateOrbBonusesButAllowsTwoOffensiveLegendaryOrbsWithDifferentBonuses() {
        ItemTemplate legendary = item(4, ITEM_CATEGORY.HELMET, RARITY.LEGENDARY, "XII");
        OrbTemplate first = orb(ORB_CATEGORY.OFFENSIVE, ORB_BONUS_TYPE.EXTRA_EXP);
        OrbTemplate duplicate = orb(ORB_CATEGORY.OFFENSIVE, ORB_BONUS_TYPE.EXTRA_EXP);
        OrbTemplate different = orb(ORB_CATEGORY.OFFENSIVE, ORB_BONUS_TYPE.EXTRA_GOLD);

        assertThrows(
                IllegalArgumentException.class,
                () -> validator.validateOrbsSecurity(legendary, List.of(first, duplicate)));
        assertDoesNotThrow(
                () -> validator.validateOrbsSecurity(legendary, List.of(first, different)));
    }

    @Test
    void recognizesOnlyAllowedCharacterStats() {
        assertDoesNotThrow(() -> validator.validateCharacterStats(Map.of("Siła", 10)));
        assertThrows(
                IllegalArgumentException.class,
                () -> validator.validateCharacterStats(Map.of("Unknown", 10)));
    }

    private ItemTemplate item(
            Integer capacity, ITEM_CATEGORY category, RARITY rarity, String tier) {
        return ItemTemplate.builder()
                .id(1L)
                .name("Test XII")
                .category(category)
                .rarity(rarity)
                .tier(tier)
                .capacity(capacity)
                .build();
    }

    private ItemTemplate item(Integer capacity) {
        return item(capacity, ITEM_CATEGORY.HELMET, RARITY.RARE, "XII");
    }

    private DrifTemplate drif(DRIF_BONUS_TYPE type, DRIF_SIZE size) {
        return DrifTemplate.builder()
                .id((long) type.ordinal() + 1)
                .name(type.name())
                .bonusType(type)
                .size(size)
                .baseValue("2%")
                .increment("1%")
                .build();
    }

    private OrbTemplate orb(ORB_CATEGORY category) {
        return orb(category, ORB_BONUS_TYPE.EXTRA_EXP);
    }

    private OrbTemplate orb(ORB_CATEGORY category, ORB_BONUS_TYPE bonusType) {
        return OrbTemplate.builder()
                .id((long) category.ordinal() + 1)
                .name(category.name())
                .category(category)
                .bonusType(bonusType)
                .size(ORB_SIZE.BIORB)
                .build();
    }
}
