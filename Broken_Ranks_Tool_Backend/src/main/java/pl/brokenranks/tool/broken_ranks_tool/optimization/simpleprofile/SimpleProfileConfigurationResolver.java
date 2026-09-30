package pl.brokenranks.tool.broken_ranks_tool.optimization.simpleprofile;

import java.util.EnumMap;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_BONUS_TYPE;
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.BuildConfigurationMode;
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.OptimizationRequest;

/** Expands simple profession choices into deterministic internal optimization goals. */
public final class SimpleProfileConfigurationResolver {

    private record Preference(DRIF_BONUS_TYPE type, int weight) {}

    private SimpleProfileConfigurationResolver() {}

    public static String resolve(OptimizationRequest request) {
        if (request.getConfigurationMode() != BuildConfigurationMode.SIMPLE
                || request.getSimpleProfile() == null) return null;
        if (isLegacy(request.getSimpleProfile())) return resolveLegacy(request);

        SimpleProfileOptions options =
                request.getSimpleOptions() != null
                        ? request.getSimpleOptions()
                        : new SimpleProfileOptions();
        SimpleBuildStyle style =
                options.getStyle() != null ? options.getStyle() : SimpleBuildStyle.OFFENSIVE;
        if (style == SimpleBuildStyle.DEFENSIVE
                && request.getSimpleProfile() != SimpleBuildProfile.KNIGHT
                && request.getSimpleProfile() != SimpleBuildProfile.DRUID) {
            return "Wariant defensywny jest dostępny tylko dla Rycerza i Druida.";
        }

        ProfileBuilder profile = new ProfileBuilder();
        configureProfession(profile, request.getSimpleProfile(), style, options);
        request.setPriorities(profile.priorities);
        request.setTargetQuantities(profile.quantities);
        request.setSimplePreferredQuantities(profile.preferredQuantities);
        request.setForceCapBonuses(profile.forcedCaps);
        request.setForcedPercentageTargets(profile.forcedTargets);
        request.setMaximizeBonuses(profile.maximized);
        request.setDrifSizeQuantities(Map.of());
        request.setForceMaximizationByDrifBonus(false);
        request.setGenerateVariants(false);
        return null;
    }

    private static void configureProfession(
            ProfileBuilder profile,
            SimpleBuildProfile profession,
            SimpleBuildStyle style,
            SimpleProfileOptions options) {
        int damage = valueOr(options.getDamageDrifs(), defaultDamage(profession, style));
        int accuracy = valueOr(options.getAccuracyDrifs(), defaultAccuracy(profession, style));
        DRIF_BONUS_TYPE damageType =
                isMagical(profession)
                        ? DRIF_BONUS_TYPE.DAMAGE_MAGIC
                        : DRIF_BONUS_TYPE.DAMAGE_PHYSICAL;
        DRIF_BONUS_TYPE accuracyType =
                switch (profession) {
                    case ARCHER, FIRE_MAGE -> DRIF_BONUS_TYPE.HIT_CHANCE_RANGED;
                    case DRUID, VOODOO -> DRIF_BONUS_TYPE.HIT_CHANCE_MENTAL;
                    default -> DRIF_BONUS_TYPE.HIT_CHANCE_MELEE;
                };

        profile.maximize(damageType, 30, damage);
        profile.maximize(accuracyType, 30, accuracy);
        profile.preferQuantity(damageType, damage);
        profile.preferQuantity(accuracyType, accuracy);
        addCommonCore(profile, profession == SimpleBuildProfile.DRUID ? 2 : 1);
        addBalancedCombatPackage(profile);

        if (profession == SimpleBuildProfile.BARBARIAN) {
            addElement(profile, selectedElement(options, SimpleElement.FIRE), true);
        } else if (profession == SimpleBuildProfile.SHEED) {
            addElement(profile, selectedElement(options, SimpleElement.NONE), false);
        }

        if ((profession == SimpleBuildProfile.DRUID && style == SimpleBuildStyle.OFFENSIVE)
                || profession == SimpleBuildProfile.VOODOO) {
            profile.maximize(DRIF_BONUS_TYPE.MENTAL_DEFENSE_REDUCTION, 28, 12);
        }

        boolean defensive = style == SimpleBuildStyle.DEFENSIVE;
        boolean knightOrDruid =
                profession == SimpleBuildProfile.KNIGHT || profession == SimpleBuildProfile.DRUID;
        if (knightOrDruid) {
            if (enabled(options.getPassiveDamageReduction(), defensive)) {
                profile.exact(DRIF_BONUS_TYPE.PASIVE_DAMAGE_REDUCTION, defensive ? 28 : 18, 1);
            }
            if (defensive) {
                profile.forceTarget(DRIF_BONUS_TYPE.DAMAGE_REDUCTION_CHANCE, 27, 45);
            } else {
                profile.maximize(DRIF_BONUS_TYPE.DAMAGE_REDUCTION_CHANCE, 17, 12);
            }
        }

        if (enabled(options.getPercentageDamageReduction(), false)) {
            profile.exact(DRIF_BONUS_TYPE.PERCENTAGE_DAMAGE_REDUCTION, 20, 1);
        }
        if (!knightOrDruid && enabled(options.getPassiveDamageReduction(), false)) {
            profile.exact(DRIF_BONUS_TYPE.PASIVE_DAMAGE_REDUCTION, 20, 1);
        }
        if (!knightOrDruid && enabled(options.getDamageReductionChance(), false)) {
            profile.maximize(DRIF_BONUS_TYPE.DAMAGE_REDUCTION_CHANCE, 19, 12);
        }
        if (enabled(options.getDodgeChance(), false)) {
            profile.maximize(DRIF_BONUS_TYPE.DODGE_CHANCE, 18, 12);
        }
    }

    private static void addCommonCore(ProfileBuilder profile, int resourceCount) {
        DRIF_BONUS_TYPE resource =
                profile.priorities.containsKey(DRIF_BONUS_TYPE.DAMAGE_MAGIC)
                        ? DRIF_BONUS_TYPE.MANA_USAGE_REDUCTION
                        : DRIF_BONUS_TYPE.STAMINA_USAGE_REDUCTION;
        profile.maximize(resource, 29, resourceCount);
        profile.forceTarget(DRIF_BONUS_TYPE.CRITICAL_DAMAGE_CHANCE_REDUCTION, 29, 9.5, 1);
        profile.maximize(DRIF_BONUS_TYPE.CRITICAL_DAMAGE_REDUCTION, 27, 1);
    }

    private static void addBalancedCombatPackage(ProfileBuilder profile) {
        profile.maximize(DRIF_BONUS_TYPE.DOUBLE_ATTACK_CHANCE, 24, 12);
        profile.maximize(DRIF_BONUS_TYPE.CRITICAL_CHANCE, 24, 12);
        profile.maximize(DRIF_BONUS_TYPE.DOUBLE_HIT_ROLL_CHANCE, 24, 12);
        profile.maximize(DRIF_BONUS_TYPE.DAMAGE_REDUCTION, 24, 12);
    }

    private static void addElement(
            ProfileBuilder profile, SimpleElement element, boolean required) {
        if (element == SimpleElement.NONE) {
            if (required) profile.maximize(DRIF_BONUS_TYPE.DAMAGE_FIRE, 22, 1);
            return;
        }
        profile.maximize(element.bonusType(), 22, 1);
    }

    private static SimpleElement selectedElement(
            SimpleProfileOptions options, SimpleElement defaultValue) {
        return options.getElement() != null ? options.getElement() : defaultValue;
    }

    private static int defaultDamage(SimpleBuildProfile profession, SimpleBuildStyle style) {
        if ((profession == SimpleBuildProfile.KNIGHT || profession == SimpleBuildProfile.DRUID)
                && style == SimpleBuildStyle.DEFENSIVE) return 4;
        if (profession == SimpleBuildProfile.KNIGHT || profession == SimpleBuildProfile.DRUID) {
            return 6;
        }
        return 7;
    }

    private static int defaultAccuracy(SimpleBuildProfile profession, SimpleBuildStyle style) {
        if ((profession == SimpleBuildProfile.KNIGHT || profession == SimpleBuildProfile.DRUID)
                && style == SimpleBuildStyle.DEFENSIVE) return 4;
        if (profession == SimpleBuildProfile.KNIGHT || profession == SimpleBuildProfile.DRUID) {
            return 5;
        }
        if (profession == SimpleBuildProfile.ARCHER
                || profession == SimpleBuildProfile.SHEED
                || profession == SimpleBuildProfile.VOODOO) return 7;
        return 6;
    }

    private static boolean enabled(Boolean value, boolean defaultValue) {
        return value != null ? value : defaultValue;
    }

    private static int valueOr(Integer value, int defaultValue) {
        return value != null ? value : defaultValue;
    }

    private static boolean isMagical(SimpleBuildProfile profile) {
        return profile == SimpleBuildProfile.FIRE_MAGE
                || profile == SimpleBuildProfile.DRUID
                || profile == SimpleBuildProfile.VOODOO;
    }

    private static boolean isLegacy(SimpleBuildProfile profile) {
        return switch (profile) {
            case MAGICAL, MAGICAL_RANGED, MAGICAL_MENTAL, PHYSICAL_MELEE, PHYSICAL_RANGED -> true;
            default -> false;
        };
    }

    private static String resolveLegacy(OptimizationRequest request) {
        if (request.getSimpleAspects() == null || request.getSimpleAspects().isEmpty()) {
            return "Wybierz przynajmniej jeden obszar ważny dla prostego profilu.";
        }
        Map<DRIF_BONUS_TYPE, Integer> priorities = new LinkedHashMap<>();
        for (var entry : request.getSimpleAspects().entrySet()) {
            if (entry.getKey() == null || entry.getValue() == null) {
                return "Prosty profil zawiera nieprawidłowy obszar lub ważność.";
            }
            for (Preference preference :
                    legacyPreferences(request.getSimpleProfile(), entry.getKey())) {
                priorities.merge(
                        preference.type(), entry.getValue().weight(preference.weight()), Math::max);
            }
        }
        request.setPriorities(priorities);
        Map<DRIF_BONUS_TYPE, OptimizationRequest.QuantityRange> quantities =
                new EnumMap<>(DRIF_BONUS_TYPE.class);
        priorities.keySet().forEach(type -> quantities.put(type, range(12)));
        request.setTargetQuantities(quantities);
        request.setSimplePreferredQuantities(Map.of());
        request.setForceCapBonuses(Set.of());
        request.setForcedPercentageTargets(Map.of());
        request.setMaximizeBonuses(new LinkedHashSet<>(priorities.keySet()));
        request.setDrifSizeQuantities(Map.of());
        request.setForceMaximizationByDrifBonus(false);
        request.setGenerateVariants(false);
        return null;
    }

    private static List<Preference> legacyPreferences(
            SimpleBuildProfile profile, SimpleBuildAspect aspect) {
        boolean magical =
                profile == SimpleBuildProfile.MAGICAL
                        || profile == SimpleBuildProfile.MAGICAL_RANGED
                        || profile == SimpleBuildProfile.MAGICAL_MENTAL;
        return switch (aspect) {
            case DAMAGE ->
                    List.of(
                            new Preference(
                                    magical
                                            ? DRIF_BONUS_TYPE.DAMAGE_MAGIC
                                            : DRIF_BONUS_TYPE.DAMAGE_PHYSICAL,
                                    30),
                            new Preference(DRIF_BONUS_TYPE.CRITICAL_CHANCE, 22),
                            new Preference(DRIF_BONUS_TYPE.DOUBLE_ATTACK_CHANCE, 18));
            case ACCURACY -> {
                DRIF_BONUS_TYPE hit =
                        switch (profile) {
                            case MAGICAL, MAGICAL_MENTAL -> DRIF_BONUS_TYPE.HIT_CHANCE_MENTAL;
                            case MAGICAL_RANGED, PHYSICAL_RANGED ->
                                    DRIF_BONUS_TYPE.HIT_CHANCE_RANGED;
                            default -> DRIF_BONUS_TYPE.HIT_CHANCE_MELEE;
                        };
                if (profile == SimpleBuildProfile.MAGICAL
                        || profile == SimpleBuildProfile.MAGICAL_MENTAL) {
                    yield List.of(
                            new Preference(hit, 30),
                            new Preference(DRIF_BONUS_TYPE.DOUBLE_HIT_ROLL_CHANCE, 18),
                            new Preference(DRIF_BONUS_TYPE.MENTAL_DEFENSE_REDUCTION, 17));
                }
                yield List.of(
                        new Preference(hit, 30),
                        new Preference(DRIF_BONUS_TYPE.DOUBLE_HIT_ROLL_CHANCE, 18));
            }
            case SURVIVABILITY ->
                    List.of(
                            new Preference(DRIF_BONUS_TYPE.DAMAGE_REDUCTION, 28),
                            new Preference(DRIF_BONUS_TYPE.DODGE_CHANCE, 20),
                            new Preference(DRIF_BONUS_TYPE.DOUBLE_DEFENSE_ROLL_CHANCE, 17),
                            new Preference(DRIF_BONUS_TYPE.CRITICAL_DAMAGE_REDUCTION, 14));
            case RESOURCES ->
                    magical
                            ? List.of(
                                    new Preference(DRIF_BONUS_TYPE.MANA_USAGE_REDUCTION, 25),
                                    new Preference(DRIF_BONUS_TYPE.MANA_REGEN, 20),
                                    new Preference(DRIF_BONUS_TYPE.MANA_STEAL, 15))
                            : List.of(
                                    new Preference(DRIF_BONUS_TYPE.STAMINA_USAGE_REDUCTION, 25),
                                    new Preference(DRIF_BONUS_TYPE.STAMINA_REGEN, 20));
            case RESISTANCE ->
                    List.of(
                            new Preference(DRIF_BONUS_TYPE.CC_PROTECTION, 22),
                            new Preference(DRIF_BONUS_TYPE.PERCENTAGE_DAMAGE_REDUCTION, 18),
                            new Preference(DRIF_BONUS_TYPE.PASIVE_DAMAGE_REDUCTION, 16));
            case UTILITY ->
                    List.of(
                            new Preference(DRIF_BONUS_TYPE.DISPELL_CHANCE, 22),
                            new Preference(DRIF_BONUS_TYPE.CRITICAL_DAMAGE_CHANCE_REDUCTION, 16));
        };
    }

    private static OptimizationRequest.QuantityRange range(int maximum) {
        return new OptimizationRequest.QuantityRange(0, maximum);
    }

    private static final class ProfileBuilder {
        private final Map<DRIF_BONUS_TYPE, Integer> priorities = new LinkedHashMap<>();
        private final Map<DRIF_BONUS_TYPE, OptimizationRequest.QuantityRange> quantities =
                new EnumMap<>(DRIF_BONUS_TYPE.class);
        private final Map<DRIF_BONUS_TYPE, Integer> preferredQuantities =
                new EnumMap<>(DRIF_BONUS_TYPE.class);
        private final Set<DRIF_BONUS_TYPE> forcedCaps = new LinkedHashSet<>();
        private final Map<DRIF_BONUS_TYPE, Double> forcedTargets =
                new EnumMap<>(DRIF_BONUS_TYPE.class);
        private final Set<DRIF_BONUS_TYPE> maximized = new LinkedHashSet<>();

        private void maximize(DRIF_BONUS_TYPE type, int weight, int maximum) {
            add(type, weight, maximum);
            maximized.add(type);
        }

        private void exact(DRIF_BONUS_TYPE type, int weight, int quantity) {
            priorities.merge(type, weight, Math::max);
            quantities.put(type, new OptimizationRequest.QuantityRange(quantity, quantity));
        }

        private void forceTarget(DRIF_BONUS_TYPE type, int weight, double target) {
            forceTarget(type, weight, target, 12);
        }

        private void forceTarget(DRIF_BONUS_TYPE type, int weight, double target, int maximum) {
            add(type, weight, maximum);
            maximized.remove(type);
            forcedTargets.put(type, target);
        }

        private void add(DRIF_BONUS_TYPE type, int weight, int maximum) {
            priorities.merge(type, weight, Math::max);
            quantities.put(type, range(maximum));
        }

        private void preferQuantity(DRIF_BONUS_TYPE type, int quantity) {
            preferredQuantities.put(type, quantity);
        }
    }
}
