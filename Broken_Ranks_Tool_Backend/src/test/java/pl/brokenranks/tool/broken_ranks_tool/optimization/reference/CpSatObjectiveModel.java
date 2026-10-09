package pl.brokenranks.tool.broken_ranks_tool.optimization.reference;

import static pl.brokenranks.tool.broken_ranks_tool.optimization.engine.rules.DrifOptimizationMath.power;
import static pl.brokenranks.tool.broken_ranks_tool.optimization.engine.rules.OptimizationRequestConstraints.isMaximized;
import static pl.brokenranks.tool.broken_ranks_tool.optimization.engine.rules.OptimizationRequestConstraints.targetFor;
import static pl.brokenranks.tool.broken_ranks_tool.optimization.reference.CpSatModel.*;

import com.google.ortools.sat.BoolVar;
import com.google.ortools.sat.CpModel;
import com.google.ortools.sat.IntVar;
import com.google.ortools.sat.LinearArgument;
import com.google.ortools.sat.LinearExpr;
import com.google.ortools.sat.Literal;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_BONUS_TYPE;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.rules.EquipmentRulesRegistry;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.evaluation.OptimizationStateEvaluator;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model.BuildState;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model.OptimizationContext;
import pl.brokenranks.tool.broken_ranks_tool.optimization.reference.CpSatBuildOptimizationSolver.ObjectivePlan;

/** Builds objective expressions independently of search, proof and materialization. */
final class CpSatObjectiveModel {
    private final EquipmentRulesRegistry rules;
    private final OptimizationStateEvaluator evaluator;

    CpSatObjectiveModel(EquipmentRulesRegistry rules, OptimizationStateEvaluator evaluator) {
        this.rules = rules;
        this.evaluator = evaluator;
    }

    List<Objective> qualityObjectives(
            CpModel model,
            OptimizationContext context,
            BuildState fixed,
            List<Choice> choices,
            Map<DRIF_BONUS_TYPE, Integer> fixedCounts) {
        Map<DRIF_BONUS_TYPE, IntVar> values = new EnumMap<>(DRIF_BONUS_TYPE.class);
        Map<DRIF_BONUS_TYPE, IntVar> losses = new EnumMap<>(DRIF_BONUS_TYPE.class);
        for (DRIF_BONUS_TYPE type : context.request().getPriorities().keySet()) {
            values.put(
                    type,
                    penalizedValue(
                            model, context, fixed, choices, type, true, fixedCounts.get(type)));
            losses.put(
                    type, penaltyLoss(model, context, fixed, choices, type, fixedCounts.get(type)));
        }

        List<LinearArgument> deficits = new ArrayList<>();
        List<Long> deficitWeights = new ArrayList<>();
        List<LinearArgument> utilities = new ArrayList<>();
        List<Long> utilityWeights = new ArrayList<>();
        List<LinearArgument> excesses = new ArrayList<>();
        List<Long> excessWeights = new ArrayList<>();
        List<IntVar> maximizedProgresses = new ArrayList<>();
        List<Long> maximizedWeights = new ArrayList<>();
        for (var entry : context.request().getPriorities().entrySet()) {
            DRIF_BONUS_TYPE type = entry.getKey();
            long weight = Math.max(1, entry.getValue() == null ? 1 : entry.getValue());
            long baseline =
                    scaled(context.calculatorBaseline().getOrDefault(type, 0.0)) * PENALTY_SCALE;
            LinearArgument calculated = expr(List.of(values.get(type)), List.of(1L), baseline);
            Double forcedTarget = targetFor(type, context.request());
            long cap =
                    (forcedTarget != null
                                    ? scaled(forcedTarget)
                                    : type.getMaxCap() != null
                                            ? scaled(Math.abs(type.getMaxCap()))
                                            : VALUE_BOUND / PENALTY_SCALE)
                            * PENALTY_SCALE;
            IntVar positive = model.newIntVar(0, VALUE_BOUND, "positive_" + type);
            model.addMaxEquality(positive, new LinearArgument[] {calculated, model.newConstant(0)});
            if (isMaximized(type, context.request())) {
                long scale =
                        Math.max(1L, scaled(evaluator.maximizationScale(type, context)))
                                * PENALTY_SCALE;
                IntVar progress = model.newIntVar(0, MAX_PROGRESS, "maximized_progress_" + type);
                model.addLessOrEqual(
                        LinearExpr.term(progress, scale),
                        LinearExpr.term(positive, PROGRESS_SCALE));
                maximizedProgresses.add(progress);
                maximizedWeights.add(weight);
            }
            IntVar utility = model.newIntVar(0, cap, "utility_" + type);
            model.addMinEquality(utility, new LinearArgument[] {positive, model.newConstant(cap)});
            utilities.add(utility);
            utilityWeights.add(weight);
            if (forcedTarget != null) {
                IntVar deficit = model.newIntVar(0, VALUE_BOUND, "deficit_" + type);
                model.addMaxEquality(
                        deficit,
                        new LinearArgument[] {
                            expr(List.of(values.get(type)), List.of(-1L), cap - baseline),
                            model.newConstant(0)
                        });
                deficits.add(deficit);
                deficitWeights.add(weight);
            }
            if (forcedTarget != null || type.getMaxCap() != null) {
                IntVar excess = model.newIntVar(0, VALUE_BOUND, "excess_" + type);
                model.addMaxEquality(
                        excess,
                        new LinearArgument[] {
                            expr(List.of(values.get(type)), List.of(1L), baseline - cap),
                            model.newConstant(0)
                        });
                excesses.add(excess);
                excessWeights.add(weight);
            }
        }
        LinearArgument deficit = weighted(deficits, deficitWeights);
        IntVar minimumMaximizedProgress =
                model.newIntVar(0, MAX_PROGRESS, "minimum_maximized_progress");
        if (maximizedProgresses.isEmpty()) {
            model.addEquality(minimumMaximizedProgress, 0);
        } else {
            maximizedProgresses.forEach(
                    progress -> model.addLessOrEqual(minimumMaximizedProgress, progress));
        }
        LinearArgument maximizedUtility =
                weighted(new ArrayList<>(maximizedProgresses), maximizedWeights);
        LinearArgument utility = weighted(utilities, utilityWeights);
        LinearArgument loss = LinearExpr.sum(losses.values().toArray(LinearArgument[]::new));
        LinearArgument excess = weighted(excesses, excessWeights);
        List<Choice> regular = choices;
        LinearArgument usedPower =
                weighted(
                        regular,
                        choice -> power(choice.placement().drif(), choice.placement().level()));
        return List.of(
                new Objective(deficit, false),
                new Objective(minimumMaximizedProgress, true),
                new Objective(maximizedUtility, true),
                new Objective(utility, true),
                new Objective(loss, false),
                new Objective(excess, false),
                new Objective(usedPower, true));
    }

    List<Objective> plannedObjectives(
            CpModel model,
            OptimizationContext context,
            BuildState fixed,
            List<Choice> choices,
            ObjectivePlan plan,
            Map<DRIF_BONUS_TYPE, Integer> fixedCounts,
            int requiredObjectiveCount) {
        Map<DRIF_BONUS_TYPE, IntVar> calculatedValues = new EnumMap<>(DRIF_BONUS_TYPE.class);
        Set<DRIF_BONUS_TYPE> requiredTypes = new java.util.LinkedHashSet<>();
        requiredTypes.addAll(plan.minimumValues().keySet());
        requiredTypes.addAll(plan.primaryMaximizationOrder());
        plan.balancedCapGroups().forEach(requiredTypes::addAll);
        requiredTypes.addAll(plan.secondaryMaximizationOrder());
        for (DRIF_BONUS_TYPE type : requiredTypes) {
            IntVar value =
                    penalizedValue(
                            model, context, fixed, choices, type, true, fixedCounts.get(type));
            long baseline =
                    scaled(context.calculatorBaseline().getOrDefault(type, 0.0)) * PENALTY_SCALE;
            IntVar calculated = model.newIntVar(-VALUE_BOUND, VALUE_BOUND, "planned_value_" + type);
            model.addEquality(calculated, expr(List.of(value), List.of(1L), baseline));
            calculatedValues.put(type, calculated);
        }
        plan.minimumValues()
                .forEach(
                        (type, minimum) ->
                                model.addGreaterOrEqual(
                                        calculatedValues.get(type),
                                        scaled(minimum) * PENALTY_SCALE));

        List<Objective> result = new ArrayList<>();
        for (DRIF_BONUS_TYPE type : plan.primaryMaximizationOrder()) {
            if (result.size() >= requiredObjectiveCount) return result;
            result.add(new Objective(calculatedValues.get(type), true));
        }
        for (List<DRIF_BONUS_TYPE> group : plan.balancedCapGroups()) {
            if (result.size() >= requiredObjectiveCount) return result;
            addBalancedCapObjectives(
                    model, result, calculatedValues, group, requiredObjectiveCount);
        }
        for (DRIF_BONUS_TYPE type : plan.secondaryMaximizationOrder()) {
            if (result.size() >= requiredObjectiveCount) return result;
            result.add(new Objective(calculatedValues.get(type), true));
        }
        // An explicit plan is the complete lexicographic definition of optimum. Appending the
        // generic quality objectives here made a domain optimum depend on undocumented internal
        // tie-breakers and needlessly enlarged the proof.
        return result;
    }

    private void addBalancedCapObjectives(
            CpModel model,
            List<Objective> objectives,
            Map<DRIF_BONUS_TYPE, IntVar> calculatedValues,
            List<DRIF_BONUS_TYPE> group,
            int requiredObjectiveCount) {
        if (group.isEmpty())
            throw new IllegalArgumentException("Balanced cap group cannot be empty");
        long commonCap =
                group.stream()
                        .map(DRIF_BONUS_TYPE::getMaxCap)
                        .filter(Objects::nonNull)
                        .mapToLong(cap -> Math.abs((long) cap))
                        .reduce(1L, this::lcm);
        List<LinearArgument> progresses = new ArrayList<>();
        for (DRIF_BONUS_TYPE type : group) {
            Integer configuredCap = type.getMaxCap();
            if (configuredCap == null || configuredCap == 0) {
                throw new IllegalArgumentException(type + " needs a nonzero cap for balancing");
            }
            long cap = Math.abs(configuredCap.longValue());
            long scaledCap = scaled(cap) * PENALTY_SCALE;
            IntVar capped = model.newIntVar(0, scaledCap, "balanced_capped_" + type);
            model.addMinEquality(
                    capped,
                    new LinearArgument[] {
                        calculatedValues.get(type), model.newConstant(scaledCap)
                    });
            progresses.add(LinearExpr.term(capped, commonCap / cap));
        }
        long maximumProgress = scaled(commonCap) * PENALTY_SCALE;
        IntVar minimumProgress =
                model.newIntVar(0, maximumProgress, "balanced_minimum_" + objectives.size());
        progresses.forEach(progress -> model.addLessOrEqual(minimumProgress, progress));
        objectives.add(new Objective(minimumProgress, true, List.copyOf(progresses)));
        if (objectives.size() < requiredObjectiveCount) {
            objectives.add(
                    new Objective(LinearExpr.sum(progresses.toArray(LinearArgument[]::new)), true));
        }
    }

    private long lcm(long left, long right) {
        return left / gcd(left, right) * right;
    }

    private long gcd(long left, long right) {
        while (right != 0) {
            long remainder = left % right;
            left = right;
            right = remainder;
        }
        return left;
    }

    private IntVar penalizedValue(
            CpModel model,
            OptimizationContext context,
            BuildState fixed,
            List<Choice> choices,
            DRIF_BONUS_TYPE type,
            boolean includeSpecial,
            Integer fixedCount) {
        long fixedRaw = rawValue(fixed, context, type, includeSpecial);
        List<Choice> typed =
                choices.stream()
                        .filter(choice -> choice.placement().drif().getBonusType() == type)
                        .toList();
        IntVar raw =
                model.newIntVar(-VALUE_BOUND, VALUE_BOUND, "raw_" + type + "_" + includeSpecial);
        model.addEquality(
                raw,
                expr(
                        typed.stream()
                                .map(Choice::selected)
                                .map(LinearArgument.class::cast)
                                .toList(),
                        typed.stream().map(Choice::value).toList(),
                        fixedRaw));
        long fixedPlacementCount = count(fixed, context, type, includeSpecial);
        IntVar count = model.newIntVar(0, 12, "count_" + type + "_" + includeSpecial);
        model.addEquality(count, countExpression(model, choices, type, null, fixedPlacementCount));
        return penalize(model, raw, count, type + "_" + includeSpecial, false, fixedCount);
    }

    private IntVar penaltyLoss(
            CpModel model,
            OptimizationContext context,
            BuildState fixed,
            List<Choice> choices,
            DRIF_BONUS_TYPE type,
            Integer fixedCount) {
        long fixedRaw = rawValue(fixed, context, type, false);
        List<Choice> typed =
                choices.stream()
                        .filter(choice -> choice.placement().drif().getBonusType() == type)
                        .toList();
        IntVar raw = model.newIntVar(-VALUE_BOUND, VALUE_BOUND, "loss_raw_" + type);
        model.addEquality(
                raw,
                expr(
                        typed.stream()
                                .map(Choice::selected)
                                .map(LinearArgument.class::cast)
                                .toList(),
                        typed.stream().map(Choice::value).toList(),
                        fixedRaw));
        IntVar absolute = model.newIntVar(0, VALUE_BOUND, "abs_" + type);
        model.addAbsEquality(absolute, raw);
        IntVar count = model.newIntVar(0, 12, "loss_count_" + type);
        model.addEquality(
                count,
                countExpression(model, choices, type, null, count(fixed, context, type, false)));
        return penalize(model, absolute, count, "loss_" + type, true, fixedCount);
    }

    private IntVar penalize(
            CpModel model,
            IntVar raw,
            IntVar count,
            String name,
            boolean loss,
            Integer fixedCount) {
        List<BoolVar> countCases = new ArrayList<>();
        IntVar result =
                model.newIntVar(
                        -VALUE_BOUND * PENALTY_SCALE,
                        VALUE_BOUND * PENALTY_SCALE,
                        name + "_result");
        if (fixedCount != null) {
            long penalty = Math.round(rules.getDrifPenalty(fixedCount) * PENALTY_SCALE);
            long factor = loss ? PENALTY_SCALE - penalty : penalty;
            model.addEquality(count, fixedCount);
            model.addEquality(result, LinearExpr.term(raw, factor));
            return result;
        }
        for (int amount = 0; amount <= 12; amount++) {
            BoolVar active = model.newBoolVar(name + "_is_" + amount);
            countCases.add(active);
            long penalty = Math.round(rules.getDrifPenalty(amount) * PENALTY_SCALE);
            long factor = loss ? PENALTY_SCALE - penalty : penalty;
            model.addEquality(result, LinearExpr.term(raw, factor)).onlyEnforceIf(active);
        }
        model.addExactlyOne(countCases.toArray(Literal[]::new));
        model.addEquality(
                count,
                weighted(
                        new ArrayList<>(countCases),
                        java.util.stream.LongStream.rangeClosed(0, 12).boxed().toList()));
        return result;
    }
}
