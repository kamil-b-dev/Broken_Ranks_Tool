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

class EquipmentValidationPoliciesTests {

    private final EquipmentPlacementRules placementRules =
            new EquipmentPlacementRules(new EquipmentRulesRegistry());
    private final UpgradeLevelPolicy levelPolicy = new UpgradeLevelPolicy();
    private final EquipmentRequestValidator requestValidator = new EquipmentRequestValidator();
    private final DrifSecurityValidator drifSecurityValidator =
            new DrifSecurityValidator(placementRules, levelPolicy);
    private final OrbSecurityValidator orbSecurityValidator = new OrbSecurityValidator();

    @Test
    void calculatesCapacityAtStarBoundaries() {
        ItemTemplate item = item(10, ITEM_CATEGORY.HELMET, RARITY.RARE, "XII");

        assertEquals(10, levelPolicy.calculateItemCapacity(item, 6));
        assertEquals(11, levelPolicy.calculateItemCapacity(item, 7));
        assertEquals(12, levelPolicy.calculateItemCapacity(item, 8));
        assertEquals(14, levelPolicy.calculateItemCapacity(item, 9));
        assertEquals(14, levelPolicy.calculateItemCapacity(item, 99));
        assertEquals(0, levelPolicy.calculateItemCapacity(item(null), 9));
    }

    @Test
    void rejectsDuplicateDrifTypesAndCapacityOverflow() {
        ItemTemplate item = item(4, ITEM_CATEGORY.HELMET, RARITY.RARE, "XII");
        DrifTemplate critical = drif(DRIF_BONUS_TYPE.CRITICAL_CHANCE, DRIF_SIZE.SUBDRIF);

        assertThrows(
                IllegalArgumentException.class,
                () ->
                        drifSecurityValidator.validate(
                                "helmet", item, 1, List.of(critical, critical), List.of(1, 1)));
        assertThrows(
                IllegalArgumentException.class,
                () ->
                        drifSecurityValidator.validate(
                                "helmet",
                                item,
                                1,
                                List.of(drif(DRIF_BONUS_TYPE.CRITICAL_CHANCE, DRIF_SIZE.ARCYDRIF)),
                                List.of(21)));
        assertThrows(
                IllegalArgumentException.class,
                () ->
                        drifSecurityValidator.validate(
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

        assertTrue(placementRules.isValidItem(helmet, "helmet"));
        assertFalse(placementRules.isValidItem(helmet, "weapon"));
        assertTrue(placementRules.isValidOrb(defensiveOrb, "helmet", false));
        assertFalse(placementRules.isValidOrb(defensiveOrb, "helmet", true));
        assertTrue(placementRules.isValidOrb(offensiveOrb, "helmet", true));
        assertTrue(placementRules.isElementalDrifPositionValid(fire, "weapon"));
        assertFalse(placementRules.isElementalDrifPositionValid(fire, "helmet"));
        assertTrue(placementRules.isValidDrifSizeForTier(fire, helmet));
        assertEquals(
                6,
                levelPolicy.sanitizeDrifLevel(
                        20, drif(DRIF_BONUS_TYPE.DAMAGE_FIRE, DRIF_SIZE.SUBDRIF)));
        assertEquals(
                1,
                levelPolicy.sanitizeDrifLevel(
                        -5, drif(DRIF_BONUS_TYPE.DAMAGE_FIRE, DRIF_SIZE.SUBDRIF)));
        assertEquals(1, levelPolicy.sanitizeOrbLevel(-5, orb(ORB_CATEGORY.DEFENSIVE)));
    }

    @Test
    void rejectsTooManyOrbsOnNonLegendaryItems() {
        ItemTemplate rare = item(4, ITEM_CATEGORY.HELMET, RARITY.RARE, "XII");
        OrbTemplate first = orb(ORB_CATEGORY.DEFENSIVE);
        OrbTemplate second = orb(ORB_CATEGORY.OFFENSIVE);
        OrbTemplate third = orb(ORB_CATEGORY.UTILITY);

        assertThrows(
                IllegalArgumentException.class,
                () -> orbSecurityValidator.validate(rare, List.of(first, second)));
        assertThrows(
                IllegalArgumentException.class,
                () ->
                        orbSecurityValidator.validate(
                                item(4, ITEM_CATEGORY.HELMET, RARITY.LEGENDARY, "XII"),
                                List.of(first, second, third)));
        assertDoesNotThrow(() -> orbSecurityValidator.validate(rare, List.of()));
    }

    @Test
    void rejectsDuplicateOrbBonusesButAllowsTwoOffensiveLegendaryOrbsWithDifferentBonuses() {
        ItemTemplate legendary = item(4, ITEM_CATEGORY.HELMET, RARITY.LEGENDARY, "XII");
        OrbTemplate first = orb(ORB_CATEGORY.OFFENSIVE, ORB_BONUS_TYPE.EXTRA_EXP);
        OrbTemplate duplicate = orb(ORB_CATEGORY.OFFENSIVE, ORB_BONUS_TYPE.EXTRA_EXP);
        OrbTemplate different = orb(ORB_CATEGORY.OFFENSIVE, ORB_BONUS_TYPE.EXTRA_GOLD);

        assertThrows(
                IllegalArgumentException.class,
                () -> orbSecurityValidator.validate(legendary, List.of(first, duplicate)));
        assertDoesNotThrow(
                () -> orbSecurityValidator.validate(legendary, List.of(first, different)));
    }

    @Test
    void recognizesOnlyAllowedCharacterStats() {
        assertDoesNotThrow(() -> requestValidator.validateCharacterStats(Map.of("Siła", 10)));
        assertThrows(
                IllegalArgumentException.class,
                () -> requestValidator.validateCharacterStats(Map.of("Unknown", 10)));
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
