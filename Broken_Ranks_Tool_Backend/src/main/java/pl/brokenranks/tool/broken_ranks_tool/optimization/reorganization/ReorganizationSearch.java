package pl.brokenranks.tool.broken_ranks_tool.optimization.reorganization;

import static pl.brokenranks.tool.broken_ranks_tool.optimization.engine.rules.DrifOptimizationMath.usedPower;

import java.util.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_BONUS_TYPE;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.rules.DrifPowerRules;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.validator.EquipmentPlacementRules;
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.OptimizationResponse.ReorganizationDrifUsage;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.evaluation.OptimizationQualityComparator;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.evaluation.OptimizationStateEvaluator;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model.*;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.result.OptimizationResultAssembler;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.rules.OptimizationDrifSizeConstraints;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.rules.OptimizationRequestConstraints;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.search.pipeline.OptimizationSearchPipeline.PipelineResult;
import pl.brokenranks.tool.broken_ranks_tool.optimization.reorganization.ReorganizationPool.*;

/** Bounded deterministic search over actual template/level multiplicities, without level allocation. */
@Component
@RequiredArgsConstructor
public final class ReorganizationSearch {
    private static final int BEAM_WIDTH = 48;
    private final EquipmentPlacementRules placementRules;
    private final OptimizationStateEvaluator evaluator;
    private final OptimizationResultAssembler assembler;

    public String validateSupply(OptimizationContext context) {
        ReorganizationPool pool = new ReorganizationPool(context);
        for (var entry :
                OptimizationRequestConstraints.safeQuantities(context.request()).entrySet()) {
            int count =
                    evaluator.globalCount(pool.fixed, entry.getKey(), context)
                            + pool.sources.stream()
                                    .mapToInt(
                                            source ->
                                                    context.drifs()
                                                                            .get(
                                                                                    source.stone()
                                                                                            .templateId())
                                                                            .getBonusType()
                                                                    == entry.getKey()
                                                            ? 1
                                                            : 0)
                                    .sum();
            if (count < entry.getValue().getMin())
                return "Posiadana pula zawiera za mało drifów dla minimum: "
                        + entry.getKey().getDescription()
                        + ".";
        }
        if (context.request().getDrifSizeQuantities() != null) {
            for (var bonus : context.request().getDrifSizeQuantities().entrySet()) {
                for (var size : bonus.getValue().entrySet()) {
                    int count =
                            evaluator.sizeCount(pool.fixed, bonus.getKey(), size.getKey(), context)
                                    + pool.sources.stream()
                                            .mapToInt(
                                                    source -> {
                                                        var drif =
                                                                context.drifs()
                                                                        .get(
                                                                                source.stone()
                                                                                        .templateId());
                                                        return drif.getBonusType() == bonus.getKey()
                                                                        && drif.getSize()
                                                                                == size.getKey()
                                                                ? 1
                                                                : 0;
                                                    })
                                            .sum();
                    if (count < size.getValue().getMin())
                        return "Posiadana pula zawiera za mało drifów rozmiaru "
                                + size.getKey()
                                + " dla: "
                                + bonus.getKey().getDescription()
                                + ".";
                }
            }
        }
        return null;
    }

    public PipelineResult optimize(OptimizationContext context) {
        long started = System.nanoTime();
        ReorganizationPool pool = new ReorganizationPool(context);
        assembler.calibrateCalculatorBaseline(pool.fixed, context);
        Map<Position, List<Stone>> choices = new LinkedHashMap<>();
        for (Position position : pool.positions) {
            choices.put(
                    position,
                    pool.supply.keySet().stream()
                            .filter(stone -> fits(stone, position.slot(), context))
                            .toList());
        }
        List<Position> ordered =
                pool.positions.stream()
                        .sorted(
                                Comparator.comparingInt(
                                                (Position position) -> choices.get(position).size())
                                        .thenComparing(position -> -position.slot().drifBonus())
                                        .thenComparing(position -> position.slot().key())
                                        .thenComparingInt(Position::index))
                        .toList();
        List<BuildState> candidates = new ArrayList<>();
        if (valid(pool.original, context)) candidates.add(pool.original.copy());
        if (valid(pool.fixed, context)) candidates.add(pool.fixed.copy());
        long upperBound = 1;
        for (Position position : ordered) {
            upperBound *= choices.get(position).size() + 1L;
            if (upperBound > context.beamSearchBudget().remaining() / 2) break;
        }
        if (upperBound <= context.beamSearchBudget().remaining() / 2) {
            enumerate(pool.fixed.copy(), 0, ordered, choices, pool, context, candidates);
        } else {
            beam(ordered, choices, pool, context, candidates);
        }
        candidates.sort(evaluator.stateComparator(context));
        BuildState best = candidates.isEmpty() ? null : candidates.getFirst();
        if (best != null) best = refine(best, pool, context);
        if (best != null) candidates.add(best);
        // Verify finalists with the shared calculator and retain the baseline as a competitor.
        List<BuildState> finalists =
                candidates.stream()
                        .sorted(evaluator.stateComparator(context))
                        .filter(state -> valid(state, context))
                        .collect(
                                java.util.stream.Collectors.toMap(
                                        BuildState::signature,
                                        state -> state,
                                        (left, right) -> left,
                                        LinkedHashMap::new))
                        .values()
                        .stream()
                        .limit(16)
                        .collect(java.util.stream.Collectors.toCollection(ArrayList::new));
        if (valid(pool.original, context)
                && finalists.stream()
                        .noneMatch(s -> s.signature().equals(pool.original.signature())))
            finalists.add(pool.original);
        Quality bestQuality = null;
        best = null;
        OptimizationQualityComparator comparator = new OptimizationQualityComparator();
        for (BuildState state : finalists) {
            Quality quality =
                    evaluator.verifiedQuality(
                            state, context, type -> assembler.actualValue(state, type, context));
            if (best == null
                    || comparator.compare(quality, bestQuality) > 0
                    || comparator.compare(quality, bestQuality) == 0
                            && state.signature().compareTo(best.signature()) < 0) {
                best = state.copy();
                bestQuality = quality;
            }
        }
        context.calculatorSession().metrics().recordStage("reorganization", started, context);
        return best == null ? null : new PipelineResult(best, finalists);
    }

    public List<ReorganizationDrifUsage> usages(BuildState state, OptimizationContext context) {
        return new ReorganizationPool(context).usages(state);
    }

    private void enumerate(
            BuildState state,
            int depth,
            List<Position> positions,
            Map<Position, List<Stone>> choices,
            ReorganizationPool pool,
            OptimizationContext context,
            List<BuildState> candidates) {
        if (!context.beamSearchBudget().tryConsume()) return;
        if (depth == positions.size()) {
            if (valid(state, context)) {
                candidates.add(state.copy());
                if (candidates.size() > 128) {
                    candidates.sort(evaluator.stateComparator(context));
                    candidates.subList(64, candidates.size()).clear();
                }
            }
            return;
        }
        Position position = positions.get(depth);
        enumerate(state, depth + 1, positions, choices, pool, context, candidates);
        Map<Stone, Integer> available = pool.available(state);
        for (Stone stone : choices.get(position)) {
            if (available.getOrDefault(stone, 0) <= 0) continue;
            state.setPlacement(position.slot().key(), position.index(), placement(stone, context));
            if (withinMaximums(state, context) && validSlot(state, position.slot(), context))
                enumerate(state, depth + 1, positions, choices, pool, context, candidates);
            state.setPlacement(position.slot().key(), position.index(), null);
        }
    }

    private void beam(
            List<Position> positions,
            Map<Position, List<Stone>> choices,
            ReorganizationPool pool,
            OptimizationContext context,
            List<BuildState> candidates) {
        List<BuildState> beam = List.of(pool.fixed.copy());
        for (int depth = 0; depth < positions.size(); depth++) {
            Position position = positions.get(depth);
            // Reserve enough operations to finish all remaining sockets even for a large pool.
            int width =
                    Math.max(
                            1,
                            Math.min(
                                    BEAM_WIDTH,
                                    context.beamSearchBudget().remaining()
                                            / Math.max(
                                                    1,
                                                    (positions.size() - depth)
                                                            * (pool.supply.size() + 1))));
            Map<String, BuildState> next = new LinkedHashMap<>();
            for (BuildState state : beam.stream().limit(width).toList()) {
                next.putIfAbsent(state.signature(), state);
                Map<Stone, Integer> available = pool.available(state);
                for (Stone stone : choices.get(position)) {
                    if (available.getOrDefault(stone, 0) <= 0) continue;
                    if (!context.beamSearchBudget().tryConsume()) break;
                    BuildState candidate = state.copy();
                    candidate.setPlacement(
                            position.slot().key(), position.index(), placement(stone, context));
                    if (withinMaximums(candidate, context)
                            && validSlot(candidate, position.slot(), context))
                        next.putIfAbsent(candidate.signature(), candidate);
                }
            }
            beam =
                    next.values().stream()
                            .sorted(evaluator.stateComparator(context))
                            .limit(BEAM_WIDTH)
                            .toList();
        }
        beam.stream().filter(state -> valid(state, context)).forEach(candidates::add);
    }

    private BuildState refine(
            BuildState seed, ReorganizationPool pool, OptimizationContext context) {
        BuildState best = seed;
        boolean improved = true;
        while (improved && !context.refinementSearchBudget().exhausted()) {
            improved = false;
            BuildState next = best;
            for (int first = 0; first < pool.positions.size(); first++) {
                Position a = pool.positions.get(first);
                Map<Stone, Integer> available = pool.available(best);
                for (Stone stone : pool.supply.keySet()) {
                    if (available.getOrDefault(stone, 0) <= 0 || !fits(stone, a.slot(), context))
                        continue;
                    if (!context.refinementSearchBudget().tryConsume()) break;
                    BuildState candidate = best.copy();
                    candidate.setPlacement(a.slot().key(), a.index(), placement(stone, context));
                    if (valid(candidate, context)
                            && evaluator.isBetterState(candidate, next, context)) next = candidate;
                }
                if (!context.refinementSearchBudget().tryConsume()) break;
                BuildState removed = best.copy();
                removed.setPlacement(a.slot().key(), a.index(), null);
                if (valid(removed, context) && evaluator.isBetterState(removed, next, context))
                    next = removed;
                for (int second = first + 1; second < pool.positions.size(); second++) {
                    if (!context.refinementSearchBudget().tryConsume()) break;
                    Position b = pool.positions.get(second);
                    BuildState candidate = best.copy();
                    Placement left = best.slots().get(a.slot().key()).get(a.index());
                    Placement right = best.slots().get(b.slot().key()).get(b.index());
                    candidate.setPlacement(a.slot().key(), a.index(), right);
                    candidate.setPlacement(b.slot().key(), b.index(), left);
                    if (valid(candidate, context)
                            && evaluator.isBetterState(candidate, next, context)) next = candidate;
                }
            }
            improved = next != best;
            best = next;
        }
        return best;
    }

    private boolean fits(Stone stone, SlotContext slot, OptimizationContext context) {
        var drif = context.drifs().get(stone.templateId());
        return placementRules.isValidDrifSizeForTier(drif, slot.item())
                && placementRules.isElementalDrifPositionValid(drif, slot.key())
                && DrifPowerRules.power(drif.getBonusType().getBasePower(), stone.level())
                        <= slot.capacity();
    }

    private Placement placement(Stone stone, OptimizationContext context) {
        return new Placement(context.drifs().get(stone.templateId()), stone.level(), false);
    }

    private boolean validSlot(BuildState state, SlotContext slot, OptimizationContext context) {
        if (slot.special()) return true;
        List<Placement> placements = state.slots().get(slot.key());
        if (usedPower(placements) > slot.capacity()) return false;
        Set<DRIF_BONUS_TYPE> bonuses = new HashSet<>();
        int elemental = 0;
        for (Placement placement : placements) {
            if (placement == null) continue;
            if (!fits(Stone.of(placement), slot, context)
                    || !bonuses.add(placement.drif().getBonusType())) return false;
            if (placementRules.isElementalDamage(placement.drif().getBonusType())
                    && ++elemental > 1) return false;
        }
        return true;
    }

    private boolean withinMaximums(BuildState state, OptimizationContext context) {
        for (var entry :
                OptimizationRequestConstraints.safeQuantities(context.request()).entrySet())
            if (evaluator.globalCount(state, entry.getKey(), context) > entry.getValue().getMax())
                return false;
        if (context.request().getDrifSizeQuantities() != null)
            for (var bonus : context.request().getDrifSizeQuantities().entrySet())
                for (var size : bonus.getValue().entrySet())
                    if (evaluator.sizeCount(state, bonus.getKey(), size.getKey(), context)
                            > OptimizationDrifSizeConstraints.maximum(
                                    bonus.getKey(), size.getKey(), context)) return false;
        return true;
    }

    private boolean valid(BuildState state, OptimizationContext context) {
        return inventoryFits(state, context)
                && assembler.validateFinalResult(state, context) == null;
    }

    private boolean inventoryFits(BuildState state, OptimizationContext context) {
        Integer backpackSlots = context.request().getBackpackSlotCount();
        if (backpackSlots == null) return true;
        int originalCount = 0;
        int finalCount = 0;
        for (SlotContext slot : context.slots()) {
            if (slot.special()
                    || context.request().getLockedSlots() != null
                            && context.request().getLockedSlots().contains(slot.key())) continue;
            List<Long> ids =
                    slot.original().getDrifIds() == null ? List.of() : slot.original().getDrifIds();
            List<Placement> placements = state.slots().get(slot.key());
            for (int index = 0; index < slot.maxDrifs(); index++) {
                if (slot.lockedIndices().contains(index)) continue;
                if (index < ids.size() && ids.get(index) != null) originalCount++;
                if (index < placements.size() && placements.get(index) != null) finalCount++;
            }
        }
        return backpackSlots + originalCount - finalCount <= 200;
    }
}
