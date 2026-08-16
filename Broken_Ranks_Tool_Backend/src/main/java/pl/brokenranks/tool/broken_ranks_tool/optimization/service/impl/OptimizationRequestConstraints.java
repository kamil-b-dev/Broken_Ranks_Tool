package pl.brokenranks.tool.broken_ranks_tool.optimization.service.impl;

import lombok.experimental.UtilityClass;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_BONUS_TYPE;
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.OptimizationRequest;

import java.util.Map;

/** Normalizes and evaluates user-provided optimization constraints. */
@UtilityClass
class OptimizationRequestConstraints {

    static final int MAX_GLOBAL_DRIFS_PER_TYPE = 12;
    static final double TARGET_TOLERANCE = 0.50;

    static boolean isForcedCap(DRIF_BONUS_TYPE type, OptimizationRequest request) {
        return request.getForceCapBonuses() != null && request.getForceCapBonuses().contains(type);
    }

    static boolean isMaximized(DRIF_BONUS_TYPE type, OptimizationRequest request) {
        return request.getMaximizeBonuses() != null && request.getMaximizeBonuses().contains(type);
    }

    static int maxQuantity(DRIF_BONUS_TYPE type, OptimizationRequest request) {
        OptimizationRequest.QuantityRange range = safeQuantities(request).get(type);
        return range != null ? clampQuantity(range.getMax()) : MAX_GLOBAL_DRIFS_PER_TYPE;
    }

    static Map<DRIF_BONUS_TYPE, OptimizationRequest.QuantityRange> safeQuantities(
            OptimizationRequest request) {
        return request.getTargetQuantities() != null ? request.getTargetQuantities() : Map.of();
    }

    static Double targetFor(DRIF_BONUS_TYPE type, OptimizationRequest request) {
        if (isForcedCap(type, request) && type.getMaxCap() != null) {
            return (double) Math.abs(type.getMaxCap());
        }
        return null;
    }

    /**
     * Returns the natural upper bound for a maximized modifier when the game
     * defines one. Modifiers without a cap are maximized until another limit stops them.
     */
    static Double maximizationTargetFor(DRIF_BONUS_TYPE type, OptimizationRequest request) {
        if (isMaximized(type, request) && type.getMaxCap() != null) {
            return (double) Math.abs(type.getMaxCap());
        }
        return null;
    }

    static double directedValue(DRIF_BONUS_TYPE type, double value, OptimizationRequest request) {
        if ((isForcedCap(type, request) || isMaximized(type, request))
                && type.getMaxCap() != null && type.getMaxCap() < 0) {
            return -value;
        }
        return value;
    }

    static int clampQuantity(int value) {
        return Math.max(0, Math.min(MAX_GLOBAL_DRIFS_PER_TYPE, value));
    }

    static String validateQuantityRanges(OptimizationRequest request) {
        if (request.getTargetQuantities() == null) return null;
        for (Map.Entry<DRIF_BONUS_TYPE, OptimizationRequest.QuantityRange> entry
                : request.getTargetQuantities().entrySet()) {
            OptimizationRequest.QuantityRange range = entry.getValue();
            if (range == null || range.getMin() < 0 || range.getMax() > MAX_GLOBAL_DRIFS_PER_TYPE
                    || range.getMin() > range.getMax()) {
                return "Nieprawidłowy zakres ilości dla " + entry.getKey().getDescription()
                        + ". Minimum i maksimum muszą mieścić się w zakresie 0–12, "
                        + "a minimum nie może przekraczać maksimum.";
            }
        }
        return null;
    }
}
