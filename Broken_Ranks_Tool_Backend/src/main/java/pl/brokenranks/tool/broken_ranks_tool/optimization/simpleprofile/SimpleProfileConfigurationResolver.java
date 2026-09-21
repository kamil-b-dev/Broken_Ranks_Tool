package pl.brokenranks.tool.broken_ranks_tool.optimization.simpleprofile;

import java.util.EnumMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_BONUS_TYPE;
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.BuildConfigurationMode;
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.OptimizationRequest;

/** Expands simple profile choices into internal priorities and diminishing-return targets. */
public final class SimpleProfileConfigurationResolver {

    private record Preference(DRIF_BONUS_TYPE type, int weight, double usefulTarget) {}

    private SimpleProfileConfigurationResolver() {}

    public static String resolve(OptimizationRequest request) {
        if (request.getConfigurationMode() != BuildConfigurationMode.SIMPLE
                || request.getSimpleProfile() == null) return null;
        if (request.getSimpleAspects() == null || request.getSimpleAspects().isEmpty()) {
            return "Wybierz przynajmniej jeden obszar ważny dla prostego profilu.";
        }

        Map<DRIF_BONUS_TYPE, Integer> priorities = new LinkedHashMap<>();
        Map<DRIF_BONUS_TYPE, Double> usefulTargets = new EnumMap<>(DRIF_BONUS_TYPE.class);
        for (var entry : request.getSimpleAspects().entrySet()) {
            if (entry.getKey() == null || entry.getValue() == null) {
                return "Prosty profil zawiera nieprawidłowy obszar lub ważność.";
            }
            for (Preference preference : preferences(request.getSimpleProfile(), entry.getKey())) {
                priorities.merge(
                        preference.type(), entry.getValue().weight(preference.weight()), Math::max);
                usefulTargets.merge(preference.type(), preference.usefulTarget(), Math::max);
            }
        }
        if (priorities.isEmpty()) return "Wybrane obszary nie tworzą żadnych celów optymalizacji.";

        request.setPriorities(priorities);
        request.setTargetQuantities(defaultQuantities(priorities));
        request.setSimpleUtilityTargets(usefulTargets);
        request.setForceCapBonuses(java.util.Set.of());
        request.setForcedPercentageTargets(Map.of());
        request.setMaximizeBonuses(java.util.Set.of());
        request.setDrifSizeQuantities(Map.of());
        request.setForceMaximizationByDrifBonus(false);
        request.setGenerateVariants(false);
        return null;
    }

    private static Map<DRIF_BONUS_TYPE, OptimizationRequest.QuantityRange> defaultQuantities(
            Map<DRIF_BONUS_TYPE, Integer> priorities) {
        Map<DRIF_BONUS_TYPE, OptimizationRequest.QuantityRange> result =
                new EnumMap<>(DRIF_BONUS_TYPE.class);
        priorities
                .keySet()
                .forEach(type -> result.put(type, new OptimizationRequest.QuantityRange(0, 12)));
        return result;
    }

    private static List<Preference> preferences(
            SimpleBuildProfile profile, SimpleBuildAspect aspect) {
        return switch (aspect) {
            case DAMAGE -> damage(profile);
            case ACCURACY -> accuracy(profile);
            case SURVIVABILITY ->
                    List.of(
                            preference(DRIF_BONUS_TYPE.DAMAGE_REDUCTION, 28, 10),
                            preference(DRIF_BONUS_TYPE.DODGE_CHANCE, 20, 12),
                            preference(DRIF_BONUS_TYPE.DOUBLE_DEFENSE_ROLL_CHANCE, 17, 20),
                            preference(DRIF_BONUS_TYPE.CRITICAL_DAMAGE_REDUCTION, 14, 15));
            case RESOURCES -> resources(profile);
            case RESISTANCE ->
                    List.of(
                            preference(DRIF_BONUS_TYPE.CC_PROTECTION, 22, 18),
                            preference(DRIF_BONUS_TYPE.PERCENTAGE_DAMAGE_REDUCTION, 18, 15),
                            preference(DRIF_BONUS_TYPE.PASIVE_DAMAGE_REDUCTION, 16, 18));
            case UTILITY ->
                    List.of(
                            preference(DRIF_BONUS_TYPE.DISPELL_CHANCE, 22, 12),
                            preference(DRIF_BONUS_TYPE.CRITICAL_DAMAGE_CHANCE_REDUCTION, 16, 15));
        };
    }

    private static List<Preference> damage(SimpleBuildProfile profile) {
        DRIF_BONUS_TYPE main =
                profile == SimpleBuildProfile.MAGICAL
                        ? DRIF_BONUS_TYPE.DAMAGE_MAGIC
                        : DRIF_BONUS_TYPE.DAMAGE_PHYSICAL;
        return List.of(
                preference(main, 30, 25),
                preference(DRIF_BONUS_TYPE.CRITICAL_CHANCE, 22, 20),
                preference(DRIF_BONUS_TYPE.DOUBLE_ATTACK_CHANCE, 18, 18));
    }

    private static List<Preference> accuracy(SimpleBuildProfile profile) {
        DRIF_BONUS_TYPE main =
                switch (profile) {
                    case MAGICAL -> DRIF_BONUS_TYPE.HIT_CHANCE_MENTAL;
                    case PHYSICAL_MELEE -> DRIF_BONUS_TYPE.HIT_CHANCE_MELEE;
                    case PHYSICAL_RANGED -> DRIF_BONUS_TYPE.HIT_CHANCE_RANGED;
                };
        if (profile == SimpleBuildProfile.MAGICAL) {
            return List.of(
                    preference(main, 30, 25),
                    preference(DRIF_BONUS_TYPE.DOUBLE_HIT_ROLL_CHANCE, 18, 18),
                    preference(DRIF_BONUS_TYPE.MENTAL_DEFENSE_REDUCTION, 17, 15));
        }
        return List.of(
                preference(main, 30, 25),
                preference(DRIF_BONUS_TYPE.DOUBLE_HIT_ROLL_CHANCE, 18, 18));
    }

    private static List<Preference> resources(SimpleBuildProfile profile) {
        if (profile == SimpleBuildProfile.MAGICAL) {
            return List.of(
                    preference(DRIF_BONUS_TYPE.MANA_USAGE_REDUCTION, 25, 15),
                    preference(DRIF_BONUS_TYPE.MANA_REGEN, 20, 20),
                    preference(DRIF_BONUS_TYPE.MANA_STEAL, 15, 10));
        }
        return List.of(
                preference(DRIF_BONUS_TYPE.STAMINA_USAGE_REDUCTION, 25, 15),
                preference(DRIF_BONUS_TYPE.STAMINA_REGEN, 20, 20));
    }

    private static Preference preference(DRIF_BONUS_TYPE type, int weight, double target) {
        return new Preference(type, weight, target);
    }
}
