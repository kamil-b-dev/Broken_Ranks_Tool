package pl.brokenranks.tool.broken_ranks_tool.optimization.engine.context;

import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_BONUS_TYPE;
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.OptimizationRequest;

import java.util.Map;

import static pl.brokenranks.tool.broken_ranks_tool.optimization.engine.rules.OptimizationRequestConstraints.MAX_GLOBAL_DRIFS_PER_TYPE;
import static pl.brokenranks.tool.broken_ranks_tool.optimization.engine.rules.OptimizationRequestConstraints.isForcedCap;
import static pl.brokenranks.tool.broken_ranks_tool.optimization.engine.rules.OptimizationRequestConstraints.isMaximized;

/** Validates the optimizer API contract before search data is loaded. */
public final class OptimizationRequestValidator {

    private OptimizationRequestValidator() { }

    public static String validate(OptimizationRequest request) {
        if (request == null || request.getOriginalSlots() == null
                || request.getOriginalSlots().isEmpty()) {
            return "Brak konfiguracji do optymalizacji.";
        }
        if (request.getPriorities() == null || request.getPriorities().isEmpty()) {
            return "Wybierz przynajmniej jeden modyfikator i ustaw jego priorytet.";
        }
        return validateSettings(request);
    }

    static String validateSettings(OptimizationRequest request) {
        String variantError = validateVariantLoss(request);
        if (variantError != null) return variantError;
        String quantityError = validateTargetQuantities(request);
        if (quantityError != null) return quantityError;
        return validateForcedPercentageTargets(request);
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
        for (Map.Entry<DRIF_BONUS_TYPE, OptimizationRequest.QuantityRange> entry
                : request.getTargetQuantities().entrySet()) {
            OptimizationRequest.QuantityRange range = entry.getValue();
            if (range == null || range.getMin() < 0
                    || range.getMax() > MAX_GLOBAL_DRIFS_PER_TYPE
                    || range.getMin() > range.getMax()) {
                return "Nieprawidłowy zakres ilości dla " + entry.getKey().getDescription()
                        + ". Minimum i maksimum muszą mieścić się w zakresie 0–12, "
                        + "a minimum nie może przekraczać maksimum.";
            }
        }
        return null;
    }

    private static String validateForcedPercentageTargets(OptimizationRequest request) {
        if (request.getForcedPercentageTargets() == null) return null;
        for (Map.Entry<DRIF_BONUS_TYPE, Double> entry
                : request.getForcedPercentageTargets().entrySet()) {
            DRIF_BONUS_TYPE type = entry.getKey();
            Double target = entry.getValue();
            if (type == null || target == null || !Double.isFinite(target) || target < 0.0) {
                return "Wymuszony procent musi być nieujemną, skończoną liczbą.";
            }
            if (isForcedCap(type, request)) {
                return "Nie można jednocześnie wymusić capa i własnego procentu dla "
                        + type.getDescription() + ".";
            }
            if (isMaximized(type, request)) {
                return "Nie można jednocześnie maksymalizować moda i wymusić własnego procentu dla "
                        + type.getDescription() + ".";
            }
        }
        return null;
    }
}
