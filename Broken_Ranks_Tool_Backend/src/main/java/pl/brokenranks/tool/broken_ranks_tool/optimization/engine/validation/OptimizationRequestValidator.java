package pl.brokenranks.tool.broken_ranks_tool.optimization.engine.validation;

import static pl.brokenranks.tool.broken_ranks_tool.optimization.engine.rules.OptimizationRequestConstraints.MAX_GLOBAL_DRIFS_PER_TYPE;
import static pl.brokenranks.tool.broken_ranks_tool.optimization.engine.rules.OptimizationRequestConstraints.isForcedCap;
import static pl.brokenranks.tool.broken_ranks_tool.optimization.engine.rules.OptimizationRequestConstraints.isMaximized;

import java.util.Map;
import java.util.Set;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_BONUS_TYPE;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_SIZE;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.STAT_TYPE;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.validator.EquipmentRequestValidator;
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.BuildConfigurationMode;
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.OptimizationRequest;

/** Validates the optimizer API contract before search data is loaded. */
public final class OptimizationRequestValidator {

    private OptimizationRequestValidator() {}

    public static String validate(OptimizationRequest request) {
        if (request == null
                || request.getOriginalSlots() == null
                || request.getOriginalSlots().isEmpty()) {
            return "Brak konfiguracji do optymalizacji.";
        }
        if (request.getPriorities() == null || request.getPriorities().isEmpty()) {
            return "Wybierz przynajmniej jeden modyfikator i ustaw jego priorytet.";
        }
        for (Map.Entry<DRIF_BONUS_TYPE, Integer> entry : request.getPriorities().entrySet()) {
            if (entry.getKey() == null
                    || entry.getValue() == null
                    || entry.getValue() < 1
                    || entry.getValue() > 30) {
                return "Priorytet modyfikatora musi mieścić się w zakresie 1–30.";
            }
        }
        if (request.getPriorities().size() > 32) return "Wybrano zbyt wiele priorytetów.";
        return validateSettings(request);
    }

    static String validateSettings(OptimizationRequest request) {
        String simpleError = validateSimpleMode(request);
        if (simpleError != null) return simpleError;
        String variantError = validateVariantLoss(request);
        if (variantError != null) return variantError;
        String quantityError = validateTargetQuantities(request);
        if (quantityError != null) return quantityError;
        String sizeQuantityError = validateDrifSizeQuantities(request);
        if (sizeQuantityError != null) return sizeQuantityError;
        String targetError = validateForcedPercentageTargets(request);
        if (targetError != null) return targetError;
        String selectionError = validateSelectedTypes(request);
        if (selectionError != null) return selectionError;
        return validateCharacterStats(request);
    }

    private static String validateSimpleMode(OptimizationRequest request) {
        if (request.getConfigurationMode() != BuildConfigurationMode.SIMPLE) return null;
        if (request.isForceMaximizationByDrifBonus()
                || request.isGenerateVariants()
                || request.getForcedPercentageTargets() != null
                        && !request.getForcedPercentageTargets().isEmpty()
                || request.getMaximizeBonuses() != null && !request.getMaximizeBonuses().isEmpty()
                || request.getDrifSizeQuantities() != null
                        && !request.getDrifSizeQuantities().isEmpty()) {
            return "Tryb prosty nie obsługuje ustawień zaawansowanych.";
        }
        if (request.getPriorities().values().stream().anyMatch(weight -> weight != 15)) {
            return "Tryb prosty używa jednakowej, automatycznej wagi modyfikatorów.";
        }
        if (request.getTargetQuantities() != null
                && request.getTargetQuantities().values().stream()
                        .anyMatch(
                                range ->
                                        range == null
                                                || range.getMin() != 0
                                                || range.getMax() != 12)) {
            return "Tryb prosty sam dobiera liczbę drifów.";
        }
        return null;
    }

    private static String validateDrifSizeQuantities(OptimizationRequest request) {
        if (request.getDrifSizeQuantities() == null || request.getDrifSizeQuantities().isEmpty()) {
            return null;
        }
        if (request.getConfigurationMode() != BuildConfigurationMode.ADVANCED) {
            return "Ograniczenia rozmiarów drifów są dostępne tylko w trybie zaawansowanym.";
        }
        for (var bonusEntry : request.getDrifSizeQuantities().entrySet()) {
            if (bonusEntry.getKey() == null || bonusEntry.getValue() == null) {
                return "Ograniczenie rozmiarów ma pusty typ modyfikatora.";
            }
            int minimumSum = 0;
            int maximumSum =
                    (DRIF_SIZE.values().length - bonusEntry.getValue().size())
                            * MAX_GLOBAL_DRIFS_PER_TYPE;
            for (Map.Entry<DRIF_SIZE, OptimizationRequest.QuantityRange> sizeEntry :
                    bonusEntry.getValue().entrySet()) {
                OptimizationRequest.QuantityRange range = sizeEntry.getValue();
                if (sizeEntry.getKey() == null
                        || range == null
                        || range.getMin() < 0
                        || range.getMax() > MAX_GLOBAL_DRIFS_PER_TYPE
                        || range.getMin() > range.getMax()) {
                    return "Nieprawidłowy zakres rozmiaru drifa dla "
                            + bonusEntry.getKey().getDescription()
                            + ".";
                }
                minimumSum += range.getMin();
                maximumSum += range.getMax();
            }
            OptimizationRequest.QuantityRange total =
                    request.getTargetQuantities() == null
                            ? null
                            : request.getTargetQuantities().get(bonusEntry.getKey());
            if (total != null && (minimumSum > total.getMax() || maximumSum < total.getMin())) {
                return "Zakresy rozmiarów są sprzeczne z łącznym limitem dla "
                        + bonusEntry.getKey().getDescription()
                        + ".";
            }
        }
        return null;
    }

    private static String validateVariantLoss(OptimizationRequest request) {
        Integer maxVariantLossPercent = request.getMaxVariantLossPercent();
        if (maxVariantLossPercent != null
                && (maxVariantLossPercent < 0 || maxVariantLossPercent > 100)) {
            return "Maksymalna dopuszczalna strata wariantu musi mieścić się w zakresie 0–100%.";
        }
        return null;
    }

    private static String validateTargetQuantities(OptimizationRequest request) {
        if (request.getTargetQuantities() == null) return null;
        for (Map.Entry<DRIF_BONUS_TYPE, OptimizationRequest.QuantityRange> entry :
                request.getTargetQuantities().entrySet()) {
            if (entry.getKey() == null) return "Zakres ilości ma pusty typ modyfikatora.";
            OptimizationRequest.QuantityRange range = entry.getValue();
            if (range == null
                    || range.getMin() < 0
                    || range.getMax() > MAX_GLOBAL_DRIFS_PER_TYPE
                    || range.getMin() > range.getMax()) {
                return "Nieprawidłowy zakres ilości dla "
                        + entry.getKey().getDescription()
                        + ". Minimum i maksimum muszą mieścić się w zakresie 0–12, "
                        + "a minimum nie może przekraczać maksimum.";
            }
        }
        return null;
    }

    private static String validateForcedPercentageTargets(OptimizationRequest request) {
        if (request.getForcedPercentageTargets() == null) return null;
        for (Map.Entry<DRIF_BONUS_TYPE, Double> entry :
                request.getForcedPercentageTargets().entrySet()) {
            DRIF_BONUS_TYPE type = entry.getKey();
            Double target = entry.getValue();
            if (type == null || target == null || !Double.isFinite(target) || target < 0.0) {
                return "Wymuszony procent musi być nieujemną, skończoną liczbą.";
            }
            if (isForcedCap(type, request)) {
                return "Nie można jednocześnie wymusić capa i własnego procentu dla "
                        + type.getDescription()
                        + ".";
            }
            if (isMaximized(type, request)) {
                return "Nie można jednocześnie maksymalizować moda i wymusić własnego procentu dla "
                        + type.getDescription()
                        + ".";
            }
        }
        return null;
    }

    private static String validateSelectedTypes(OptimizationRequest request) {
        if (request.getPriorities() == null) return null;
        Set<DRIF_BONUS_TYPE> priorities = request.getPriorities().keySet();
        String error =
                requirePriorities(request.getTargetQuantities(), priorities, "Zakres ilości");
        if (error != null) return error;
        error =
                requirePriorities(
                        request.getForcedPercentageTargets(), priorities, "Cel procentowy");
        if (error != null) return error;
        error = requirePriorities(request.getForceCapBonuses(), priorities, "Cel capa");
        if (error != null) return error;
        error = requirePriorities(request.getMaximizeBonuses(), priorities, "Maksymalizacja");
        if (error != null) return error;
        error = requirePriorities(request.getDrifSizeQuantities(), priorities, "Rozmiary drifów");
        if (error != null) return error;
        if (request.getForceCapBonuses() != null) {
            for (DRIF_BONUS_TYPE type : request.getForceCapBonuses()) {
                if (type == null || type.getMaxCap() == null) {
                    return "Nie można wymusić capa dla modyfikatora bez zdefiniowanego capa.";
                }
                if (request.getMaximizeBonuses() != null
                        && request.getMaximizeBonuses().contains(type)) {
                    return "Nie można jednocześnie wymusić capa i maksymalizować tego samego moda.";
                }
            }
        }
        return null;
    }

    private static String requirePriorities(
            Map<DRIF_BONUS_TYPE, ?> selected, Set<DRIF_BONUS_TYPE> priorities, String setting) {
        return selected == null ? null : requirePriorities(selected.keySet(), priorities, setting);
    }

    private static String requirePriorities(
            Set<DRIF_BONUS_TYPE> selected, Set<DRIF_BONUS_TYPE> priorities, String setting) {
        if (selected == null) return null;
        for (DRIF_BONUS_TYPE type : selected) {
            if (type == null || !priorities.contains(type)) {
                return setting + " wskazuje modyfikator, który nie jest priorytetem.";
            }
        }
        return null;
    }

    private static String validateCharacterStats(OptimizationRequest request) {
        if (request.getCharacterStats() == null) return null;
        for (Map.Entry<String, Integer> entry : request.getCharacterStats().entrySet()) {
            if (!STAT_TYPE.isValid(entry.getKey())
                    || entry.getValue() == null
                    || entry.getValue() < 0
                    || entry.getValue() > EquipmentRequestValidator.MAX_CHARACTER_STAT) {
                return "Nieprawidłowa statystyka postaci: " + entry.getKey() + ".";
            }
        }
        return null;
    }
}
