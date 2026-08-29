package pl.brokenranks.tool.broken_ranks_tool.optimization.engine.search.maximization;

import static pl.brokenranks.tool.broken_ranks_tool.optimization.engine.rules.DrifOptimizationMath.highestLevelForPower;
import static pl.brokenranks.tool.broken_ranks_tool.optimization.engine.rules.DrifOptimizationMath.usedPowerExcept;
import static pl.brokenranks.tool.broken_ranks_tool.optimization.engine.rules.OptimizationRequestConstraints.*;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Set;
import java.util.TreeSet;
import lombok.RequiredArgsConstructor;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_BONUS_TYPE;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.DrifTemplate;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model.*;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.search.evaluation.OptimizationStateEvaluation;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.search.placement.OptimizationPlacementOperations;

/** Maximizes user-selected bonuses through bounded additions and replacements. */
@RequiredArgsConstructor
public final class OptimizationSelectedBonusMaximizer {

    private final OptimizationPlacementOperations placementOperations;
    private final OptimizationStateEvaluation stateEvaluation;
    private final OptimizationMaximizationStateComparator stateComparator;

    public BuildState maximize(BuildState state, OptimizationContext context) {
        List<DRIF_BONUS_TYPE> maximizedTypes = maximizedTypes(context);
        boolean improved = true;
        while (improved && !context.maximizationSearchBudget().exhausted()) {
            BuildState bestState = bestImprovement(state, maximizedTypes, context);
            improved = !bestState.signature().equals(state.signature());
            if (improved) state = bestState;
        }
        return state;
    }

    private BuildState bestImprovement(
            BuildState state, List<DRIF_BONUS_TYPE> maximizedTypes, OptimizationContext context) {
        BuildState bestState = state;
        for (DRIF_BONUS_TYPE type : maximizedTypes) {
            Double target = maximizationTargetFor(type, context.request());
            if (target != null
                    && stateEvaluation.calculatedValue(state, type, context)
                            >= target - TARGET_TOLERANCE) continue;
            bestState = bestReplacementForType(state, bestState, type, maximizedTypes, context);
            if (context.maximizationSearchBudget().exhausted()) return state;
        }
        return bestState;
    }

    private BuildState bestReplacementForType(
            BuildState state,
            BuildState bestState,
            DRIF_BONUS_TYPE type,
            List<DRIF_BONUS_TYPE> maximizedTypes,
            OptimizationContext context) {
        for (List<SlotContext> slots : context.slotsByDrifBonus().values()) {
            for (SlotContext slot : slots) {
                if (!slot.optimizable() || placementOperations.isSlotLocked(slot, context))
                    continue;
                DrifTemplate candidate = candidateForType(slot, type);
                if (candidate == null) continue;
                bestState =
                        bestReplacementInSlot(
                                state, bestState, slot, candidate, maximizedTypes, context);
                if (context.maximizationSearchBudget().exhausted()) return state;
            }
        }
        return bestState;
    }

    private BuildState bestReplacementInSlot(
            BuildState state,
            BuildState bestState,
            SlotContext slot,
            DrifTemplate candidate,
            List<DRIF_BONUS_TYPE> maximizedTypes,
            OptimizationContext context) {
        List<Placement> placements = state.slots().get(slot.key());
        int placementLimit = Math.min(placements.size(), slot.maxDrifs());
        for (int index = 0; index < placementLimit; index++) {
            Placement replaced = placements.get(index);
            if (!canReplace(state, placements, slot, index, replaced, candidate, context)) continue;
            for (Integer level : fittingCandidateLevels(placements, slot, candidate, index)) {
                if (!context.maximizationSearchBudget().tryConsume()) return state;
                BuildState trial = state.copy();
                trial.setPlacement(slot.key(), index, new Placement(candidate, level, false));
                if (stateEvaluation.minimumsSatisfied(trial, context)
                        && stateComparator.isBetter(trial, bestState, context, maximizedTypes)) {
                    bestState = trial;
                }
            }
        }
        return bestState;
    }

    private boolean canReplace(
            BuildState state,
            List<Placement> placements,
            SlotContext slot,
            int index,
            Placement replaced,
            DrifTemplate candidate,
            OptimizationContext context) {
        DRIF_BONUS_TYPE type = candidate.getBonusType();
        if (slot.lockedIndices().contains(index)
                || (replaced != null && replaced.locked())
                || (replaced != null && replaced.drif().getBonusType() == type)
                || placementOperations.containsBonusExcept(placements, type, index)) return false;

        DRIF_BONUS_TYPE replacedType = replaced != null ? replaced.drif().getBonusType() : null;
        return stateEvaluation.globalCountExcept(state, type, replacedType, context)
                        < maxQuantity(type, context.request())
                && !placementOperations.containsAnotherElemental(
                        state, candidate, replaced != null ? replaced.drif() : null);
    }

    private DrifTemplate candidateForType(SlotContext slot, DRIF_BONUS_TYPE type) {
        return slot.candidates().stream()
                .filter(drif -> drif.getBonusType() == type)
                .findFirst()
                .orElse(null);
    }

    private List<Integer> fittingCandidateLevels(
            List<Placement> placements,
            SlotContext slot,
            DrifTemplate candidate,
            int replacedIndex) {
        int availablePower = slot.capacity() - usedPowerExcept(placements, replacedIndex);
        if (availablePower < candidate.getBonusType().getBasePower()) return List.of();

        int highest = highestLevelForPower(candidate, availablePower);
        Set<Integer> levels = new TreeSet<>(Comparator.reverseOrder());
        levels.add(highest);
        for (int level : List.of(6, 11, 16, 21)) {
            if (level <= highest && level <= candidate.getSize().getMaxLevel()) levels.add(level);
        }
        return new ArrayList<>(levels);
    }

    private List<DRIF_BONUS_TYPE> maximizedTypes(OptimizationContext context) {
        return context.request().getPriorities().keySet().stream()
                .filter(type -> isMaximized(type, context.request()))
                .sorted(
                        Comparator.comparing(
                                        (DRIF_BONUS_TYPE type) ->
                                                stateEvaluation.priorityOf(type, context.request()),
                                        Comparator.reverseOrder())
                                .thenComparing(Enum::name))
                .toList();
    }
}
