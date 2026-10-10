package pl.brokenranks.tool.broken_ranks_tool.optimization.engine.search.requirement;

import static pl.brokenranks.tool.broken_ranks_tool.optimization.engine.rules.DrifOptimizationMath.lowestTierFittingLevel;
import static pl.brokenranks.tool.broken_ranks_tool.optimization.engine.rules.OptimizationRequestConstraints.maxQuantity;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import lombok.RequiredArgsConstructor;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_BONUS_TYPE;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_SIZE;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.DrifTemplate;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model.*;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.rules.OptimizationDrifSizeConstraints;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.search.evaluation.OptimizationStateEvaluation;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.search.placement.OptimizationPlacementOperations;

/** Constructs hard minimums with deterministic, bounded backtracking over constrained slots. */
@RequiredArgsConstructor
final class MinimumRequirementSatisfier {
    private static final int MAX_SEARCH_STATES = 10_000;
    private final OptimizationPlacementOperations placements;
    private final OptimizationStateEvaluation evaluation;
    private final OptimizationRequirementSupport support;

    boolean satisfy(BuildState state, OptimizationContext context) {
        BuildState solution = search(state, context, new SearchBudget(MAX_SEARCH_STATES));
        if (solution == null) return false;
        solution.slots().forEach(state::putSlot);
        return true;
    }

    private BuildState search(BuildState state, OptimizationContext context, SearchBudget budget) {
        List<Requirement> missing = missingRequirements(state, context);
        if (missing.isEmpty()) return evaluation.minimumsSatisfied(state, context) ? state : null;
        List<Choice> selected = null;
        long fewestSlots = Long.MAX_VALUE;
        for (Requirement requirement : missing) {
            List<Choice> options = choices(state, requirement, context);
            long availableSlots =
                    options.stream().map(choice -> choice.slot().key()).distinct().count();
            if (availableSlots < requirement.missing()) return null;
            if (availableSlots < fewestSlots) {
                selected = options;
                fewestSlots = availableSlots;
            }
        }
        selected.sort(
                Comparator.comparingDouble(Choice::gain)
                        .reversed()
                        .thenComparing(choice -> choice.slot().key())
                        .thenComparing(choice -> choice.drif().getSize(), Comparator.reverseOrder())
                        .thenComparing(choice -> choice.drif().getId()));
        for (Choice choice : selected) {
            if (!budget.tryConsume()) return null;
            BuildState trial = state.copy();
            placements.putNextFree(
                    trial, choice.slot(), new Placement(choice.drif(), choice.level(), false));
            BuildState solution = search(trial, context, budget);
            if (solution != null) return solution;
        }
        return null;
    }

    private List<Requirement> missingRequirements(BuildState state, OptimizationContext context) {
        List<Requirement> missing = new ArrayList<>();
        if (context.request().getDrifSizeQuantities() != null) {
            context.request()
                    .getDrifSizeQuantities()
                    .forEach(
                            (type, sizes) ->
                                    sizes.forEach(
                                            (size, range) -> {
                                                int count =
                                                        range.getMin()
                                                                - evaluation.sizeCount(
                                                                        state, type, size, context);
                                                if (count > 0)
                                                    missing.add(new Requirement(type, size, count));
                                            }));
        }
        for (var entry : context.sortedQuantities()) {
            int count =
                    entry.getValue().getMin()
                            - evaluation.globalCount(state, entry.getKey(), context);
            if (count > 0) missing.add(new Requirement(entry.getKey(), null, count));
        }
        missing.sort(
                Comparator.comparing((Requirement requirement) -> requirement.type().name())
                        .thenComparingInt(
                                requirement ->
                                        requirement.size() == null
                                                ? Integer.MAX_VALUE
                                                : requirement.size().ordinal()));
        return missing;
    }

    private List<Choice> choices(
            BuildState state, Requirement requirement, OptimizationContext context) {
        List<Choice> choices = new ArrayList<>();
        for (SlotContext slot : context.slots()) {
            if (!support.canAdd(state, slot, context)) continue;
            List<Placement> current = state.slots().get(slot.key());
            for (DrifTemplate candidate : slot.candidates()) {
                if (candidate.getBonusType() != requirement.type()
                        || requirement.size() != null && candidate.getSize() != requirement.size()
                        || !allowed(state, current, candidate, context)) continue;
                Integer level = lowestTierFittingLevel(state, slot, candidate);
                if (level == null) continue;
                double contribution =
                        context.drifValueCache()
                                .computeIfAbsent(
                                        new DrifLevelKey(candidate.getId(), level),
                                        ignored ->
                                                pl.brokenranks.tool.broken_ranks_tool.optimization
                                                        .engine.rules.DrifOptimizationMath
                                                        .calculateDrifValue(candidate, level));
                double gain =
                        pl.brokenranks.tool.broken_ranks_tool.optimization.engine.rules
                                .OptimizationRequestConstraints.directedValue(
                                candidate.getBonusType(),
                                contribution * (1 + slot.drifBonus()),
                                context.request());
                choices.add(new Choice(slot, candidate, level, gain));
            }
        }
        return choices;
    }

    private boolean allowed(
            BuildState state,
            List<Placement> current,
            DrifTemplate candidate,
            OptimizationContext context) {
        DRIF_BONUS_TYPE type = candidate.getBonusType();
        return !placements.containsBonus(current, type)
                && evaluation.globalCount(state, type, context)
                        < maxQuantity(type, context.request())
                && evaluation.sizeCount(state, type, candidate.getSize(), context)
                        < OptimizationDrifSizeConstraints.maximum(
                                type, candidate.getSize(), context)
                && !placements.containsAnotherElemental(state, candidate, null);
    }

    private record Requirement(DRIF_BONUS_TYPE type, DRIF_SIZE size, int missing) {}

    private record Choice(SlotContext slot, DrifTemplate drif, int level, double gain) {}
}
