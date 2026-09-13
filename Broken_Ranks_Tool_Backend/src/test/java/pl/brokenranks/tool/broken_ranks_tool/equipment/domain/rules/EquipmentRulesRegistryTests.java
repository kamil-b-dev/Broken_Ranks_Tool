package pl.brokenranks.tool.broken_ranks_tool.equipment.domain.rules;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.stream.Stream;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_BONUS_TYPE;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.ITEM_CATEGORY;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.ORB_CATEGORY;

class EquipmentRulesRegistryTests {

    private final EquipmentRulesRegistry rules = new EquipmentRulesRegistry();

    @ParameterizedTest
    @MethodSource("itemSlotCases")
    void validatesItemCategoriesForEveryKindOfSlot(
            ITEM_CATEGORY category, String slot, boolean expected) {
        assertThat(rules.isItemAllowedInSlot(category, slot)).isEqualTo(expected);
    }

    @ParameterizedTest
    @MethodSource("orbSlotCases")
    void validatesOrbCategoriesForEveryKindOfSlot(
            ORB_CATEGORY category, String slot, boolean expected) {
        assertThat(rules.isOrbAllowedInSlot(category, slot)).isEqualTo(expected);
    }

    @Test
    void identifiesOnlyElementalDamageBonuses() {
        assertThat(rules.isElementalDamage(DRIF_BONUS_TYPE.DAMAGE_ENERGY)).isTrue();
        assertThat(rules.isElementalDamage(DRIF_BONUS_TYPE.DAMAGE_FIRE)).isTrue();
        assertThat(rules.isElementalDamage(DRIF_BONUS_TYPE.DAMAGE_FROST)).isTrue();
        assertThat(rules.isElementalDamage(DRIF_BONUS_TYPE.DAMAGE_PHYSICAL)).isFalse();
        assertThat(rules.isElementalDamage(null)).isFalse();
    }

    @ParameterizedTest
    @MethodSource("penaltyCases")
    void appliesTheDocumentedDrifPenaltyTable(int count, double expected) {
        assertThat(rules.getDrifPenalty(count)).isEqualTo(expected);
    }

    private static Stream<Arguments> itemSlotCases() {
        return Stream.of(
                Arguments.of(ITEM_CATEGORY.HELMET, "helmet", true),
                Arguments.of(ITEM_CATEGORY.WEAPON_1H, "weapon", true),
                Arguments.of(ITEM_CATEGORY.WEAPON_2H, "weapon", true),
                Arguments.of(ITEM_CATEGORY.WEAPON_RANGED, "weapon", true),
                Arguments.of(ITEM_CATEGORY.RING, "ring1", true),
                Arguments.of(ITEM_CATEGORY.RING, "ring2", true),
                Arguments.of(ITEM_CATEGORY.OFF_HAND, "weapon", false),
                Arguments.of(ITEM_CATEGORY.HELMET, "missing", false),
                Arguments.of(null, "helmet", false),
                Arguments.of(ITEM_CATEGORY.HELMET, null, false));
    }

    private static Stream<Arguments> orbSlotCases() {
        return Stream.of(
                Arguments.of(ORB_CATEGORY.OFFENSIVE, "weapon", true),
                Arguments.of(ORB_CATEGORY.OFFENSIVE, "shield", true),
                Arguments.of(ORB_CATEGORY.DEFENSIVE, "shield", true),
                Arguments.of(ORB_CATEGORY.UTILITY, "ring1", true),
                Arguments.of(ORB_CATEGORY.UTILITY, "necklace", true),
                Arguments.of(ORB_CATEGORY.UTILITY, "weapon", false),
                Arguments.of(ORB_CATEGORY.OFFENSIVE, "missing", false),
                Arguments.of(null, "weapon", false),
                Arguments.of(ORB_CATEGORY.OFFENSIVE, null, false));
    }

    private static Stream<Arguments> penaltyCases() {
        return Stream.of(
                Arguments.of(0, 1.0),
                Arguments.of(3, 1.0),
                Arguments.of(4, 0.95),
                Arguments.of(5, 0.87),
                Arguments.of(6, 0.80),
                Arguments.of(7, 0.74),
                Arguments.of(8, 0.69),
                Arguments.of(9, 0.64),
                Arguments.of(10, 0.59),
                Arguments.of(11, 0.54),
                Arguments.of(12, 0.50),
                Arguments.of(99, 0.50));
    }
}
