package pl.brokenranks.tool.broken_ranks_tool.optimization.reference;

import static pl.brokenranks.tool.broken_ranks_tool.optimization.engine.rules.DrifOptimizationMath.calculateDrifValue;
import static pl.brokenranks.tool.broken_ranks_tool.optimization.engine.rules.OptimizationRequestConstraints.directedValue;

import com.google.ortools.sat.BoolVar;
import com.google.ortools.sat.CpModel;
import com.google.ortools.sat.LinearArgument;
import com.google.ortools.sat.LinearExpr;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_BONUS_TYPE;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_SIZE;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model.BuildState;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model.OptimizationContext;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model.Placement;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model.SlotContext;

/** Integer model values and expressions shared by constraints and objectives. */
final class CpSatModel {
    private CpSatModel() {}

    static final long VALUE_SCALE = 100_000L;
    static final long PENALTY_SCALE = 100L;
    static final long PROGRESS_SCALE = 1_000_000L;
    static final long MAX_PROGRESS = PROGRESS_SCALE * 1_000L;
    static final long VALUE_BOUND = 10_000_000_000L;

    record Choice(SlotContext slot, Placement placement, BoolVar selected, long value) {}

    record Outcome(DRIF_BONUS_TYPE type, DRIF_SIZE size, int power, long value) {}

    record Objective(
            LinearArgument expression,
            boolean maximize,
            List<LinearArgument> directProofComponents) {
        Objective(LinearArgument expression, boolean maximize) {
            this(expression, maximize, List.of());
        }
    }

    static LinearArgument countExpression(
            CpModel model, List<Choice> choices, DRIF_BONUS_TYPE type, String slot) {
        List<LinearArgument> variables =
                choices.stream()
                        .filter(choice -> choice.slot().key().equals(slot))
                        .filter(choice -> choice.placement().drif().getBonusType() == type)
                        .map(Choice::selected)
                        .map(LinearArgument.class::cast)
                        .toList();
        return expr(variables, variables.stream().map(ignored -> 1L).toList(), 0);
    }

    static LinearArgument countExpression(
            CpModel model,
            List<Choice> choices,
            DRIF_BONUS_TYPE type,
            DRIF_SIZE size,
            long constant) {
        List<LinearArgument> variables =
                choices.stream()
                        .filter(choice -> choice.placement().drif().getBonusType() == type)
                        .filter(
                                choice ->
                                        size == null || choice.placement().drif().getSize() == size)
                        .map(Choice::selected)
                        .map(LinearArgument.class::cast)
                        .toList();
        return expr(variables, variables.stream().map(ignored -> 1L).toList(), constant);
    }

    static long count(
            BuildState state,
            OptimizationContext context,
            DRIF_BONUS_TYPE type,
            boolean includeSpecial) {
        long result = 0;
        for (SlotContext slot : context.slots()) {
            if (!includeSpecial && slot.special()) continue;
            result +=
                    state.slots().getOrDefault(slot.key(), List.of()).stream()
                            .filter(Objects::nonNull)
                            .filter(placement -> placement.drif().getBonusType() == type)
                            .count();
        }
        return result;
    }

    static long countBySize(
            BuildState state, OptimizationContext context, DRIF_BONUS_TYPE type, DRIF_SIZE size) {
        long result = 0;
        for (SlotContext slot : context.slots()) {
            if (slot.special()) continue;
            result +=
                    state.slots().getOrDefault(slot.key(), List.of()).stream()
                            .filter(Objects::nonNull)
                            .filter(
                                    placement ->
                                            placement.drif().getBonusType() == type
                                                    && placement.drif().getSize() == size)
                            .count();
        }
        return result;
    }

    static long rawValue(
            BuildState state,
            OptimizationContext context,
            DRIF_BONUS_TYPE type,
            boolean includeSpecial) {
        long result = 0;
        for (SlotContext slot : context.slots()) {
            if (!includeSpecial && slot.special()) continue;
            for (Placement placement : state.slots().getOrDefault(slot.key(), List.of())) {
                if (placement != null && placement.drif().getBonusType() == type) {
                    result +=
                            scaled(
                                    directedValue(
                                            type,
                                            calculateDrifValue(placement.drif(), placement.level())
                                                    * (1.0 + slot.drifBonus()),
                                            context.request()));
                }
            }
        }
        return result;
    }

    static LinearArgument sum(List<Choice> choices) {
        return LinearExpr.sum(
                choices.stream().map(Choice::selected).toArray(LinearArgument[]::new));
    }

    static LinearArgument weighted(
            List<Choice> choices, java.util.function.ToLongFunction<Choice> coefficient) {
        return LinearExpr.weightedSum(
                choices.stream().map(Choice::selected).toArray(LinearArgument[]::new),
                choices.stream().mapToLong(coefficient).toArray());
    }

    static LinearArgument weighted(
            List<? extends LinearArgument> variables, List<Long> coefficients) {
        return LinearExpr.weightedSum(
                variables.toArray(LinearArgument[]::new),
                coefficients.stream().mapToLong(Long::longValue).toArray());
    }

    static LinearArgument expr(
            List<? extends LinearArgument> variables, List<Long> coefficients, long constant) {
        List<LinearArgument> allVariables = new ArrayList<>(variables);
        List<Long> allCoefficients = new ArrayList<>(coefficients);
        if (constant != 0) {
            allVariables.add(LinearExpr.constant(1));
            allCoefficients.add(constant);
        }
        return weighted(allVariables, allCoefficients);
    }

    static long scaled(double value) {
        return Math.round(value * VALUE_SCALE);
    }
}
