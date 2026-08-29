package pl.brokenranks.tool.broken_ranks_tool.optimization.engine.variant;

import java.util.EnumMap;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_BONUS_TYPE;
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.OptimizationRequest;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model.*;

/** Creates focused variant contexts and releases optimizer-owned prelocks. */
final class OptimizationVariantContextFactory {

    BuildState withoutOptimizerPrelocks(BuildState mainState, OptimizationContext context) {
        BuildState released = mainState.copy();
        Set<String> lockedSlots =
                context.request().getLockedSlots() != null
                        ? context.request().getLockedSlots()
                        : Set.of();
        for (SlotContext slot : context.slots()) {
            releaseSlotPrelocks(released, slot, lockedSlots);
        }
        return released;
    }

    OptimizationContext focusedContext(OptimizationContext source, DRIF_BONUS_TYPE focus) {
        OptimizationRequest request = copyRequest(source.request());
        request.setMaximizeBonuses(Set.of(focus));
        return new OptimizationContext(
                request,
                source.items(),
                source.drifs(),
                source.slots(),
                source.slotsByDrifBonus(),
                source.sortedPriorities(),
                source.sortedQuantities(),
                new SearchBudget(1),
                new SearchBudget(1),
                new SearchBudget(1),
                new EnumMap<>(source.calculatorBaseline()),
                new EnumMap<>(DRIF_BONUS_TYPE.class),
                source.calculatorCache(),
                new HashMap<>(),
                source.drifValueCache());
    }

    private void releaseSlotPrelocks(BuildState state, SlotContext slot, Set<String> lockedSlots) {
        List<Placement> placements = state.slots().get(slot.key());
        if (placements == null) return;
        for (int index = 0; index < placements.size(); index++) {
            Placement placement = placements.get(index);
            if (placement == null || !placement.locked()) continue;
            boolean userLocked =
                    lockedSlots.contains(slot.key()) || slot.lockedIndices().contains(index);
            if (!userLocked) {
                state.setPlacement(
                        slot.key(),
                        index,
                        new Placement(placement.drif(), placement.level(), false));
            }
        }
    }

    private OptimizationRequest copyRequest(OptimizationRequest source) {
        OptimizationRequest copy = new OptimizationRequest();
        copy.setOriginalSlots(source.getOriginalSlots());
        copy.setPriorities(source.getPriorities());
        copy.setTargetQuantities(source.getTargetQuantities());
        copy.setLockedSlots(source.getLockedSlots());
        copy.setLockedDrifs(source.getLockedDrifs());
        copy.setForceCapBonuses(source.getForceCapBonuses());
        copy.setForcedPercentageTargets(source.getForcedPercentageTargets());
        copy.setMaximizeBonuses(
                source.getMaximizeBonuses() != null
                        ? new LinkedHashSet<>(source.getMaximizeBonuses())
                        : Set.of());
        copy.setForceMaximizationByDrifBonus(source.isForceMaximizationByDrifBonus());
        copy.setGenerateVariants(source.isGenerateVariants());
        copy.setMaxVariantLossPercent(source.getMaxVariantLossPercent());
        return copy;
    }
}
