package pl.brokenranks.tool.broken_ranks_tool.optimization.reference;

import static pl.brokenranks.tool.broken_ranks_tool.optimization.engine.rules.DrifOptimizationMath.calculateDrifValue;
import static pl.brokenranks.tool.broken_ranks_tool.optimization.engine.rules.DrifOptimizationMath.power;

import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_BONUS_TYPE;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_SIZE;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.rules.EquipmentRulesRegistry;
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.OptimizationRequest;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.context.OptimizationInitialStateFactory;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.evaluation.OptimizationStateEvaluator;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model.BuildState;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model.OptimizationContext;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model.Placement;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model.SlotContext;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.result.OptimizationResultAssembler;

/** Adapts a complete production optimization context to development-only exhaustive search. */
public final class ExactBuildOptimizationSolver {

    public record Result(
            ExactOptimizationSolver.Status status,
            BuildState best,
            long examinedStates,
            long searchSpace,
            java.time.Duration elapsed,
            List<SlotAlternatives> alternatives) {}

    public record SlotAlternatives(String slotKey, int count) {}

    private final EquipmentRulesRegistry rules;
    private final OptimizationStateEvaluator evaluator;
    private final OptimizationInitialStateFactory initialStates;
    private final OptimizationResultAssembler resultAssembler;

    public ExactBuildOptimizationSolver(
            EquipmentRulesRegistry rules,
            OptimizationStateEvaluator evaluator,
            OptimizationInitialStateFactory initialStates,
            OptimizationResultAssembler resultAssembler) {
        this.rules = rules;
        this.evaluator = evaluator;
        this.initialStates = initialStates;
        this.resultAssembler = resultAssembler;
    }

    public Result solve(OptimizationContext context, ExactOptimizationSolver.Limits searchLimits) {
        return solve(context, searchLimits, null);
    }

    public Result solve(
            OptimizationContext context,
            ExactOptimizationSolver.Limits searchLimits,
            BuildState initialBest) {
        BuildState initial = initialStates.create(context);
        resultAssembler.calibrateCalculatorBaseline(initial, context);
        List<List<SlotOption>> dimensions = new ArrayList<>();
        List<SlotAlternatives> statistics = new ArrayList<>();
        List<SlotContext> orderedSlots = new ArrayList<>(context.slots());
        orderedSlots.sort(
                Comparator.comparingInt(slot -> estimatedAlternativeComplexity(slot, context)));
        for (SlotContext slot : orderedSlots) {
            List<SlotOption> options = new ArrayList<>(alternatives(slot, initial, context));
            prioritizeSeed(options, initialBest, slot);
            dimensions.add(options);
            statistics.add(new SlotAlternatives(slot.key(), options.size()));
        }

        BuildEvaluation evaluation = new BuildEvaluation(context, dimensions, initialBest);
        var exact = new ExactOptimizationSolver<SlotOption>(searchLimits);
        var result = exact.solveIncrementally(dimensions, evaluation);
        return new Result(
                result.status(),
                evaluation.best,
                result.examinedStates(),
                result.searchSpace(),
                result.elapsed(),
                statistics);
    }

    private int estimatedAlternativeComplexity(SlotContext slot, OptimizationContext context) {
        if (!slot.optimizable() || slot.special()) return 1;
        return slot.candidates().size() * Math.max(1, slot.maxDrifs());
    }

    private void prioritizeSeed(List<SlotOption> options, BuildState seed, SlotContext slot) {
        if (seed == null) return;
        List<Placement> seedPlacements = seed.slots().get(slot.key());
        if (seedPlacements == null) return;
        options.removeIf(option -> samePlacements(option.placements(), seedPlacements));
        options.addFirst(new SlotOption(slot, new ArrayList<>(seedPlacements)));
        options.sort(
                Comparator.comparing(
                        option -> !samePlacements(option.placements(), seedPlacements)));
    }

    private boolean samePlacements(List<Placement> left, List<Placement> right) {
        if (right == null || left.size() != right.size()) return false;
        for (int index = 0; index < left.size(); index++) {
            Placement a = left.get(index);
            Placement b = right.get(index);
            if (a == null || b == null) {
                if (a != b) return false;
            } else if (!sameOutcome(a, b)) {
                return false;
            }
        }
        return true;
    }

    private boolean sameOutcome(Placement left, Placement right) {
        return left.drif().getBonusType() == right.drif().getBonusType()
                && power(left.drif(), left.level()) == power(right.drif(), right.level())
                && Double.compare(
                                calculateDrifValue(left.drif(), left.level()),
                                calculateDrifValue(right.drif(), right.level()))
                        == 0;
    }

    private List<SlotOption> alternatives(
            SlotContext slot, BuildState initial, OptimizationContext context) {
        List<Placement> fixed =
                new ArrayList<>(initial.slots().getOrDefault(slot.key(), List.of()));
        if (slot.special()
                || !slot.optimizable()
                || context.request().getLockedSlots() != null
                        && context.request().getLockedSlots().contains(slot.key())) {
            return List.of(new SlotOption(slot, fixed));
        }
        while (fixed.size() < slot.maxDrifs()) fixed.add(null);
        List<SlotOption> result = new ArrayList<>();
        List<Placement> candidates = placementCandidates(slot, context);
        enumerateSlot(slot, fixed, candidates, 0, result);
        return result;
    }

    private List<Placement> placementCandidates(SlotContext slot, OptimizationContext context) {
        boolean sizesMatter =
                context.request().getDrifSizeQuantities() != null
                        && !context.request().getDrifSizeQuantities().isEmpty();
        Map<PlacementOutcome, Placement> unique = new LinkedHashMap<>();
        for (var candidate : slot.candidates()) {
            for (int level : DRIF_SIZE.meaningfulLevels()) {
                if (level > candidate.getSize().getMaxLevel()) continue;
                Placement placement = new Placement(candidate, level, false);
                PlacementOutcome outcome =
                        new PlacementOutcome(
                                candidate.getBonusType(),
                                power(candidate, level),
                                Double.doubleToLongBits(calculateDrifValue(candidate, level)),
                                sizesMatter ? candidate.getSize() : null);
                unique.putIfAbsent(outcome, placement);
            }
        }
        return List.copyOf(unique.values());
    }

    private void enumerateSlot(
            SlotContext slot,
            List<Placement> placements,
            List<Placement> candidates,
            int candidateStart,
            List<SlotOption> result) {
        result.add(new SlotOption(slot, Collections.unmodifiableList(new ArrayList<>(placements))));
        int freeIndex = firstFreeUnlockedIndex(placements, slot);
        if (freeIndex < 0) return;
        Set<DRIF_BONUS_TYPE> usedTypes = new HashSet<>();
        placements.stream()
                .filter(java.util.Objects::nonNull)
                .forEach(placement -> usedTypes.add(placement.drif().getBonusType()));
        for (int candidateIndex = candidateStart;
                candidateIndex < candidates.size();
                candidateIndex++) {
            Placement placement = candidates.get(candidateIndex);
            if (usedTypes.contains(placement.drif().getBonusType())) continue;
            placements.set(freeIndex, placement);
            if (usedPower(placements) <= slot.capacity()) {
                enumerateSlot(slot, placements, candidates, candidateIndex + 1, result);
            }
            placements.set(freeIndex, null);
        }
    }

    private int firstFreeUnlockedIndex(List<Placement> placements, SlotContext slot) {
        for (int index = 0; index < slot.maxDrifs(); index++) {
            if (!slot.lockedIndices().contains(index) && placements.get(index) == null)
                return index;
        }
        return -1;
    }

    private int usedPower(List<Placement> placements) {
        return placements.stream()
                .filter(java.util.Objects::nonNull)
                .mapToInt(placement -> power(placement.drif(), placement.level()))
                .sum();
    }

    private record SlotOption(SlotContext slot, List<Placement> placements) {}

    private record PlacementOutcome(
            DRIF_BONUS_TYPE type, int power, long valueBits, DRIF_SIZE size) {}

    private final class BuildEvaluation
            implements ExactOptimizationSolver.IncrementalEvaluation<SlotOption> {
        private final OptimizationContext context;
        private final List<List<SlotOption>> dimensions;
        private final SlotOption[] selected;
        private final Map<DRIF_BONUS_TYPE, Integer> counts = new EnumMap<>(DRIF_BONUS_TYPE.class);
        private int elementalCount;
        private BuildState best;
        private boolean recordedBySearch;

        private final Map<DRIF_BONUS_TYPE, int[]> remainingPossible;

        private BuildEvaluation(
                OptimizationContext context,
                List<List<SlotOption>> dimensions,
                BuildState initialBest) {
            this.context = context;
            this.dimensions = dimensions;
            this.selected = new SlotOption[dimensions.size()];
            this.best = initialBest;
            this.remainingPossible = remainingPossible(dimensions);
        }

        @Override
        public void select(int dimension, SlotOption choice) {
            selected[dimension] = choice;
            adjust(choice, 1);
        }

        @Override
        public void unselect(int dimension, SlotOption choice) {
            adjust(choice, -1);
            selected[dimension] = null;
        }

        @Override
        public boolean canContinue(int nextDimension) {
            if (elementalCount > 1) return false;
            for (var entry : counts.entrySet()) {
                OptimizationRequest.QuantityRange range =
                        context.request().getTargetQuantities() == null
                                ? null
                                : context.request().getTargetQuantities().get(entry.getKey());
                if (range != null && entry.getValue() > range.getMax()) return false;
            }
            for (var entry :
                    (context.request().getTargetQuantities() == null
                                    ? Map.<DRIF_BONUS_TYPE, OptimizationRequest.QuantityRange>of()
                                    : context.request().getTargetQuantities())
                            .entrySet()) {
                if (counts.getOrDefault(entry.getKey(), 0)
                                + remainingPossible
                                        .getOrDefault(
                                                entry.getKey(), new int[dimensions.size() + 1])[
                                        nextDimension]
                        < entry.getValue().getMin()) return false;
            }
            return true;
        }

        private Map<DRIF_BONUS_TYPE, int[]> remainingPossible(List<List<SlotOption>> dimensions) {
            Map<DRIF_BONUS_TYPE, int[]> result = new EnumMap<>(DRIF_BONUS_TYPE.class);
            for (DRIF_BONUS_TYPE type : DRIF_BONUS_TYPE.values()) {
                int[] suffix = new int[dimensions.size() + 1];
                for (int index = dimensions.size() - 1; index >= 0; index--) {
                    int maximum =
                            dimensions.get(index).stream()
                                    .mapToInt(option -> count(option, type))
                                    .max()
                                    .orElse(0);
                    suffix[index] = suffix[index + 1] + maximum;
                }
                result.put(type, suffix);
            }
            return result;
        }

        private int count(SlotOption option, DRIF_BONUS_TYPE type) {
            return (int)
                    option.placements().stream()
                            .filter(Objects::nonNull)
                            .filter(placement -> placement.drif().getBonusType() == type)
                            .count();
        }

        @Override
        public boolean feasible() {
            return evaluator.minimumsSatisfied(current(), context);
        }

        @Override
        public boolean betterThanRecordedBest() {
            BuildState candidate = current();
            boolean better =
                    !recordedBySearch
                            || best == null
                            || evaluator.isBetterState(candidate, best, context);
            if (better) pending = candidate;
            context.evaluationCache().clear();
            return better;
        }

        private BuildState pending;

        @Override
        public void recordBest() {
            best = pending;
            pending = null;
            recordedBySearch = true;
        }

        private BuildState current() {
            BuildState state = new BuildState();
            for (SlotOption option : selected) {
                state.slots().put(option.slot().key(), new ArrayList<>(option.placements()));
            }
            return state;
        }

        private void adjust(SlotOption option, int direction) {
            for (Placement placement : option.placements()) {
                if (placement == null) continue;
                DRIF_BONUS_TYPE type = placement.drif().getBonusType();
                counts.merge(type, direction, Integer::sum);
                if (rules.isElementalDamage(type)) elementalCount += direction;
            }
        }
    }
}
