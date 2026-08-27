package pl.brokenranks.tool.broken_ranks_tool.optimization.engine.rules;

import java.util.Map;
import lombok.experimental.UtilityClass;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_BONUS_TYPE;
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.OptimizationRequest;

/** Normalizes and evaluates user-provided optimization constraints. */
@UtilityClass
public class OptimizationRequestConstraints {

    public static final int MAX_GLOBAL_DRIFS_PER_TYPE = 12;
    public static final double TARGET_TOLERANCE = 0.50;

    public static boolean isForcedCap(DRIF_BONUS_TYPE type, OptimizationRequest request) {
        return request.getForceCapBonuses() != null && request.getForceCapBonuses().contains(type);
    }

    public static boolean isForcedTarget(DRIF_BONUS_TYPE type, OptimizationRequest request) {
        return isForcedCap(type, request)
                || request.getForcedPercentageTargets() != null
                        && request.getForcedPercentageTargets().containsKey(type);
    }

    public static boolean isMaximized(DRIF_BONUS_TYPE type, OptimizationRequest request) {
        return request.getMaximizeBonuses() != null && request.getMaximizeBonuses().contains(type);
    }

    public static int maxQuantity(DRIF_BONUS_TYPE type, OptimizationRequest request) {
        OptimizationRequest.QuantityRange range = safeQuantities(request).get(type);
        return range != null ? clampQuantity(range.getMax()) : MAX_GLOBAL_DRIFS_PER_TYPE;
    }

    public static int minQuantity(DRIF_BONUS_TYPE type, OptimizationRequest request) {
        OptimizationRequest.QuantityRange range = safeQuantities(request).get(type);
        return range != null ? clampQuantity(range.getMin()) : 0;
    }

    public static Map<DRIF_BONUS_TYPE, OptimizationRequest.QuantityRange> safeQuantities(
            OptimizationRequest request) {
        return request.getTargetQuantities() != null ? request.getTargetQuantities() : Map.of();
    }

    public static Double targetFor(DRIF_BONUS_TYPE type, OptimizationRequest request) {
        if (request.getForcedPercentageTargets() != null) {
            Double target = request.getForcedPercentageTargets().get(type);
            if (target != null) return Math.abs(target);
        }
        if (isForcedCap(type, request) && type.getMaxCap() != null) {
            return (double) Math.abs(type.getMaxCap());
        }
        return null;
    }

    /**
     * Returns the natural upper bound for a maximized modifier when the game
     * defines one. Modifiers without a cap are maximized until another limit stops them.
     */
    public static Double maximizationTargetFor(DRIF_BONUS_TYPE type, OptimizationRequest request) {
        if (isMaximized(type, request) && type.getMaxCap() != null) {
            return (double) Math.abs(type.getMaxCap());
        }
        return null;
    }

    public static double directedValue(
            DRIF_BONUS_TYPE type, double value, OptimizationRequest request) {
        if ((isForcedTarget(type, request) || isMaximized(type, request))
                && type.getMaxCap() != null
                && type.getMaxCap() < 0) {
            return -value;
        }
        return value;
    }

    public static int clampQuantity(int value) {
        return Math.max(0, Math.min(MAX_GLOBAL_DRIFS_PER_TYPE, value));
    }

    public static double maxVariantRelativeLoss(OptimizationRequest request) {
        Integer percent = request.getMaxVariantLossPercent();
        return (percent != null ? percent : 5) / 100.0;
    }
}
