package pl.brokenranks.tool.broken_ranks_tool.optimization.simpleprofile;

import static org.junit.jupiter.api.Assertions.*;

import java.util.Map;
import org.junit.jupiter.api.Test;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_BONUS_TYPE;
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.BuildConfigurationMode;
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.OptimizationRequest;

class SimpleProfileConfigurationResolverTests {

    @Test
    void expandsPhysicalMeleeProfileAndRemovesAdvancedControls() {
        var request = simple(SimpleBuildProfile.PHYSICAL_MELEE);
        request.setSimpleAspects(
                Map.of(
                        SimpleBuildAspect.DAMAGE,
                        SimpleAspectImportance.IMPORTANT,
                        SimpleBuildAspect.ACCURACY,
                        SimpleAspectImportance.NORMAL));
        request.setForceMaximizationByDrifBonus(true);
        request.setGenerateVariants(true);
        request.setForceCapBonuses(java.util.Set.of(DRIF_BONUS_TYPE.DAMAGE_PHYSICAL));

        assertNull(SimpleProfileConfigurationResolver.resolve(request));

        assertTrue(request.getPriorities().containsKey(DRIF_BONUS_TYPE.DAMAGE_PHYSICAL));
        assertTrue(request.getPriorities().containsKey(DRIF_BONUS_TYPE.HIT_CHANCE_MELEE));
        assertFalse(request.getPriorities().containsKey(DRIF_BONUS_TYPE.DAMAGE_MAGIC));
        assertFalse(request.getPriorities().containsKey(DRIF_BONUS_TYPE.HIT_CHANCE_RANGED));
        assertFalse(request.isForceMaximizationByDrifBonus());
        assertFalse(request.isGenerateVariants());
        assertTrue(request.getForceCapBonuses().isEmpty());
        assertEquals(request.getPriorities().keySet(), request.getSimpleUtilityTargets().keySet());
        assertTrue(
                request.getTargetQuantities().values().stream()
                        .allMatch(range -> range.getMin() == 0 && range.getMax() == 12));
    }

    @Test
    void mapsMagicalResourcesToManaAndImportanceChangesWeight() {
        var normal = simple(SimpleBuildProfile.MAGICAL);
        normal.setSimpleAspects(
                Map.of(SimpleBuildAspect.RESOURCES, SimpleAspectImportance.NORMAL));
        var key = simple(SimpleBuildProfile.MAGICAL);
        key.setSimpleAspects(Map.of(SimpleBuildAspect.RESOURCES, SimpleAspectImportance.KEY));

        assertNull(SimpleProfileConfigurationResolver.resolve(normal));
        assertNull(SimpleProfileConfigurationResolver.resolve(key));

        assertTrue(normal.getPriorities().containsKey(DRIF_BONUS_TYPE.MANA_REGEN));
        assertFalse(normal.getPriorities().containsKey(DRIF_BONUS_TYPE.STAMINA_REGEN));
        assertTrue(
                key.getPriorities().get(DRIF_BONUS_TYPE.MANA_REGEN)
                        > normal.getPriorities().get(DRIF_BONUS_TYPE.MANA_REGEN));
    }

    @Test
    void rejectsProfileWithoutSelectedAspects() {
        var request = simple(SimpleBuildProfile.PHYSICAL_RANGED);
        request.setSimpleAspects(Map.of());

        assertNotNull(SimpleProfileConfigurationResolver.resolve(request));
    }

    private static OptimizationRequest simple(SimpleBuildProfile profile) {
        var request = new OptimizationRequest();
        request.setConfigurationMode(BuildConfigurationMode.SIMPLE);
        request.setSimpleProfile(profile);
        return request;
    }
}
