package pl.brokenranks.tool.broken_ranks_tool.optimization.engine.validation;

import static pl.brokenranks.tool.broken_ranks_tool.optimization.engine.validation.OptimizationPreservedDrifs.preservedIndexes;
import static pl.brokenranks.tool.broken_ranks_tool.optimization.engine.validation.OptimizationPreservedDrifs.requestedLevel;

import java.util.List;
import java.util.Map;
import java.util.Set;
import lombok.experimental.UtilityClass;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_BONUS_TYPE;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.rules.DrifPowerRules;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.DrifTemplate;
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.OptimizationRequest;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model.OptimizationContext;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model.SlotContext;

/** Conservative quantity bounds, separate from catalog and placement validation. */
@UtilityClass
class OptimizationFeasibilityValidator {
    static String validate(OptimizationContext context) {
        if (context.request().getTargetQuantities() == null
                && context.request().getDrifSizeQuantities() == null) return null;
        Map<DRIF_BONUS_TYPE, Integer> missingMinimumsByType =
                new java.util.EnumMap<>(DRIF_BONUS_TYPE.class);
        Map<DRIF_BONUS_TYPE, Integer> missingSizeMinimumsByType =
                new java.util.EnumMap<>(DRIF_BONUS_TYPE.class);
        int totalFreeSockets = 0;
        for (SlotContext slot : context.slots()) {
            totalFreeSockets += availableSockets(slot, context);
        }
        String totalError = validateTotalBounds(context, missingMinimumsByType);
        if (totalError != null) return totalError;
        String sizeError = validateSizeBounds(context, missingSizeMinimumsByType);
        if (sizeError != null) return sizeError;
        int totalMissingMinimums =
                context.request().getPriorities().keySet().stream()
                        .mapToInt(
                                type ->
                                        Math.max(
                                                missingMinimumsByType.getOrDefault(type, 0),
                                                missingSizeMinimumsByType.getOrDefault(type, 0)))
                        .sum();
        if (totalMissingMinimums > totalFreeSockets) {
            return "Ustawione minima wymagają łącznie więcej gniazd, niż pozostaje dostępnych.";
        }
        return null;
    }

    private static int fixedCount(
            SlotContext slot, DRIF_BONUS_TYPE type, OptimizationContext context) {
        return fixedCount(slot, type, null, context);
    }

    private static int fixedCount(
            SlotContext slot,
            DRIF_BONUS_TYPE type,
            pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_SIZE size,
            OptimizationContext context) {
        if (size != null && slot.special()) return 0;
        List<Long> ids =
                slot.original().getDrifIds() != null ? slot.original().getDrifIds() : List.of();
        Set<Integer> fixed = preservedIndexes(slot.key(), slot.original(), slot, context.request());
        int count = 0;
        for (Integer index : fixed) {
            if (index == null || index < 0 || index >= ids.size()) continue;
            DrifTemplate drif = context.drifs().get(ids.get(index));
            if (drif != null
                    && drif.getBonusType() == type
                    && (size == null || drif.getSize() == size)) count++;
        }
        return count;
    }

    private static int availableSockets(SlotContext slot, OptimizationContext context) {
        if (slot.special()
                || context.request().getLockedSlots() != null
                        && context.request().getLockedSlots().contains(slot.key())) {
            return 0;
        }
        Set<Integer> fixed = preservedIndexes(slot.key(), slot.original(), slot, context.request());
        return Math.max(0, slot.maxDrifs() - fixed.size());
    }

    private static boolean canAdd(
            SlotContext slot, DRIF_BONUS_TYPE type, OptimizationContext context) {
        return canAdd(slot, type, null, context);
    }

    private static boolean canAdd(
            SlotContext slot,
            DRIF_BONUS_TYPE type,
            pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_SIZE size,
            OptimizationContext context) {
        if (availableSockets(slot, context) == 0) return false;
        DrifTemplate candidate =
                slot.candidates().stream()
                        .filter(drif -> drif.getBonusType() == type)
                        .filter(drif -> size == null || drif.getSize() == size)
                        .findFirst()
                        .orElse(null);
        if (candidate == null) return false;
        int usedPower = 0;
        List<Long> ids =
                slot.original().getDrifIds() != null ? slot.original().getDrifIds() : List.of();
        for (Integer index :
                preservedIndexes(slot.key(), slot.original(), slot, context.request())) {
            if (index == null || index < 0 || index >= ids.size()) continue;
            DrifTemplate fixed = context.drifs().get(ids.get(index));
            if (fixed != null) {
                usedPower +=
                        DrifPowerRules.power(
                                fixed.getBonusType().getBasePower(),
                                requestedLevel(slot.original(), index));
            }
        }
        return usedPower + candidate.getBonusType().getBasePower() <= slot.capacity();
    }

    private static String validateTotalBounds(
            OptimizationContext context, Map<DRIF_BONUS_TYPE, Integer> missingMinimumsByType) {
        for (var entry :
                context.request().getTargetQuantities() == null
                        ? Map.<DRIF_BONUS_TYPE, OptimizationRequest.QuantityRange>of().entrySet()
                        : context.request().getTargetQuantities().entrySet()) {
            int fixedCount = 0;
            int upperBound = 0;
            for (SlotContext slot : context.slots()) {
                int fixedInSlot = fixedCount(slot, entry.getKey(), context);
                fixedCount += fixedInSlot;
                upperBound += fixedInSlot;
                if (fixedInSlot == 0 && canAdd(slot, entry.getKey(), context)) {
                    upperBound++;
                }
            }
            if (fixedCount > entry.getValue().getMax()) {
                return "Zablokowane lub wbudowane drify typu "
                        + entry.getKey().getDescription()
                        + " przekraczają ustawione maksimum.";
            }
            if (entry.getValue().getMin() > upperBound) {
                return "Minimum dla "
                        + entry.getKey().getDescription()
                        + " jest fizycznie nieosiągalne na przekazanym ekwipunku.";
            }
            missingMinimumsByType.put(
                    entry.getKey(), Math.max(0, entry.getValue().getMin() - fixedCount));
        }
        return null;
    }

    private static String validateSizeBounds(
            OptimizationContext context, Map<DRIF_BONUS_TYPE, Integer> missingSizeMinimumsByType) {
        if (context.request().getDrifSizeQuantities() != null) {
            for (var bonusEntry : context.request().getDrifSizeQuantities().entrySet()) {
                for (var sizeEntry : bonusEntry.getValue().entrySet()) {
                    int fixed = 0;
                    int upperBound = 0;
                    for (SlotContext slot : context.slots()) {
                        int fixedInSlot =
                                fixedCount(slot, bonusEntry.getKey(), sizeEntry.getKey(), context);
                        fixed += fixedInSlot;
                        upperBound += fixedInSlot;
                        if (fixedInSlot == 0
                                && canAdd(slot, bonusEntry.getKey(), sizeEntry.getKey(), context))
                            upperBound++;
                    }
                    if (fixed > sizeEntry.getValue().getMax()) {
                        return "Zablokowane drify przekraczają maksimum rozmiaru "
                                + sizeEntry.getKey()
                                + " dla "
                                + bonusEntry.getKey().getDescription()
                                + ".";
                    }
                    if (sizeEntry.getValue().getMin() > upperBound) {
                        return "Minimum rozmiaru "
                                + sizeEntry.getKey()
                                + " dla "
                                + bonusEntry.getKey().getDescription()
                                + " jest fizycznie nieosiągalne.";
                    }
                    missingSizeMinimumsByType.merge(
                            bonusEntry.getKey(),
                            Math.max(0, sizeEntry.getValue().getMin() - fixed),
                            Integer::sum);
                }
            }
        }
        return null;
    }
}
