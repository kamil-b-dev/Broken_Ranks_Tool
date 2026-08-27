package pl.brokenranks.tool.broken_ranks_tool.optimization.engine.search;

import static pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model.OptimizationSearchModel.*;

import java.util.Comparator;
import java.util.List;
import java.util.Objects;
import lombok.RequiredArgsConstructor;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_BONUS_TYPE;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.rules.EquipmentRulesRegistry;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.DrifTemplate;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.validator.EquipmentPlacementRules;
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.OptimizationRequest;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.evaluation.OptimizationStateEvaluator;

/** Provides shared queries and safe mutations for optimization build states. */
@RequiredArgsConstructor
public final class OptimizationStateOperations {

    private final EquipmentPlacementRules placementRules;
    private final EquipmentRulesRegistry rules;
    private final OptimizationStateEvaluator evaluator;

    public int priorityOf(DRIF_BONUS_TYPE type, OptimizationRequest request) {
        return request.getPriorities().getOrDefault(type, 0);
    }

    public boolean isSlotLocked(SlotContext slot, OptimizationContext context) {
        return isSlotLocked(slot, context.request());
    }

    public boolean isSlotLocked(SlotContext slot, OptimizationRequest request) {
        return request.getLockedSlots() != null && request.getLockedSlots().contains(slot.key());
    }

    public boolean isValidForSlot(DrifTemplate drif, SlotContext slot) {
        return placementRules.isValidDrifSizeForTier(drif, slot.item())
                && placementRules.isElementalDrifPositionValid(drif, slot.key());
    }

    public boolean containsAnotherElemental(
            BuildState state, DrifTemplate candidate, DrifTemplate replaced) {
        if (!rules.isElementalDamage(candidate.getBonusType())) return false;
        for (List<Placement> placements : state.slots().values()) {
            for (Placement placement : placements) {
                if (placement != null
                        && rules.isElementalDamage(placement.drif().getBonusType())
                        && (replaced == null
                                || placement.drif().getBonusType() != replaced.getBonusType())) {
                    return true;
                }
            }
        }
        return false;
    }

    public boolean containsBonus(List<Placement> placements, DRIF_BONUS_TYPE type) {
        return placements.stream()
                .filter(Objects::nonNull)
                .anyMatch(placement -> placement.drif().getBonusType() == type);
    }

    public boolean containsBonusExcept(
            List<Placement> placements, DRIF_BONUS_TYPE type, int ignoredIndex) {
        for (int index = 0; index < placements.size(); index++) {
            Placement placement = placements.get(index);
            if (index != ignoredIndex
                    && placement != null
                    && placement.drif().getBonusType() == type) {
                return true;
            }
        }
        return false;
    }

    public int globalCount(BuildState state, DRIF_BONUS_TYPE type, OptimizationContext context) {
        return evaluator.globalCount(state, type, context);
    }

    public int globalCountExcept(
            BuildState state,
            DRIF_BONUS_TYPE candidate,
            DRIF_BONUS_TYPE replaced,
            OptimizationContext context) {
        return evaluator.globalCountExcept(state, candidate, replaced, context);
    }

    public boolean minimumsSatisfied(BuildState state, OptimizationContext context) {
        return evaluator.minimumsSatisfied(state, context);
    }

    public boolean hasFreeDrifPosition(List<Placement> placements, SlotContext slot) {
        if (placements.size() < slot.maxDrifs()) return true;
        int placementLimit = Math.min(placements.size(), slot.maxDrifs());
        for (int index = 0; index < placementLimit; index++) {
            if (!slot.lockedIndices().contains(index) && placements.get(index) == null) {
                return true;
            }
        }
        return false;
    }

    public void putNextFree(BuildState state, SlotContext slot, Placement placement) {
        List<Placement> placements = state.slots().get(slot.key());
        int placementLimit = Math.min(placements.size(), Math.max(0, slot.maxDrifs()));
        for (int index = 0; index < placementLimit; index++) {
            if (!slot.lockedIndices().contains(index) && placements.get(index) == null) {
                state.setPlacement(slot.key(), index, placement);
                return;
            }
        }
    }

    public double calculatedValue(
            BuildState state, DRIF_BONUS_TYPE type, OptimizationContext context) {
        return evaluator.calculatedValue(state, type, context);
    }

    public double currentValue(
            BuildState state, DRIF_BONUS_TYPE type, OptimizationContext context) {
        return evaluator.currentValue(state, type, context);
    }

    public double score(BuildState state, OptimizationContext context) {
        return evaluator.score(state, context);
    }

    public boolean trySelectBetter(
            BuildState candidate, BuildState current, OptimizationContext context) {
        return context.refinementSearchBudget().tryConsume()
                && evaluator.isBetterState(candidate, current, context);
    }

    Comparator<BuildState> stateComparator(OptimizationContext context) {
        return evaluator.stateComparator(context);
    }

    public boolean refinementBudgetExhausted(OptimizationContext context) {
        return context.refinementSearchBudget().exhausted();
    }
}
