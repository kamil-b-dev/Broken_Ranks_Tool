package pl.brokenranks.tool.broken_ranks_tool.optimization.engine.search.neighborhood;

import static pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model.OptimizationSearchModel.*;
import static pl.brokenranks.tool.broken_ranks_tool.optimization.engine.rules.DrifOptimizationMath.fitsCapacity;
import static pl.brokenranks.tool.broken_ranks_tool.optimization.engine.rules.OptimizationRequestConstraints.maxQuantity;

import java.util.ArrayList;
import java.util.List;
import lombok.RequiredArgsConstructor;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_BONUS_TYPE;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.rules.EquipmentRulesRegistry;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.DrifTemplate;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.evaluation.OptimizationStateEvaluator;

/** Generates valid removal and replacement neighbors for one equipment slot. */
@RequiredArgsConstructor
final class OptimizationSlotNeighborGenerator {
    private final EquipmentRulesRegistry rules;
    private final OptimizationStateEvaluator stateEvaluator;
    private final OptimizationNeighborhoodSupport support;

    List<BuildState> generate(
            BuildState state,
            SlotContext slot,
            OptimizationContext context,
            OptimizationNeighborhoodSearchControl control) {
        List<BuildState> neighbors = new ArrayList<>();
        neighbors.add(state);
        if (!slot.optimizable() || support.isSlotLocked(slot, context)) return neighbors;

        List<Placement> placements = state.slots().get(slot.key());
        int placementLimit = Math.min(placements.size(), slot.maxDrifs());
        for (int index = 0; index < placementLimit && !control.exhausted(); index++) {
            Placement current = placements.get(index);
            if (!support.isMovable(current, slot, index)) continue;
            addRemoval(state, slot, index, current, context, control, neighbors);
            addReplacements(state, slot, index, current, placements, context, control, neighbors);
        }
        return neighbors;
    }

    private void addRemoval(
            BuildState state,
            SlotContext slot,
            int index,
            Placement current,
            OptimizationContext context,
            OptimizationNeighborhoodSearchControl control,
            List<BuildState> neighbors) {
        if (current == null || !control.tryConsume()) return;
        BuildState removed = state.copy();
        removed.setPlacement(slot.key(), index, null);
        if (stateEvaluator.minimumsSatisfied(removed, context)) neighbors.add(removed);
    }

    private void addReplacements(
            BuildState state,
            SlotContext slot,
            int index,
            Placement current,
            List<Placement> placements,
            OptimizationContext context,
            OptimizationNeighborhoodSearchControl control,
            List<BuildState> neighbors) {
        for (DrifTemplate candidate : slot.candidates()) {
            if (control.exhausted()) return;
            if (!isReplacementAllowed(state, placements, index, current, candidate, context))
                continue;
            for (Integer level : support.fittingLevels(placements, slot, candidate, index)) {
                if (!control.tryConsume()) return;
                if (samePlacement(current, candidate, level)) continue;
                BuildState trial = state.copy();
                trial.setPlacement(slot.key(), index, new Placement(candidate, level, false));
                if (fitsCapacity(trial.slots().get(slot.key()), slot)
                        && stateEvaluator.minimumsSatisfied(trial, context)) {
                    neighbors.add(trial);
                }
            }
        }
    }

    private boolean isReplacementAllowed(
            BuildState state,
            List<Placement> placements,
            int index,
            Placement current,
            DrifTemplate candidate,
            OptimizationContext context) {
        DRIF_BONUS_TYPE candidateType = candidate.getBonusType();
        DRIF_BONUS_TYPE replacedType = current != null ? current.drif().getBonusType() : null;
        return !support.containsBonusExcept(placements, candidateType, index)
                && stateEvaluator.globalCountExcept(state, candidateType, replacedType, context)
                        < maxQuantity(candidateType, context.request())
                && !containsAnotherElemental(state, candidate, current);
    }

    private boolean samePlacement(Placement current, DrifTemplate candidate, int level) {
        return current != null
                && current.drif().getId().equals(candidate.getId())
                && current.level() == level;
    }

    private boolean containsAnotherElemental(
            BuildState state, DrifTemplate candidate, Placement replaced) {
        if (!rules.isElementalDamage(candidate.getBonusType())) return false;
        for (List<Placement> placements : state.slots().values()) {
            for (Placement placement : placements) {
                if (placement != null
                        && placement != replaced
                        && rules.isElementalDamage(placement.drif().getBonusType())) return true;
            }
        }
        return false;
    }
}
