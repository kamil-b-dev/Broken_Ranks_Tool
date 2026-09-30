package pl.brokenranks.tool.broken_ranks_tool.optimization.simpleprofile;

import static org.junit.jupiter.api.Assertions.*;

import java.util.Map;
import org.junit.jupiter.api.Test;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_BONUS_TYPE;
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.BuildConfigurationMode;
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.OptimizationRequest;

class SimpleProfileConfigurationResolverTests {

    @Test
    void buildsBarbarianFromCommonCoreBalancedPackageAndPlayerCounts() {
        var request = simple(SimpleBuildProfile.BARBARIAN);
        var options = new SimpleProfileOptions();
        options.setDamageDrifs(9);
        options.setAccuracyDrifs(8);
        options.setElement(SimpleElement.FROST);
        request.setSimpleOptions(options);

        assertNull(SimpleProfileConfigurationResolver.resolve(request));

        assertMaximum(request, DRIF_BONUS_TYPE.DAMAGE_PHYSICAL, 9);
        assertMaximum(request, DRIF_BONUS_TYPE.HIT_CHANCE_MELEE, 8);
        assertMaximum(request, DRIF_BONUS_TYPE.DAMAGE_FROST, 1);
        assertMaximum(request, DRIF_BONUS_TYPE.STAMINA_USAGE_REDUCTION, 1);
        assertEquals(
                9.5,
                request.getForcedPercentageTargets()
                        .get(DRIF_BONUS_TYPE.CRITICAL_DAMAGE_CHANCE_REDUCTION));
        assertMaximum(request, DRIF_BONUS_TYPE.CRITICAL_DAMAGE_CHANCE_REDUCTION, 1);
        assertBalancedPackage(request);
    }

    @Test
    void createsDefensiveKnightWithDefensiveTargetsAndLowerDefaults() {
        var request = simple(SimpleBuildProfile.KNIGHT);
        var options = new SimpleProfileOptions();
        options.setStyle(SimpleBuildStyle.DEFENSIVE);
        request.setSimpleOptions(options);

        assertNull(SimpleProfileConfigurationResolver.resolve(request));

        assertMaximum(request, DRIF_BONUS_TYPE.DAMAGE_PHYSICAL, 4);
        assertMaximum(request, DRIF_BONUS_TYPE.HIT_CHANCE_MELEE, 4);
        assertExact(request, DRIF_BONUS_TYPE.PASIVE_DAMAGE_REDUCTION, 1);
        assertFalse(
                request.getForcedPercentageTargets()
                        .containsKey(DRIF_BONUS_TYPE.PASIVE_DAMAGE_REDUCTION));
        assertEquals(
                45.0,
                request.getForcedPercentageTargets().get(DRIF_BONUS_TYPE.DAMAGE_REDUCTION_CHANCE));
        assertTrue(request.getMaximizeBonuses().contains(DRIF_BONUS_TYPE.DAMAGE_REDUCTION));
    }

    @Test
    void distinguishesArcherFireMageSheedAndVoodooAttackTypes() {
        var archer = resolved(SimpleBuildProfile.ARCHER, null);
        var fireMage = resolved(SimpleBuildProfile.FIRE_MAGE, null);
        var sheedOptions = new SimpleProfileOptions();
        sheedOptions.setElement(SimpleElement.ENERGY);
        var sheed = resolved(SimpleBuildProfile.SHEED, sheedOptions);
        var voodoo = resolved(SimpleBuildProfile.VOODOO, null);

        assertTrue(archer.getPriorities().containsKey(DRIF_BONUS_TYPE.HIT_CHANCE_RANGED));
        assertTrue(fireMage.getPriorities().containsKey(DRIF_BONUS_TYPE.DAMAGE_MAGIC));
        assertTrue(fireMage.getPriorities().containsKey(DRIF_BONUS_TYPE.HIT_CHANCE_RANGED));
        assertMaximum(sheed, DRIF_BONUS_TYPE.DAMAGE_ENERGY, 1);
        assertTrue(sheed.getPriorities().containsKey(DRIF_BONUS_TYPE.HIT_CHANCE_MELEE));
        assertTrue(voodoo.getPriorities().containsKey(DRIF_BONUS_TYPE.HIT_CHANCE_MENTAL));
        assertTrue(voodoo.getMaximizeBonuses().contains(DRIF_BONUS_TYPE.MENTAL_DEFENSE_REDUCTION));
    }

    @Test
    void givesDruidTwoManaReductionDrifsAndCapsBreakthroughOnlyInOffense() {
        var offensive = resolved(SimpleBuildProfile.DRUID, null);
        var defensiveOptions = new SimpleProfileOptions();
        defensiveOptions.setStyle(SimpleBuildStyle.DEFENSIVE);
        var defensive = resolved(SimpleBuildProfile.DRUID, defensiveOptions);

        assertMaximum(offensive, DRIF_BONUS_TYPE.MANA_USAGE_REDUCTION, 2);
        assertTrue(
                offensive.getMaximizeBonuses().contains(DRIF_BONUS_TYPE.MENTAL_DEFENSE_REDUCTION));
        assertFalse(
                defensive.getMaximizeBonuses().contains(DRIF_BONUS_TYPE.MENTAL_DEFENSE_REDUCTION));
    }

    @Test
    void enablesOptionalReductionsHolmAndFaridIndependently() {
        var options = new SimpleProfileOptions();
        options.setPassiveDamageReduction(true);
        options.setPercentageDamageReduction(true);
        options.setDamageReductionChance(true);
        options.setDodgeChance(true);
        var request = resolved(SimpleBuildProfile.ARCHER, options);

        assertTrue(request.getPriorities().containsKey(DRIF_BONUS_TYPE.PASIVE_DAMAGE_REDUCTION));
        assertTrue(
                request.getPriorities().containsKey(DRIF_BONUS_TYPE.PERCENTAGE_DAMAGE_REDUCTION));
        assertExact(request, DRIF_BONUS_TYPE.PASIVE_DAMAGE_REDUCTION, 1);
        assertExact(request, DRIF_BONUS_TYPE.PERCENTAGE_DAMAGE_REDUCTION, 1);
        assertTrue(request.getMaximizeBonuses().contains(DRIF_BONUS_TYPE.DAMAGE_REDUCTION_CHANCE));
        assertTrue(request.getMaximizeBonuses().contains(DRIF_BONUS_TYPE.DODGE_CHANCE));
    }

    @Test
    void rejectsDefensiveStyleForProfessionWithoutThatVariant() {
        var request = simple(SimpleBuildProfile.BARBARIAN);
        var options = new SimpleProfileOptions();
        options.setStyle(SimpleBuildStyle.DEFENSIVE);
        request.setSimpleOptions(options);

        assertNotNull(SimpleProfileConfigurationResolver.resolve(request));
    }

    @Test
    void passiveReductionAlwaysUsesOneDrifAndCanBeDisabledInBothStyles() {
        for (var profession :
                new SimpleBuildProfile[] {SimpleBuildProfile.KNIGHT, SimpleBuildProfile.DRUID}) {
            for (var style : SimpleBuildStyle.values()) {
                var options = new SimpleProfileOptions();
                options.setStyle(style);
                options.setPassiveDamageReduction(true);
                var enabled = resolved(profession, options);
                assertExact(enabled, DRIF_BONUS_TYPE.PASIVE_DAMAGE_REDUCTION, 1);
                assertFalse(
                        enabled.getForcedPercentageTargets()
                                .containsKey(DRIF_BONUS_TYPE.PASIVE_DAMAGE_REDUCTION));
                options.setPassiveDamageReduction(false);
                assertFalse(
                        resolved(profession, options)
                                .getPriorities()
                                .containsKey(DRIF_BONUS_TYPE.PASIVE_DAMAGE_REDUCTION));
            }
        }
    }

    @Test
    void keepsLegacyProfilesReadable() {
        var request = simple(SimpleBuildProfile.MAGICAL_RANGED);
        request.setSimpleAspects(
                Map.of(SimpleBuildAspect.ACCURACY, SimpleAspectImportance.IMPORTANT));

        assertNull(SimpleProfileConfigurationResolver.resolve(request));
        assertTrue(request.getPriorities().containsKey(DRIF_BONUS_TYPE.HIT_CHANCE_RANGED));
        assertFalse(request.getPriorities().containsKey(DRIF_BONUS_TYPE.HIT_CHANCE_MENTAL));
        assertFalse(request.getMaximizeBonuses().isEmpty());
    }

    private static OptimizationRequest resolved(
            SimpleBuildProfile profile, SimpleProfileOptions options) {
        var request = simple(profile);
        request.setSimpleOptions(options);
        assertNull(SimpleProfileConfigurationResolver.resolve(request));
        return request;
    }

    private static void assertBalancedPackage(OptimizationRequest request) {
        assertTrue(request.getMaximizeBonuses().contains(DRIF_BONUS_TYPE.DOUBLE_ATTACK_CHANCE));
        assertTrue(request.getMaximizeBonuses().contains(DRIF_BONUS_TYPE.CRITICAL_CHANCE));
        assertTrue(request.getMaximizeBonuses().contains(DRIF_BONUS_TYPE.DOUBLE_HIT_ROLL_CHANCE));
        assertTrue(request.getMaximizeBonuses().contains(DRIF_BONUS_TYPE.DAMAGE_REDUCTION));
    }

    private static void assertMaximum(
            OptimizationRequest request, DRIF_BONUS_TYPE type, int maximum) {
        assertEquals(maximum, request.getTargetQuantities().get(type).getMax());
    }

    private static void assertMinimum(
            OptimizationRequest request, DRIF_BONUS_TYPE type, int minimum) {
        assertEquals(minimum, request.getTargetQuantities().get(type).getMin());
    }

    private static void assertExact(
            OptimizationRequest request, DRIF_BONUS_TYPE type, int quantity) {
        assertMinimum(request, type, quantity);
        assertMaximum(request, type, quantity);
    }

    private static OptimizationRequest simple(SimpleBuildProfile profile) {
        var request = new OptimizationRequest();
        request.setConfigurationMode(BuildConfigurationMode.SIMPLE);
        request.setSimpleProfile(profile);
        return request;
    }
}
