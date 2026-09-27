package pl.brokenranks.tool.broken_ranks_tool.optimization.reference;

import static pl.brokenranks.tool.broken_ranks_tool.optimization.engine.rules.DrifOptimizationMath.calculateDrifValue;
import static pl.brokenranks.tool.broken_ranks_tool.optimization.engine.rules.DrifOptimizationMath.power;
import static pl.brokenranks.tool.broken_ranks_tool.optimization.engine.rules.OptimizationRequestConstraints.isMaximized;
import static pl.brokenranks.tool.broken_ranks_tool.optimization.engine.rules.OptimizationRequestConstraints.targetFor;

import com.google.ortools.Loader;
import com.google.ortools.sat.BoolVar;
import com.google.ortools.sat.CpModel;
import com.google.ortools.sat.CpSolver;
import com.google.ortools.sat.CpSolverStatus;
import com.google.ortools.sat.IntVar;
import com.google.ortools.sat.LinearArgument;
import com.google.ortools.sat.LinearExpr;
import com.google.ortools.sat.Literal;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_BONUS_TYPE;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_SIZE;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.rules.EquipmentRulesRegistry;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.context.OptimizationInitialStateFactory;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.evaluation.OptimizationStateEvaluator;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model.BuildState;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model.OptimizationContext;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model.Placement;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model.SlotContext;

/** Development-only CP-SAT oracle for complete build-from-scratch configurations. */
public final class CpSatBuildOptimizationSolver {
    private static final long VALUE_SCALE = 100_000L;
    private static final long PENALTY_SCALE = 100L;
    private static final long PROGRESS_SCALE = 1_000_000L;
    private static final long MAX_PROGRESS = PROGRESS_SCALE * 1_000L;
    private static final long VALUE_BOUND = 10_000_000_000L;

    public enum Status {
        OPTIMAL,
        NO_BETTER_PROVEN,
        FEASIBLE,
        INFEASIBLE,
        TIME_LIMIT
    }

    public record Result(
            Status status,
            BuildState best,
            Duration elapsed,
            long branches,
            long conflicts,
            List<Long> objectiveValues,
            Double incumbentObjective,
            Double bestObjectiveBound) {
        public boolean optimumProven() {
            return status == Status.OPTIMAL || status == Status.NO_BETTER_PROVEN;
        }
    }

    public record ObjectivePlan(
            Map<DRIF_BONUS_TYPE, Double> minimumValues,
            List<DRIF_BONUS_TYPE> primaryMaximizationOrder,
            List<List<DRIF_BONUS_TYPE>> balancedCapGroups,
            List<DRIF_BONUS_TYPE> secondaryMaximizationOrder) {
        public ObjectivePlan(
                Map<DRIF_BONUS_TYPE, Double> minimumValues,
                List<DRIF_BONUS_TYPE> maximizationOrder) {
            this(minimumValues, maximizationOrder, List.of(), List.of());
        }

        public ObjectivePlan {
            minimumValues = Map.copyOf(minimumValues);
            primaryMaximizationOrder = List.copyOf(primaryMaximizationOrder);
            balancedCapGroups = balancedCapGroups.stream().map(List::copyOf).toList();
            secondaryMaximizationOrder = List.copyOf(secondaryMaximizationOrder);
        }
    }

    public record SizeCount(DRIF_BONUS_TYPE type, DRIF_SIZE size) {}

    public record SlotCount(DRIF_BONUS_TYPE type, String slot) {}

    private record Choice(SlotContext slot, Placement placement, BoolVar selected, long value) {}

    private record Outcome(DRIF_BONUS_TYPE type, DRIF_SIZE size, int power, long value) {}

    private record Objective(
            LinearArgument expression,
            boolean maximize,
            List<LinearArgument> directProofComponents) {
        private Objective(LinearArgument expression, boolean maximize) {
            this(expression, maximize, List.of());
        }
    }

    private final EquipmentRulesRegistry rules;
    private final OptimizationInitialStateFactory initialStates;
    private final OptimizationStateEvaluator evaluator;

    public CpSatBuildOptimizationSolver(
            EquipmentRulesRegistry rules,
            OptimizationInitialStateFactory initialStates,
            OptimizationStateEvaluator evaluator) {
        this.rules = rules;
        this.initialStates = initialStates;
        this.evaluator = evaluator;
    }

    public Result solve(OptimizationContext context, Duration limit, BuildState hint) {
        return solve(context, limit, hint, List.of(), Map.of());
    }

    public Result solve(
            OptimizationContext context,
            Duration limit,
            BuildState hint,
            ObjectivePlan objectivePlan) {
        return solve(context, limit, hint, objectivePlan, List.of());
    }

    public Result solve(
            OptimizationContext context,
            Duration limit,
            BuildState hint,
            ObjectivePlan objectivePlan,
            List<Long> provenObjectivePrefix) {
        return solve(
                context,
                limit,
                hint,
                provenObjectivePrefix,
                Map.of(),
                Integer.MAX_VALUE,
                null,
                null,
                objectivePlan,
                null,
                Map.of(),
                Map.of());
    }

    public Result solve(
            OptimizationContext context,
            Duration limit,
            BuildState hint,
            List<Long> provenObjectivePrefix) {
        return solve(context, limit, hint, provenObjectivePrefix, Map.of());
    }

    public Result solve(
            OptimizationContext context,
            Duration limit,
            BuildState hint,
            List<Long> provenObjectivePrefix,
            Map<DRIF_BONUS_TYPE, Integer> fixedCounts) {
        return solve(context, limit, hint, provenObjectivePrefix, fixedCounts, 7);
    }

    public Result solve(
            OptimizationContext context,
            Duration limit,
            BuildState hint,
            List<Long> provenObjectivePrefix,
            Map<DRIF_BONUS_TYPE, Integer> fixedCounts,
            int objectiveLimit) {
        return solve(
                context,
                limit,
                hint,
                provenObjectivePrefix,
                fixedCounts,
                objectiveLimit,
                null,
                null,
                null,
                null,
                Map.of(),
                Map.of());
    }

    public Result proveNoBetter(
            OptimizationContext context,
            Duration limit,
            BuildState hint,
            List<Long> provenObjectivePrefix,
            int objectiveIndex,
            long incumbent) {
        return solve(
                context,
                limit,
                hint,
                provenObjectivePrefix,
                Map.of(),
                7,
                objectiveIndex,
                incumbent,
                null,
                null,
                Map.of(),
                Map.of());
    }

    public Result proveNoBetter(
            OptimizationContext context,
            Duration limit,
            BuildState hint,
            List<Long> provenObjectivePrefix,
            int objectiveIndex,
            long incumbent,
            ObjectivePlan objectivePlan) {
        return solve(
                context,
                limit,
                hint,
                provenObjectivePrefix,
                Map.of(),
                Integer.MAX_VALUE,
                objectiveIndex,
                incumbent,
                objectivePlan,
                null,
                Map.of(),
                Map.of());
    }

    /**
     * Returns every global count that can still exceed the supplied final value under a relaxed
     * model. The relaxation gives the type its best outcome in each slot and ignores competition
     * from all other drifs, so removing a count here is safe for an exhaustive proof.
     */
    public List<Integer> countsWithUpperBoundAbove(
            OptimizationContext context, DRIF_BONUS_TYPE type, double value) {
        BuildState fixed = initialStates.create(context);
        int fixedCount = Math.toIntExact(count(fixed, context, type, true));
        long fixedRaw = rawValue(fixed, context, type, true);
        List<Long> bestSlotValues = new ArrayList<>();
        for (SlotContext slot : context.slots()) {
            if (!slot.optimizable() || slot.special() || wholeSlotLocked(slot, context)) continue;
            boolean alreadyFixed =
                    fixed.slots().getOrDefault(slot.key(), List.of()).stream()
                            .filter(Objects::nonNull)
                            .anyMatch(placement -> placement.drif().getBonusType() == type);
            if (alreadyFixed) continue;
            long best =
                    slot.candidates().stream()
                            .filter(drif -> drif.getBonusType() == type)
                            .flatMapToLong(
                                    drif ->
                                            DRIF_SIZE.meaningfulLevels().stream()
                                                    .filter(
                                                            level ->
                                                                    level
                                                                            <= drif.getSize()
                                                                                    .getMaxLevel())
                                                    .filter(
                                                            level ->
                                                                    power(drif, level)
                                                                            <= slot.capacity())
                                                    .mapToLong(
                                                            level ->
                                                                    scaled(
                                                                            calculateDrifValue(
                                                                                            drif,
                                                                                            level)
                                                                                    * (1.0
                                                                                            + slot
                                                                                                    .drifBonus()))))
                            .max()
                            .orElse(Long.MIN_VALUE);
            if (best != Long.MIN_VALUE) bestSlotValues.add(best);
        }
        bestSlotValues.sort(Comparator.reverseOrder());

        var range = context.request().getTargetQuantities().get(type);
        int minimum = range == null ? 0 : range.getMin();
        int maximum = range == null ? 12 : range.getMax();
        long threshold = scaled(value) * PENALTY_SCALE;
        long baseline =
                scaled(context.calculatorBaseline().getOrDefault(type, 0.0)) * PENALTY_SCALE;
        List<Integer> result = new ArrayList<>();
        for (int amount = Math.max(minimum, fixedCount);
                amount <= Math.min(maximum, fixedCount + bestSlotValues.size());
                amount++) {
            int selected = amount - fixedCount;
            long relaxedRaw = fixedRaw;
            for (int index = 0; index < selected; index++) relaxedRaw += bestSlotValues.get(index);
            long factor = Math.round(rules.getDrifPenalty(amount) * PENALTY_SCALE);
            if (baseline + relaxedRaw * factor > threshold) result.add(amount);
        }
        return List.copyOf(result);
    }

    /** Evaluates a concrete build with the exact same integer expressions used by the oracle. */
    public List<Long> objectiveValues(
            OptimizationContext context, BuildState state, ObjectivePlan objectivePlan) {
        Loader.loadNativeLibraries();
        CpModel model = new CpModel();
        BuildState fixed = initialStates.create(context);
        Map<DRIF_BONUS_TYPE, Integer> fixedCounts = resolvedFixedCounts(context, Map.of());
        List<Choice> choices = createChoices(model, context, fixed, false);
        addSlotConstraints(model, context, fixed, choices);
        addQuantityConstraints(model, context, fixed, choices);
        addFixedCounts(model, context, fixed, choices, fixedCounts);
        addElementalConstraint(model, fixed, choices);
        for (Choice choice : choices) {
            boolean selected =
                    state.slots().getOrDefault(choice.slot().key(), List.of()).stream()
                            .filter(Objects::nonNull)
                            .anyMatch(placement -> sameOutcome(placement, choice.placement()));
            model.addEquality(choice.selected(), selected ? 1 : 0);
        }
        List<Objective> objectives =
                plannedObjectives(
                        model,
                        context,
                        fixed,
                        choices,
                        objectivePlan,
                        fixedCounts,
                        Integer.MAX_VALUE);
        CpSolver solver = new CpSolver();
        List<Long> result = new ArrayList<>();
        for (Objective objective : objectives) {
            model.clearObjective();
            if (objective.maximize()) model.maximize(objective.expression());
            else model.minimize(objective.expression());
            if (solver.solve(model) != CpSolverStatus.OPTIMAL) {
                throw new IllegalArgumentException("Build cannot be evaluated by the oracle model");
            }
            long value = solver.value(objective.expression());
            result.add(value);
            model.addEquality(objective.expression(), value);
        }
        return List.copyOf(result);
    }

    public Result proveNoBetter(
            OptimizationContext context,
            Duration limit,
            BuildState hint,
            List<Long> provenObjectivePrefix,
            Map<DRIF_BONUS_TYPE, Integer> fixedCounts,
            int objectiveIndex,
            long incumbent,
            ObjectivePlan objectivePlan) {
        return proveNoBetter(
                context,
                limit,
                hint,
                provenObjectivePrefix,
                fixedCounts,
                null,
                objectiveIndex,
                incumbent,
                objectivePlan);
    }

    public Result proveNoBetter(
            OptimizationContext context,
            Duration limit,
            BuildState hint,
            List<Long> provenObjectivePrefix,
            Map<DRIF_BONUS_TYPE, Integer> fixedCounts,
            Integer fixedTotalCount,
            int objectiveIndex,
            long incumbent,
            ObjectivePlan objectivePlan) {
        return solve(
                context,
                limit,
                hint,
                provenObjectivePrefix,
                fixedCounts,
                Integer.MAX_VALUE,
                objectiveIndex,
                incumbent,
                objectivePlan,
                fixedTotalCount,
                Map.of(),
                Map.of());
    }

    public Result proveNoBetter(
            OptimizationContext context,
            Duration limit,
            BuildState hint,
            List<Long> provenObjectivePrefix,
            Map<DRIF_BONUS_TYPE, Integer> fixedCounts,
            Map<SizeCount, Integer> fixedSizeCounts,
            Map<SlotCount, Integer> fixedSlotCounts,
            Integer fixedTotalCount,
            int objectiveIndex,
            long incumbent,
            ObjectivePlan objectivePlan) {
        return solve(
                context,
                limit,
                hint,
                provenObjectivePrefix,
                fixedCounts,
                Integer.MAX_VALUE,
                objectiveIndex,
                incumbent,
                objectivePlan,
                fixedTotalCount,
                fixedSizeCounts,
                fixedSlotCounts);
    }

    private Result solve(
            OptimizationContext context,
            Duration limit,
            BuildState hint,
            List<Long> provenObjectivePrefix,
            Map<DRIF_BONUS_TYPE, Integer> fixedCounts,
            int objectiveLimit,
            Integer proofObjectiveIndex,
            Long proofIncumbent,
            ObjectivePlan objectivePlan,
            Integer fixedTotalCount,
            Map<SizeCount, Integer> fixedSizeCounts,
            Map<SlotCount, Integer> fixedSlotCounts) {
        Loader.loadNativeLibraries();
        long started = System.nanoTime();
        long deadline = started + limit.toNanos();
        CpModel model = new CpModel();
        BuildState fixed = initialStates.create(context);
        Map<DRIF_BONUS_TYPE, Integer> resolvedFixedCounts =
                resolvedFixedCounts(context, fixedCounts);
        List<Choice> choices = createChoices(model, context, fixed, proofObjectiveIndex != null);
        addSlotConstraints(model, context, fixed, choices);
        addEquivalentSlotSymmetryBreaking(model, context, fixed, choices);
        addQuantityConstraints(model, context, fixed, choices);
        addFixedCounts(model, context, fixed, choices, resolvedFixedCounts);
        fixedSizeCounts.forEach(
                (key, amount) ->
                        model.addEquality(
                                countExpression(model, choices, key.type(), key.size(), 0),
                                amount));
        fixedSlotCounts.forEach(
                (key, amount) ->
                        model.addEquality(
                                countExpression(model, choices, key.type(), key.slot()), amount));
        addFixedTotalCount(model, context, fixed, choices, fixedTotalCount);
        addElementalConstraint(model, fixed, choices);
        addHints(model, hint, choices);
        int requiredObjectiveCount =
                proofObjectiveIndex == null ? objectiveLimit : proofObjectiveIndex + 1;
        List<Objective> objectives =
                objectivePlan == null
                        ? qualityObjectives(model, context, fixed, choices, resolvedFixedCounts)
                        : plannedObjectives(
                                model,
                                context,
                                fixed,
                                choices,
                                objectivePlan,
                                resolvedFixedCounts,
                                requiredObjectiveCount);
        if (provenObjectivePrefix.size() > objectives.size()) {
            throw new IllegalArgumentException(
                    "Proven objective prefix is longer than the objective plan");
        }
        String validationError = model.validate();
        if (!validationError.isBlank()) {
            throw new IllegalStateException("Invalid CP-SAT model: " + validationError);
        }

        CpSolver solver = new CpSolver();
        List<Long> objectiveValues = new ArrayList<>(provenObjectivePrefix);
        for (int index = 0; index < provenObjectivePrefix.size(); index++) {
            model.addEquality(objectives.get(index).expression(), provenObjectivePrefix.get(index));
        }
        BuildState lastBest = hint;
        if (proofObjectiveIndex != null) {
            Objective proof = objectives.get(proofObjectiveIndex);
            if (proof.maximize()) {
                if (proof.directProofComponents().isEmpty()) {
                    model.addGreaterThan(proof.expression(), proofIncumbent);
                } else {
                    proof.directProofComponents()
                            .forEach(component -> model.addGreaterThan(component, proofIncumbent));
                }
            } else {
                model.addLessThan(proof.expression(), proofIncumbent);
            }
            solver.getParameters()
                    .setMaxTimeInSeconds(limit.toNanos() / 1_000_000_000.0)
                    .setNumSearchWorkers(8);
            CpSolverStatus proofStatus = solver.solve(model);
            if (proofStatus == CpSolverStatus.INFEASIBLE) {
                List<Long> proven = new ArrayList<>(provenObjectivePrefix);
                proven.add(proofIncumbent);
                return result(Status.NO_BETTER_PROVEN, hint, started, solver, proven);
            }
            BuildState counterexample =
                    proofStatus == CpSolverStatus.FEASIBLE || proofStatus == CpSolverStatus.OPTIMAL
                            ? materialize(context, fixed, choices, solver)
                            : null;
            if (counterexample != null && !evaluator.minimumsSatisfied(counterexample, context)) {
                throw new IllegalStateException("CP-SAT counterexample violated hard quantities");
            }
            return result(
                    counterexample != null ? Status.FEASIBLE : Status.TIME_LIMIT,
                    counterexample != null ? counterexample : hint,
                    started,
                    solver,
                    provenObjectivePrefix);
        }
        CpSolverStatus last = null;
        int resolvedObjectiveLimit = Math.min(objectives.size(), Math.max(1, objectiveLimit));
        for (int objectiveIndex = provenObjectivePrefix.size();
                objectiveIndex < resolvedObjectiveLimit;
                objectiveIndex++) {
            Objective objective = objectives.get(objectiveIndex);
            double seconds = Math.max(0.001, (deadline - System.nanoTime()) / 1_000_000_000.0);
            if (seconds <= 0.001) {
                return result(Status.TIME_LIMIT, lastBest, started, solver, objectiveValues);
            }
            solver.getParameters().setMaxTimeInSeconds(seconds).setNumSearchWorkers(8);
            model.clearObjective();
            if (objective.maximize()) model.maximize(objective.expression());
            else model.minimize(objective.expression());
            last = solver.solve(model);
            if (last == CpSolverStatus.INFEASIBLE) {
                return result(Status.INFEASIBLE, null, started, solver, objectiveValues);
            }
            if (last != CpSolverStatus.OPTIMAL) {
                BuildState best =
                        last == CpSolverStatus.FEASIBLE
                                ? materialize(context, fixed, choices, solver)
                                : null;
                if (best != null && !evaluator.minimumsSatisfied(best, context)) best = null;
                List<Long> reportedObjectives = new ArrayList<>(objectiveValues);
                if (best != null) reportedObjectives.add(solver.value(objective.expression()));
                return result(
                        last == CpSolverStatus.FEASIBLE && best != null
                                ? Status.FEASIBLE
                                : Status.TIME_LIMIT,
                        best != null ? best : lastBest,
                        started,
                        solver,
                        reportedObjectives);
            }
            long optimum = solver.value(objective.expression());
            objectiveValues.add(optimum);
            lastBest = materialize(context, fixed, choices, solver);
            if (!evaluator.minimumsSatisfied(lastBest, context)) {
                throw new IllegalStateException("CP-SAT materialization violated hard quantities");
            }
            model.addEquality(objective.expression(), optimum);
        }
        BuildState best = lastBest;
        if (!evaluator.minimumsSatisfied(best, context)) {
            throw new IllegalStateException("CP-SAT returned a state violating hard quantities");
        }
        return result(Status.OPTIMAL, best, started, solver, objectiveValues);
    }

    private void addFixedCounts(
            CpModel model,
            OptimizationContext context,
            BuildState fixed,
            List<Choice> choices,
            Map<DRIF_BONUS_TYPE, Integer> fixedCounts) {
        fixedCounts.forEach(
                (type, amount) ->
                        model.addEquality(
                                countExpression(
                                        model,
                                        choices,
                                        type,
                                        null,
                                        count(fixed, context, type, true)),
                                amount));
    }

    private void addFixedTotalCount(
            CpModel model,
            OptimizationContext context,
            BuildState fixed,
            List<Choice> choices,
            Integer fixedTotalCount) {
        if (fixedTotalCount == null) return;
        long fixedRegularCount =
                context.slots().stream()
                        .filter(slot -> !slot.special())
                        .mapToLong(
                                slot ->
                                        fixed.slots().getOrDefault(slot.key(), List.of()).stream()
                                                .filter(Objects::nonNull)
                                                .count())
                        .sum();
        model.addEquality(sum(choices), fixedTotalCount - fixedRegularCount);
    }

    private Map<DRIF_BONUS_TYPE, Integer> resolvedFixedCounts(
            OptimizationContext context, Map<DRIF_BONUS_TYPE, Integer> configured) {
        Map<DRIF_BONUS_TYPE, Integer> result = new EnumMap<>(DRIF_BONUS_TYPE.class);
        if (context.request().getTargetQuantities() != null) {
            context.request()
                    .getTargetQuantities()
                    .forEach(
                            (type, range) -> {
                                if (range != null && range.getMin() == range.getMax()) {
                                    result.put(type, range.getMin());
                                }
                            });
        }
        configured.forEach(
                (type, amount) -> {
                    Integer required = result.put(type, amount);
                    if (required != null && required.intValue() != amount) {
                        throw new IllegalArgumentException(
                                "Fixed count for "
                                        + type
                                        + " conflicts with the exact requested quantity "
                                        + required);
                    }
                });
        return Map.copyOf(result);
    }

    private List<Choice> createChoices(
            CpModel model,
            OptimizationContext context,
            BuildState fixed,
            boolean pruneDominatedChoices) {
        List<Choice> result = new ArrayList<>();
        for (SlotContext slot : context.slots()) {
            if (!slot.optimizable() || slot.special() || wholeSlotLocked(slot, context)) continue;
            Map<Outcome, Placement> unique = new LinkedHashMap<>();
            for (var drif : slot.candidates()) {
                for (int level : DRIF_SIZE.meaningfulLevels()) {
                    if (level > drif.getSize().getMaxLevel()) continue;
                    long value = scaled(calculateDrifValue(drif, level) * (1.0 + slot.drifBonus()));
                    Placement placement = new Placement(drif, level, false);
                    unique.putIfAbsent(
                            new Outcome(
                                    drif.getBonusType(), drif.getSize(), power(drif, level), value),
                            placement);
                }
            }
            List<Map.Entry<Outcome, Placement>> outcomes = new ArrayList<>(unique.entrySet());
            if (pruneDominatedChoices) {
                outcomes.removeIf(
                        candidate ->
                                outcomes.stream()
                                        .anyMatch(
                                                alternative ->
                                                        dominates(
                                                                alternative.getKey(),
                                                                candidate.getKey(),
                                                                context)));
            }
            int index = 0;
            for (Map.Entry<Outcome, Placement> entry : outcomes) {
                BoolVar selected = model.newBoolVar(slot.key() + "_" + index++);
                result.add(new Choice(slot, entry.getValue(), selected, entry.getKey().value()));
            }
        }
        return result;
    }

    private boolean dominates(Outcome alternative, Outcome candidate, OptimizationContext context) {
        if (alternative == candidate || alternative.type() != candidate.type()) return false;
        boolean sizeConstrained =
                context.request().getDrifSizeQuantities() != null
                        && context.request().getDrifSizeQuantities().containsKey(candidate.type());
        if (sizeConstrained && alternative.size() != candidate.size()) return false;
        return alternative.power() <= candidate.power()
                && alternative.value() >= candidate.value()
                && (alternative.power() < candidate.power()
                        || alternative.value() > candidate.value());
    }

    private void addSlotConstraints(
            CpModel model, OptimizationContext context, BuildState fixed, List<Choice> choices) {
        for (SlotContext slot : context.slots()) {
            List<Choice> inSlot = choices.stream().filter(choice -> choice.slot() == slot).toList();
            if (inSlot.isEmpty()) continue;
            List<Placement> fixedPlacements = fixed.slots().getOrDefault(slot.key(), List.of());
            long fixedPower =
                    fixedPlacements.stream()
                            .filter(Objects::nonNull)
                            .mapToLong(placement -> power(placement.drif(), placement.level()))
                            .sum();
            long fixedCount = fixedPlacements.stream().filter(Objects::nonNull).count();
            model.addLessOrEqual(sum(inSlot), slot.maxDrifs() - fixedCount);
            model.addLessOrEqual(
                    weighted(
                            inSlot,
                            choice -> power(choice.placement().drif(), choice.placement().level())),
                    slot.capacity() - fixedPower);
            for (DRIF_BONUS_TYPE type : DRIF_BONUS_TYPE.values()) {
                List<Choice> sameType =
                        inSlot.stream()
                                .filter(choice -> choice.placement().drif().getBonusType() == type)
                                .toList();
                if (!sameType.isEmpty()) {
                    boolean alreadyFixed =
                            fixedPlacements.stream()
                                    .filter(Objects::nonNull)
                                    .anyMatch(placement -> placement.drif().getBonusType() == type);
                    model.addLessOrEqual(sum(sameType), alreadyFixed ? 0 : 1);
                }
            }
        }
    }

    /**
     * Identical items in interchangeable slots (most often two equal rings) create two mirrored
     * branches for every distribution. Ordering their selected outcome signatures keeps one
     * representative without removing any distinct build.
     */
    private void addEquivalentSlotSymmetryBreaking(
            CpModel model, OptimizationContext context, BuildState fixed, List<Choice> choices) {
        List<SlotContext> candidates =
                context.slots().stream()
                        .filter(slot -> slot.optimizable() && !slot.special())
                        .filter(slot -> !wholeSlotLocked(slot, context))
                        .toList();
        for (int leftIndex = 0; leftIndex < candidates.size(); leftIndex++) {
            SlotContext left = candidates.get(leftIndex);
            for (int rightIndex = leftIndex + 1; rightIndex < candidates.size(); rightIndex++) {
                SlotContext right = candidates.get(rightIndex);
                if (!equivalentSlots(left, right, fixed, choices)) continue;
                List<Choice> leftChoices = choicesFor(left, choices);
                List<Choice> rightChoices = choicesFor(right, choices);
                List<Long> ranks =
                        java.util.stream.LongStream.rangeClosed(1, leftChoices.size())
                                .boxed()
                                .toList();
                model.addGreaterOrEqual(
                        weighted(
                                new ArrayList<>(leftChoices),
                                choice -> ranks.get(leftChoices.indexOf(choice))),
                        weighted(
                                new ArrayList<>(rightChoices),
                                choice -> ranks.get(rightChoices.indexOf(choice))));
                break;
            }
        }
    }

    private boolean equivalentSlots(
            SlotContext left, SlotContext right, BuildState fixed, List<Choice> choices) {
        if (left.capacity() != right.capacity()
                || left.maxDrifs() != right.maxDrifs()
                || Double.compare(left.drifBonus(), right.drifBonus()) != 0) return false;
        if (!fixed.slots()
                .getOrDefault(left.key(), List.of())
                .equals(fixed.slots().getOrDefault(right.key(), List.of()))) return false;
        List<Outcome> leftOutcomes = choicesFor(left, choices).stream().map(this::outcome).toList();
        List<Outcome> rightOutcomes =
                choicesFor(right, choices).stream().map(this::outcome).toList();
        return leftOutcomes.equals(rightOutcomes);
    }

    private List<Choice> choicesFor(SlotContext slot, List<Choice> choices) {
        return choices.stream().filter(choice -> choice.slot() == slot).toList();
    }

    private Outcome outcome(Choice choice) {
        Placement placement = choice.placement();
        return new Outcome(
                placement.drif().getBonusType(),
                placement.drif().getSize(),
                power(placement.drif(), placement.level()),
                choice.value());
    }

    private void addQuantityConstraints(
            CpModel model, OptimizationContext context, BuildState fixed, List<Choice> choices) {
        for (var entry : context.request().getTargetQuantities().entrySet()) {
            DRIF_BONUS_TYPE type = entry.getKey();
            long constant = count(fixed, context, type, true);
            LinearArgument count = countExpression(model, choices, type, null, constant);
            model.addGreaterOrEqual(count, entry.getValue().getMin());
            model.addLessOrEqual(count, entry.getValue().getMax());
        }
        if (context.request().getDrifSizeQuantities() == null) return;
        for (var typeEntry : context.request().getDrifSizeQuantities().entrySet()) {
            for (var sizeEntry : typeEntry.getValue().entrySet()) {
                long constant = countBySize(fixed, context, typeEntry.getKey(), sizeEntry.getKey());
                LinearArgument count =
                        countExpression(
                                model, choices, typeEntry.getKey(), sizeEntry.getKey(), constant);
                model.addGreaterOrEqual(count, sizeEntry.getValue().getMin());
                model.addLessOrEqual(count, sizeEntry.getValue().getMax());
            }
        }
    }

    private void addElementalConstraint(CpModel model, BuildState fixed, List<Choice> choices) {
        long constant =
                fixed.slots().values().stream()
                        .flatMap(List::stream)
                        .filter(Objects::nonNull)
                        .filter(
                                placement ->
                                        rules.isElementalDamage(placement.drif().getBonusType()))
                        .count();
        List<Choice> elemental =
                choices.stream()
                        .filter(
                                choice ->
                                        rules.isElementalDamage(
                                                choice.placement().drif().getBonusType()))
                        .toList();
        if (!elemental.isEmpty()) model.addLessOrEqual(sum(elemental), 1 - constant);
    }

    private List<Objective> qualityObjectives(
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

    private List<Objective> plannedObjectives(
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
            if (configuredCap == null || configuredCap <= 0) {
                throw new IllegalArgumentException(type + " needs a positive cap for balancing");
            }
            long cap = configuredCap.longValue();
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

    private BuildState materialize(
            OptimizationContext context, BuildState fixed, List<Choice> choices, CpSolver solver) {
        BuildState result = fixed.copy();
        for (SlotContext slot : context.slots()) {
            List<Placement> placements = result.slots().get(slot.key());
            if (placements == null || slot.special() || wholeSlotLocked(slot, context)) continue;
            List<Placement> selected =
                    choices.stream()
                            .filter(
                                    choice ->
                                            choice.slot() == slot
                                                    && solver.booleanValue(choice.selected()))
                            .map(Choice::placement)
                            .sorted(
                                    Comparator.comparing(
                                                    (Placement p) -> p.drif().getBonusType().name())
                                            .thenComparingInt(Placement::level))
                            .toList();
            int selectedIndex = 0;
            for (int index = 0;
                    index < placements.size() && selectedIndex < selected.size();
                    index++) {
                if (placements.get(index) == null)
                    placements.set(index, selected.get(selectedIndex++));
            }
        }
        return result;
    }

    private void addHints(CpModel model, BuildState hint, List<Choice> choices) {
        if (hint == null) return;
        for (Choice choice : choices) {
            boolean selected =
                    hint.slots().getOrDefault(choice.slot().key(), List.of()).stream()
                            .filter(Objects::nonNull)
                            .anyMatch(placement -> sameOutcome(placement, choice.placement()));
            model.addHint(choice.selected(), selected);
        }
    }

    private boolean sameOutcome(Placement left, Placement right) {
        return left.drif().getBonusType() == right.drif().getBonusType()
                && left.drif().getSize() == right.drif().getSize()
                && power(left.drif(), left.level()) == power(right.drif(), right.level())
                && scaled(calculateDrifValue(left.drif(), left.level()))
                        == scaled(calculateDrifValue(right.drif(), right.level()));
    }

    private LinearArgument countExpression(
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

    private LinearArgument countExpression(
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

    private long count(
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

    private long countBySize(
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

    private long rawValue(
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
                                    calculateDrifValue(placement.drif(), placement.level())
                                            * (1.0 + slot.drifBonus()));
                }
            }
        }
        return result;
    }

    private boolean wholeSlotLocked(SlotContext slot, OptimizationContext context) {
        return context.request().getLockedSlots() != null
                && context.request().getLockedSlots().contains(slot.key());
    }

    private LinearArgument sum(List<Choice> choices) {
        return LinearExpr.sum(
                choices.stream().map(Choice::selected).toArray(LinearArgument[]::new));
    }

    private LinearArgument weighted(
            List<Choice> choices, java.util.function.ToLongFunction<Choice> coefficient) {
        return LinearExpr.weightedSum(
                choices.stream().map(Choice::selected).toArray(LinearArgument[]::new),
                choices.stream().mapToLong(coefficient).toArray());
    }

    private LinearArgument weighted(
            List<? extends LinearArgument> variables, List<Long> coefficients) {
        return LinearExpr.weightedSum(
                variables.toArray(LinearArgument[]::new),
                coefficients.stream().mapToLong(Long::longValue).toArray());
    }

    private LinearArgument expr(
            List<? extends LinearArgument> variables, List<Long> coefficients, long constant) {
        List<LinearArgument> allVariables = new ArrayList<>(variables);
        List<Long> allCoefficients = new ArrayList<>(coefficients);
        if (constant != 0) {
            allVariables.add(LinearExpr.constant(1));
            allCoefficients.add(constant);
        }
        return weighted(allVariables, allCoefficients);
    }

    private long scaled(double value) {
        return Math.round(value * VALUE_SCALE);
    }

    private Result result(
            Status status, BuildState best, long started, CpSolver solver, List<Long> objectives) {
        return new Result(
                status,
                best,
                Duration.ofNanos(System.nanoTime() - started),
                solver.numBranches(),
                solver.numConflicts(),
                List.copyOf(objectives),
                best != null ? solver.objectiveValue() : null,
                best != null ? solver.bestObjectiveBound() : null);
    }
}
