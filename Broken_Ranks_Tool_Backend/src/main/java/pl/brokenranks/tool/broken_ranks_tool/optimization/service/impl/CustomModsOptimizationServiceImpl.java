package pl.brokenranks.tool.broken_ranks_tool.optimization.service.impl;

import org.springframework.stereotype.Service;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_BONUS_TYPE;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.rules.EquipmentRulesRegistry;
import pl.brokenranks.tool.broken_ranks_tool.equipment.dto.EquipmentRequest;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.DrifTemplate;
import pl.brokenranks.tool.broken_ranks_tool.equipment.persistence.repository.DrifTemplateRepository;
import pl.brokenranks.tool.broken_ranks_tool.equipment.persistence.repository.ItemTemplateRepository;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.calculator.processor.ItemStatProcessor;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.EquipmentStatsCalculatorService;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.validator.EquipmentValidator;
import pl.brokenranks.tool.broken_ranks_tool.optimization.constraints.OptimizationLockService;
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.OptimizationRequest;
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.OptimizationResponse;
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.OptimizationSummary;
import pl.brokenranks.tool.broken_ranks_tool.optimization.service.ModsOptimizationService;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.TreeSet;
import java.util.stream.Collectors;

import static pl.brokenranks.tool.broken_ranks_tool.optimization.service.impl.DrifOptimizationMath.*;
import static pl.brokenranks.tool.broken_ranks_tool.optimization.service.impl.OptimizationRequestConstraints.*;
import static pl.brokenranks.tool.broken_ranks_tool.optimization.service.impl.OptimizationSearchModel.*;

/** Coordinates deterministic drif search across greedy, beam, and local refinement stages. */
@Service
public class CustomModsOptimizationServiceImpl implements ModsOptimizationService {

    private static final int MAX_SEARCH_STEPS = 100_000;
    private static final double MIN_ACCEPTED_GAIN = 0.0001;
    private static final double MAX_RESIDUAL_FILL_LOSS = 15.0;

    private final EquipmentValidator validator;
    private final EquipmentRulesRegistry rules;
    private final OptimizationStateEvaluator stateEvaluator;
    private final OptimizationResultAssembler resultAssembler;
    private final OptimizationContextFactory contextFactory;
    private final OptimizationInitialStateFactory initialStateFactory;

    public CustomModsOptimizationServiceImpl(
            DrifTemplateRepository drifRepository,
            ItemTemplateRepository itemRepository,
            EquipmentValidator validator,
            EquipmentRulesRegistry rules,
            ItemStatProcessor itemStatProcessor,
            OptimizationLockService lockService,
            EquipmentStatsCalculatorService calculatorService) {
        this.validator = validator;
        this.rules = rules;
        this.stateEvaluator = new OptimizationStateEvaluator(rules);
        this.resultAssembler = new OptimizationResultAssembler(
                lockService, calculatorService, stateEvaluator);
        this.contextFactory = new OptimizationContextFactory(
                drifRepository, itemRepository, validator, itemStatProcessor);
        this.initialStateFactory = new OptimizationInitialStateFactory(validator);
    }

    /**
     * Builds the best equipment configuration within the requested priorities,
     * quantity targets, caps, capacity limits, and locks.
     * @param request Optimization request from the client.
     * @return Optimized setup, summary, or a business error response when constraints cannot be met.
     */
    @Override
    public OptimizationResponse optimize(OptimizationRequest request) {
        long startTime = System.nanoTime();

        if (request == null || request.getOriginalSlots() == null || request.getOriginalSlots().isEmpty()) {
            return failedResponse("Brak konfiguracji do optymalizacji.", elapsedSeconds(startTime));
        }
        if (request.getPriorities() == null || request.getPriorities().isEmpty()) {
            return failedResponse("Wybierz przynajmniej jeden modyfikator i ustaw jego priorytet.", elapsedSeconds(startTime));
        }
        String quantityError = validateQuantityRanges(request);
        if (quantityError != null) {
            return failedResponse(quantityError, elapsedSeconds(startTime));
        }

        OptimizationContext context = contextFactory.create(request, MAX_SEARCH_STEPS);
        if (context.slots().isEmpty()) {
            return failedResponse("Brak poprawnie skonfigurowanych przedmiotów do optymalizacji.", elapsedSeconds(startTime));
        }

        BuildState greedyState = buildGreedyState(context);
        if (greedyState == null) {
            return failedResponse("Nie można spełnić wszystkich minimów ilościowych przy obecnych blokadach, slotach i pojemności.", elapsedSeconds(startTime));
        }
        greedyState = selectBestGlobalState(greedyState, context);
        greedyState = maximizeDrifSizes(greedyState, context);
        greedyState = allocateRemainingLevelsByPriority(greedyState, context);
        greedyState = repairForcedCaps(greedyState, context);
        greedyState = refineDeterministically(greedyState, context);
        greedyState = fillResidualCapacity(greedyState, context);
        greedyState = maximizeDrifSizes(greedyState, context);
        greedyState = allocateRemainingLevelsByPriority(greedyState, context);
        greedyState = repairForcedCaps(greedyState, context);

        EquipmentRequest optimizedSetup = resultAssembler.toSetup(greedyState, context);
        String validationError = resultAssembler.validateFinalResult(greedyState, context);
        if (validationError != null) {
            return failedResponse(validationError, elapsedSeconds(startTime));
        }
        String forcedCapWarning = resultAssembler.forcedCapWarning(greedyState, context);
        OptimizationSummary summary = resultAssembler.createSummary(
                greedyState, context, elapsedSeconds(startTime), forcedCapWarning);
        return new OptimizationResponse(optimizedSetup, summary);
    }

    private BuildState selectBestGlobalState(BuildState greedyState, OptimizationContext context) {
        BuildState best = greedyState;
        for (BuildState candidate : buildBeamStates(context, 12)) {
            candidate = maximizeDrifSizes(candidate, context);
            candidate = allocateRemainingLevelsByPriority(candidate, context);
            if (isBetterState(candidate, best, context)) best = candidate;
        }
        return best;
    }

    /** Expands multiple candidate states per free position while preserving quantity profiles. */
    private List<BuildState> buildBeamStates(OptimizationContext context, int beamWidth) {
        BuildState initial = initialStateFactory.create(context);
        if (!satisfyMinimums(initial, context)) return List.of();

        List<BuildState> beam = List.of(initial);
        for (SlotContext slot : context.slots()) {
            if (isDeadlineExceeded(context)) return beam;
            if (!slot.optimizable() || isSlotLocked(slot, context.request())) continue;

            for (int index = 0; index < slot.maxDrifs(); index++) {
                if (isDeadlineExceeded(context)) return beam;
                if (slot.lockedIndices().contains(index)) continue;
                List<BuildState> expanded = new ArrayList<>();

                for (BuildState state : beam) {
                    if (isDeadlineExceeded(context)) break;
                    List<Placement> placements = state.slots.get(slot.key());
                    if (index >= placements.size() || placements.get(index) != null) {
                        expanded.add(state);
                        continue;
                    }

                    // Pusta pozycja jest pełnoprawną alternatywą.
                    expanded.add(state);

                    for (DrifTemplate candidate : slot.candidates()) {
                        if (containsBonus(placements, candidate.getBonusType())
                                || globalCount(state, candidate.getBonusType(), context)
                                >= maxQuantity(candidate.getBonusType(), context.request())
                                || containsAnotherElemental(state, candidate, null)) {
                            continue;
                        }

                        for (Integer level : candidateLevels(state, slot, candidate)) {
                            BuildState trial = state.copy();
                            trial.setPlacement(slot.key(), index, new Placement(candidate, level, false));
                            if (fitsCapacity(trial.slots.get(slot.key()), slot)) {
                                expanded.add(trial);
                            }
                        }
                    }
                }

                beam = retainBeam(expanded, beamWidth, context);
                if (beam.isEmpty()) return List.of();
            }
        }

        return beam.stream()
                .filter(state -> minimumsSatisfied(state, context))
                .sorted(stateComparator(context))
                .toList();
    }

    private List<Integer> candidateLevels(BuildState state, SlotContext slot, DrifTemplate candidate) {
        int remaining = slot.capacity() - usedPower(state.slots.get(slot.key()));
        int highest = 0;
        for (int level = candidate.getSize().getMaxLevel(); level >= 1; level--) {
            if (power(candidate, level) <= remaining) {
                highest = level;
                break;
            }
        }
        if (highest == 0) return List.of();

        Set<Integer> levels = new TreeSet<>(Comparator.reverseOrder());
        levels.add(highest);
        for (int level : List.of(6, 11, 16, 21)) {
            if (level <= highest && level <= candidate.getSize().getMaxLevel()) levels.add(level);
        }
        return new ArrayList<>(levels);
    }

    private List<BuildState> retainBeam(List<BuildState> states, int beamWidth,
                                        OptimizationContext context) {
        Map<String, BuildState> bestByProfile = new LinkedHashMap<>();
        states.sort(stateComparator(context));
        for (BuildState state : states) {
            // Po przekroczeniu limitu czasu zachowujemy co najmniej pierwszy
            // poprawny stan. Inaczej timeout był błędnie raportowany jako
            // niemożliwe minima ilościowe.
            if (isDeadlineExceeded(context) && !bestByProfile.isEmpty()) break;
            if (minimumsSatisfied(state, context)) {
                bestByProfile.putIfAbsent(globalCountSignature(state, context), state);
            }
        }

        return bestByProfile.values().stream()
                .sorted(stateComparator(context))
                .limit(beamWidth)
                .toList();
    }

    private String globalCountSignature(BuildState state, OptimizationContext context) {
        return context.request().getPriorities().keySet().stream()
                .sorted(Comparator.comparing(Enum::name))
                .map(type -> type.name() + "=" + globalCount(state, type, context))
                .collect(Collectors.joining("|"));
    }

    private int priorityOf(DRIF_BONUS_TYPE type, OptimizationRequest request) {
        return request.getPriorities().getOrDefault(type, 0);
    }

    private BuildState buildGreedyState(OptimizationContext context) {
        BuildState state = initialStateFactory.create(context);
        resultAssembler.calibrateCalculatorBaseline(state, context);
        if (!satisfyMinimums(state, context)) {
            return null;
        }

        satisfyCriticalBonuses(state, context);
        satisfyTargetValues(state, context);

        Map<DRIF_BONUS_TYPE, Integer> globalCounts = new HashMap<>();
        for (List<Placement> placements : state.slots.values()) {
            for (Placement placement : placements) {
                if (placement != null) {
                    globalCounts.merge(placement.drif().getBonusType(), 1, Integer::sum);
                }
            }
        }

        for (SlotContext slot : context.slots()) {
            if (!slot.optimizable() || isSlotLocked(slot, context.request())) continue;

            for (int index = 0; index < slot.maxDrifs(); index++) {
                if (slot.lockedIndices().contains(index)) continue;
                PlacementChoice best = null;
                for (DrifTemplate candidate : slot.candidates()) {
                    Double target = targetFor(candidate.getBonusType(), context.request());
                    if (target != null && calculatedValue(state, candidate.getBonusType(), context)
                            >= target - TARGET_TOLERANCE) {
                        continue;
                    }
                    if (containsBonus(state.slots.get(slot.key()), candidate.getBonusType())) continue;
                    if (globalCounts.getOrDefault(candidate.getBonusType(), 0)
                            >= maxQuantity(candidate.getBonusType(), context.request())) continue;
                    if (containsAnotherElemental(state, candidate, null)) continue;

                    Integer level = highestFittingLevel(state, slot, candidate);
                    if (level == null) continue;

                    BuildState trial = state.copy();
                    putNextFree(trial, slot, new Placement(candidate, level, false));
                    double candidateScore = score(trial, context) - score(state, context);
                    if (best == null || candidateScore > best.gain() + MIN_ACCEPTED_GAIN
                            || (Math.abs(candidateScore - best.gain()) <= MIN_ACCEPTED_GAIN
                            && isEarlierPlacement(slot, candidate, level, best, context))) {
                        best = new PlacementChoice(candidate, level, candidateScore);
                    }
                }

                if (best == null || best.gain() <= MIN_ACCEPTED_GAIN) break;
                putNextFree(state, slot, new Placement(best.drif(), best.level(), false));
                globalCounts.merge(best.drif().getBonusType(), 1, Integer::sum);
            }
        }
        return state;
    }

    /** Reserves at least one drif for every modifier marked as critical. */
    private void satisfyCriticalBonuses(BuildState state, OptimizationContext context) {
        List<DRIF_BONUS_TYPE> criticalTypes = context.request().getPriorities().keySet().stream()
                .filter(type -> isCritical(type, context.request()))
                .filter(type -> globalCount(state, type, context) == 0)
                .sorted(Comparator
                        .comparing((DRIF_BONUS_TYPE type) -> context.request().getPriorities().getOrDefault(type, 0), Comparator.reverseOrder())
                        .thenComparing(Enum::name))
                .toList();

        for (DRIF_BONUS_TYPE type : criticalTypes) {
            if (globalCount(state, type, context) > 0) continue;
            RequiredPlacementChoice best = null;
            for (SlotContext slot : context.slots()) {
                if (!slot.optimizable() || isSlotLocked(slot, context.request())) continue;
                List<Placement> placements = state.slots.get(slot.key());
                if (!hasFreeDrifPosition(placements, slot) || containsBonus(placements, type)) continue;

                for (DrifTemplate candidate : slot.candidates()) {
                    if (candidate.getBonusType() != type
                            || globalCount(state, type, context) >= maxQuantity(type, context.request())
                            || containsAnotherElemental(state, candidate, null)) continue;
                    Integer level = highestFittingLevel(state, slot, candidate);
                    if (level == null) continue;

                    BuildState trial = state.copy();
                    putNextFree(trial, slot, new Placement(candidate, level, false));
                    double gain = score(trial, context) - score(state, context);
                    RequiredPlacementChoice choice = new RequiredPlacementChoice(slot, candidate, level, gain);
                    if (best == null || gain > best.gain() + MIN_ACCEPTED_GAIN
                            || (Math.abs(gain - best.gain()) <= MIN_ACCEPTED_GAIN
                            && isEarlierPlacement(slot, candidate, level, best, context))) {
                        best = choice;
                    }
                }
            }
            if (best != null) {
                putNextFree(state, best.slot(), new Placement(best.drif(), best.level(), false));
            }
        }
    }

    /** Fills only safe remaining capacity while preserving limits and achieved targets. */
    private BuildState fillResidualCapacity(BuildState state, OptimizationContext context) {
        int maxSteps = context.slots().stream().mapToInt(SlotContext::maxDrifs).sum();
        for (int step = 0; step < maxSteps; step++) {
            PlacementChoice best = null;
            SlotContext bestSlot = null;

            for (SlotContext slot : context.slots()) {
                if (!slot.optimizable() || isSlotLocked(slot, context.request())) continue;
                List<Placement> placements = state.slots.get(slot.key());
                if (!hasFreeDrifPosition(placements, slot)) continue;

                for (DrifTemplate candidate : slot.candidates()) {
                    DRIF_BONUS_TYPE type = candidate.getBonusType();
                    Double target = targetFor(type, context.request());
                    if (target != null && calculatedValue(state, type, context) >= target - TARGET_TOLERANCE) continue;
                    if (containsBonus(placements, type)
                            || globalCount(state, type, context) >= maxQuantity(type, context.request())
                            || containsAnotherElemental(state, candidate, null)) continue;

                    Integer level = highestFittingLevel(state, slot, candidate);
                    if (level == null) continue;
                    BuildState trial = state.copy();
                    putNextFree(trial, slot, new Placement(candidate, level, false));
                    if (!minimumsSatisfied(trial, context)) continue;

                    double gain = score(trial, context) - score(state, context);
                    int candidatePower = power(candidate, level);
                    int currentCount = globalCount(state, type, context);
                    boolean lightOptionalDrif = candidatePower <= 1 && currentCount < 3;
                    if (gain < -MAX_RESIDUAL_FILL_LOSS && !lightOptionalDrif) continue;

                    double selectionScore = gain
                            - candidatePower * 0.50
                            - Math.max(0, currentCount - 3) * 15.0
                            + (isCritical(type, context.request()) ? 100.0 : 0.0);
                    PlacementChoice choice = new PlacementChoice(candidate, level, selectionScore);
                    if (best == null || selectionScore > best.gain() + MIN_ACCEPTED_GAIN
                            || (Math.abs(selectionScore - best.gain()) <= MIN_ACCEPTED_GAIN
                            && isEarlierPlacement(slot, candidate, level, best, context))) {
                        best = choice;
                        bestSlot = slot;
                    }
                }
            }

            if (best == null || bestSlot == null) break;
            putNextFree(state, bestSlot, new Placement(best.drif(), best.level(), false));
        }
        return state;
    }

    /** Reserves capacity for value targets, especially forced caps, before lower priorities. */
    private void satisfyTargetValues(BuildState state, OptimizationContext context) {
        List<DRIF_BONUS_TYPE> targets = context.request().getPriorities().keySet().stream()
                .filter(type -> targetFor(type, context.request()) != null)
                .sorted(Comparator
                        .comparing((DRIF_BONUS_TYPE type) -> isForcedCap(type, context.request()), Comparator.reverseOrder())
                        .thenComparing(type -> context.request().getPriorities().getOrDefault(type, 0), Comparator.reverseOrder())
                        .thenComparing(Enum::name))
                .toList();

        for (DRIF_BONUS_TYPE type : targets) {
            double target = targetFor(type, context.request());
            int guard = 0;
            while (calculatedValue(state, type, context) + TARGET_TOLERANCE < target
                    && guard++ < MAX_GLOBAL_DRIFS_PER_TYPE) {
                RequiredPlacementChoice best = null;
                double bestDistance = Double.POSITIVE_INFINITY;

                for (SlotContext slot : context.slots()) {
                    if (!slot.optimizable() || isSlotLocked(slot, context.request())) continue;
                    List<Placement> placements = state.slots.get(slot.key());
                    if (!hasFreeDrifPosition(placements, slot)) continue;

                    for (DrifTemplate candidate : slot.candidates()) {
                        if (candidate.getBonusType() != type
                                || containsBonus(placements, type)
                                || globalCount(state, type, context) >= maxQuantity(type, context.request())
                                || containsAnotherElemental(state, candidate, null)) continue;

                        Integer highestLevel = highestFittingLevel(state, slot, candidate);
                        if (highestLevel == null) continue;
                        // Najpierw używamy najwyższego poziomu, aby osiągać
                        // cap możliwie małą liczbą drifów. Korekta poziomu do
                        // dokładnej wartości odbywa się później.
                        for (Integer level : List.of(highestLevel)) {
                            BuildState trial = state.copy();
                            putNextFree(trial, slot, new Placement(candidate, level, false));
                            double resultingValue = currentValue(trial, type, context);
                            double distance = targetDistance(resultingValue, target);
                            if (best == null || distance < bestDistance - MIN_ACCEPTED_GAIN
                                    || (Math.abs(distance - bestDistance) <= MIN_ACCEPTED_GAIN
                                    && isEarlierPlacement(slot, candidate, level, best, context))) {
                                bestDistance = distance;
                                best = new RequiredPlacementChoice(slot, candidate, level, -distance);
                            }
                        }
                    }
                }

                if (best == null) break;
                putNextFree(state, best.slot(), new Placement(best.drif(), best.level(), false));
            }
        }
    }

    private double targetDistance(double value, double target) {
        return value < target ? target - value : (value - target) * 0.05;
    }

    /** Repairs cap rounding using the real calculator without changing locks or minimums. */
    private BuildState repairForcedCaps(BuildState state, OptimizationContext context) {
        List<DRIF_BONUS_TYPE> caps = context.request().getPriorities().keySet().stream()
                .filter(type -> isForcedCap(type, context.request()))
                .sorted(Comparator.comparing(Enum::name))
                .toList();

        for (DRIF_BONUS_TYPE type : caps) {
            double target = targetFor(type, context.request());
            boolean changed = true;
            while (changed && calculatedValue(state, type, context) >= target - TARGET_TOLERANCE) {
                changed = false;
                BuildState bestState = null;
                double bestExcess = Double.POSITIVE_INFINITY;
                for (SlotContext slot : context.slots()) {
                    if (!slot.optimizable() || isSlotLocked(slot, context.request())) continue;
                    List<Placement> placements = state.slots.get(slot.key());
                    for (int index = 0; index < Math.min(placements.size(), slot.maxDrifs()); index++) {
                        Placement placement = placements.get(index);
                        if (placement == null || placement.locked() || slot.lockedIndices().contains(index)
                                || placement.drif().getBonusType() != type) continue;

                        BuildState trial = state.copy();
                        trial.setPlacement(slot.key(), index, null);
                        normalizeSlotLevelsByPriority(trial, slot, context);
                        if (!minimumsSatisfied(trial, context)) continue;
                        double trialValue = calculatedValue(trial, type, context);
                        if (trialValue < target - TARGET_TOLERANCE) continue;
                        double excess = trialValue - target;
                        if (bestState == null || excess < bestExcess - MIN_ACCEPTED_GAIN
                                || (Math.abs(excess - bestExcess) <= MIN_ACCEPTED_GAIN
                                && isBetterState(trial, bestState, context))) {
                            bestState = trial;
                            bestExcess = excess;
                        }
                    }
                }
                if (bestState != null) {
                    state = bestState;
                    changed = true;
                }
            }
        }
        return state;
    }

    /** Replaces each unlocked drif with the largest version allowed for the item. */
    private BuildState maximizeDrifSizes(BuildState state, OptimizationContext context) {
        for (SlotContext slot : context.slots()) {
            if (!slot.optimizable() || isSlotLocked(slot, context.request())) continue;
            List<Placement> placements = state.slots.get(slot.key());
            for (int index = 0; index < Math.min(placements.size(), slot.maxDrifs()); index++) {
                Placement current = placements.get(index);
                if (current == null || current.locked() || slot.lockedIndices().contains(index)) continue;

                DrifTemplate largest = slot.candidates().stream()
                        .filter(candidate -> candidate.getBonusType() == current.drif().getBonusType())
                        .max(Comparator
                                .comparingInt((DrifTemplate candidate) -> candidate.getSize().getMaxLevel())
                                .thenComparing(DrifTemplate::getId, Comparator.reverseOrder()))
                        .orElse(current.drif());
                int level = Math.min(current.level(), largest.getSize().getMaxLevel());
                state.setPlacement(slot.key(), index, new Placement(largest, level, false));
            }
        }
        return state;
    }

    /** Allocates remaining capacity to the highest-priority drifs without exceeding targets. */
    private BuildState allocateRemainingLevelsByPriority(BuildState state, OptimizationContext context) {
        for (SlotContext slot : context.slots()) {
            if (!slot.optimizable() || isSlotLocked(slot, context.request())) continue;
            normalizeSlotLevelsByPriority(state, slot, context);
        }
        return state;
    }

    private void normalizeSlotLevelsByPriority(BuildState state, SlotContext slot,
                                               OptimizationContext context) {
        List<Placement> placements = state.slots.get(slot.key());
        List<Integer> indices = new ArrayList<>();
        for (int index = 0; index < Math.min(placements.size(), slot.maxDrifs()); index++) {
            Placement placement = placements.get(index);
            if (placement == null || placement.locked() || slot.lockedIndices().contains(index)) continue;
            int baseTierMax = Math.min(6, placement.drif().getSize().getMaxLevel());
            state.setPlacement(slot.key(), index, new Placement(placement.drif(), baseTierMax, false));
            indices.add(index);
        }
        indices.sort(Comparator
                .comparingInt((Integer index) -> priorityOf(
                        placements.get(index).drif().getBonusType(), context.request())).reversed()
                .thenComparing(index -> placements.get(index).drif().getBonusType().name())
                .thenComparingInt(Integer::intValue));

        for (Integer index : indices) {
            Placement current = placements.get(index);
            int availablePower = slot.capacity() - usedPowerExcept(placements, index);
            int selectedLevel = highestLevelForPower(current.drif(), availablePower);
            state.setPlacement(slot.key(), index, new Placement(current.drif(), selectedLevel, false));
        }
    }

    private double calculatedValue(BuildState state, DRIF_BONUS_TYPE type, OptimizationContext context) {
        return stateEvaluator.calculatedValue(state, type, context);
    }

    private boolean isEarlierPlacement(SlotContext slot, DrifTemplate candidate, int level,
                                       RequiredPlacementChoice current, OptimizationContext context) {
        int slotComparison = slot.key().compareTo(current.slot().key());
        if (slotComparison != 0) return slotComparison < 0;
        int candidateComparison = Long.compare(candidate.getId(), current.drif().getId());
        if (candidateComparison != 0) return candidateComparison < 0;
        return level < current.level();
    }

    private boolean isEarlierPlacement(SlotContext slot, DrifTemplate candidate, int level,
                                       PlacementChoice current, OptimizationContext context) {
        int candidateComparison = Long.compare(candidate.getId(), current.drif().getId());
        if (candidateComparison != 0) return candidateComparison < 0;
        return level < current.level();
    }

    private double currentValue(BuildState state, DRIF_BONUS_TYPE type, OptimizationContext context) {
        return stateEvaluator.currentValue(state, type, context);
    }

    /** Fulfills hard minimum quantities before optimizing remaining capacity. */
    private boolean satisfyMinimums(BuildState state, OptimizationContext context) {
        while (true) {
            DRIF_BONUS_TYPE requiredType = null;
            int fewestOptions = Integer.MAX_VALUE;

            for (Map.Entry<DRIF_BONUS_TYPE, OptimizationRequest.QuantityRange> entry
                    : context.sortedQuantities()) {
                int deficit = entry.getValue().getMin() - globalCount(state, entry.getKey(), context);
                if (deficit <= 0) continue;

                int options = countFeasiblePlacements(state, entry.getKey(), context);
                if (options == 0) return false;
                if (options < fewestOptions) {
                    fewestOptions = options;
                    requiredType = entry.getKey();
                }
            }

            if (requiredType == null) return true;

            RequiredPlacementChoice best = null;
            for (SlotContext slot : context.slots()) {
                if (!slot.optimizable() || isSlotLocked(slot, context.request())) continue;
                List<Placement> placements = state.slots.get(slot.key());
                if (!hasFreeDrifPosition(placements, slot)) continue;
                for (DrifTemplate candidate : slot.candidates()) {
                    if (candidate.getBonusType() != requiredType
                            || containsBonus(placements, requiredType)
                            || globalCount(state, requiredType, context) >= maxQuantity(requiredType, context.request())
                            || containsAnotherElemental(state, candidate, null)) {
                        continue;
                    }

                    Integer level = lowestTierFittingLevel(state, slot, candidate);
                    if (level == null) continue;

                    BuildState trial = state.copy();
                    putNextFree(trial, slot, new Placement(candidate, level, false));
                    double gain = score(trial, context) - score(state, context);
                    if (best == null || gain > best.gain() + MIN_ACCEPTED_GAIN
                            || (Math.abs(gain - best.gain()) <= MIN_ACCEPTED_GAIN
                            && isEarlierPlacement(slot, candidate, level, best, context))) {
                        best = new RequiredPlacementChoice(slot, candidate, level, gain);
                    }
                }
            }

            if (best == null) return false;
            putNextFree(state, best.slot(), new Placement(best.drif(), best.level(), false));
        }
    }

    private int countFeasiblePlacements(BuildState state, DRIF_BONUS_TYPE type,
                                        OptimizationContext context) {
        int options = 0;
        for (SlotContext slot : context.slots()) {
            if (!slot.optimizable() || isSlotLocked(slot, context.request())) continue;
            List<Placement> placements = state.slots.get(slot.key());
            if (!hasFreeDrifPosition(placements, slot)) continue;
            if (containsBonus(placements, type)) continue;
            for (DrifTemplate candidate : slot.candidates()) {
                if (candidate.getBonusType() != type) continue;
                if (containsAnotherElemental(state, candidate, null)) continue;
                if (highestFittingLevel(state, slot, candidate) != null) {
                    options++;
                    break;
                }
            }
        }
        return options;
    }

    private boolean hasFreeDrifPosition(List<Placement> placements, SlotContext slot) {
        if (placements.size() < slot.maxDrifs()) return true;
        for (int index = 0; index < Math.min(placements.size(), slot.maxDrifs()); index++) {
            if (!slot.lockedIndices().contains(index) && placements.get(index) == null) return true;
        }
        return false;
    }

    /** Performs bounded deterministic local search using one lexicographic score. */
    private BuildState refineDeterministically(BuildState state, OptimizationContext context) {
        for (int round = 0; round < 3 && !isDeadlineExceeded(context); round++) {
            String before = signature(state);
            state = improveReplacements(state, context);
            state = improveSwaps(state, context);
            state = consolidateForcedCaps(state, context);
            state = reducePenalties(state, context);
            state = repairForcedCaps(state, context);
            state = allocateRemainingLevelsByPriority(state, context);
            if (before.equals(signature(state))) break;
        }
        return state;
    }

    /** Applies a cap move as a combined replacement and removal operation. */
    private BuildState consolidateForcedCaps(BuildState state, OptimizationContext context) {
        BuildState best = state;
        for (DRIF_BONUS_TYPE type : context.request().getPriorities().keySet().stream()
                .filter(candidate -> isForcedCap(candidate, context.request()))
                .sorted(Comparator.comparing(Enum::name)).toList()) {
            double target = targetFor(type, context.request());
            for (int first = 0; first < context.slots().size(); first++) {
                SlotContext source = context.slots().get(first);
                if (!source.optimizable() || isSlotLocked(source, context.request())) continue;
                List<Placement> sourcePlacements = state.slots.get(source.key());
                for (int sourceIndex = 0; sourceIndex < Math.min(sourcePlacements.size(), source.maxDrifs()); sourceIndex++) {
                    Placement capPlacement = sourcePlacements.get(sourceIndex);
                    if (capPlacement == null || capPlacement.locked() || source.lockedIndices().contains(sourceIndex)
                            || capPlacement.drif().getBonusType() != type) continue;
                    for (int second = 0; second < context.slots().size(); second++) {
                        SlotContext targetSlot = context.slots().get(second);
                        if (targetSlot.drifBonus() <= source.drifBonus() + MIN_ACCEPTED_GAIN
                                || !targetSlot.optimizable() || isSlotLocked(targetSlot, context.request())) continue;
                        List<Placement> targetPlacements = state.slots.get(targetSlot.key());
                        for (int targetIndex = 0; targetIndex < Math.min(targetPlacements.size(), targetSlot.maxDrifs()); targetIndex++) {
                            Placement other = targetPlacements.get(targetIndex);
                            if (other == null || other.locked() || targetSlot.lockedIndices().contains(targetIndex)
                                    || other.drif().getBonusType() == type) continue;
                            if (!isValidForSlot(capPlacement.drif(), targetSlot)
                                    || !isValidForSlot(other.drif(), source)) continue;
                            if (containsBonusExcept(sourcePlacements, other.drif().getBonusType(), sourceIndex)
                                    || containsBonusExcept(targetPlacements, type, targetIndex)) continue;

                            BuildState relocated = state.copy();
                            relocated.setPlacement(source.key(), sourceIndex,
                                    new Placement(other.drif(), Math.min(6, other.drif().getSize().getMaxLevel()), false));
                            relocated.setPlacement(targetSlot.key(), targetIndex,
                                    new Placement(capPlacement.drif(), Math.min(6, capPlacement.drif().getSize().getMaxLevel()), false));
                            normalizeSlotLevelsByPriority(relocated, source, context);
                            normalizeSlotLevelsByPriority(relocated, targetSlot, context);
                            if (!fitsCapacity(relocated.slots.get(source.key()), source)
                                    || !fitsCapacity(relocated.slots.get(targetSlot.key()), targetSlot)) continue;

                            for (SlotContext removalSlot : context.slots()) {
                                List<Placement> removalPlacements = relocated.slots.get(removalSlot.key());
                                for (int removalIndex = 0; removalIndex < Math.min(removalPlacements.size(), removalSlot.maxDrifs()); removalIndex++) {
                                    Placement removable = removalPlacements.get(removalIndex);
                                    if (removable == null || removable.locked()
                                            || removalSlot.lockedIndices().contains(removalIndex)
                                            || removable.drif().getBonusType() != type
                                            || (removalSlot.key().equals(targetSlot.key()) && removalIndex == targetIndex)) continue;
                                    BuildState trial = relocated.copy();
                                    trial.setPlacement(removalSlot.key(), removalIndex, null);
                                    normalizeSlotLevelsByPriority(trial, removalSlot, context);
                                    if (!minimumsSatisfied(trial, context)
                                            || calculatedValue(trial, type, context) < target - TARGET_TOLERANCE) continue;
                                    if (isBetterState(trial, best, context)) best = trial;
                                }
                            }
                        }
                    }
                }
            }
            state = best;
        }
        return best;
    }

    private BuildState improveReplacements(BuildState state, OptimizationContext context) {
        for (int round = 0; round < 3 && !isDeadlineExceeded(context); round++) {
            BuildState bestState = state;
            for (SlotContext slot : context.slots()) {
                if (isDeadlineExceeded(context)) return state;
                if (!slot.optimizable() || isSlotLocked(slot, context.request())) continue;
                List<Placement> placements = state.slots.get(slot.key());
                for (int index = 0; index < placements.size(); index++) {
                    if (isDeadlineExceeded(context)) return state;
                    Placement current = placements.get(index);
                    if (current == null || current.locked() || slot.lockedIndices().contains(index)) continue;
                    for (DrifTemplate candidate : slot.candidates()) {
                        if (isDeadlineExceeded(context)) return state;
                        if (candidate.getBonusType() == current.drif().getBonusType()) continue;
                        if (containsBonusExcept(placements, candidate.getBonusType(), index)) continue;
                        if (globalCountExcept(state, candidate.getBonusType(), current.drif().getBonusType(), context)
                                >= maxQuantity(candidate.getBonusType(), context.request())) continue;
                        if (containsAnotherElemental(state, candidate, current.drif())) continue;

                        BuildState trial = state.copy();
                        trial.setPlacement(slot.key(), index,
                                new Placement(candidate, Math.min(6, candidate.getSize().getMaxLevel()), false));
                        normalizeSlotLevelsByPriority(trial, slot, context);
                        if (!fitsCapacity(trial.slots.get(slot.key()), slot)) continue;
                        if (!minimumsSatisfied(trial, context)) continue;
                        if (isBetterState(trial, bestState, context)) bestState = trial;
                    }
                }
            }
            if (signature(bestState).equals(signature(state))) break;
            state = bestState;
        }
        return state;
    }

    private BuildState improveSwaps(BuildState state, OptimizationContext context) {
        BuildState bestState = state;
        for (int first = 0; first < context.slots().size(); first++) {
            if (isDeadlineExceeded(context)) return state;
            SlotContext firstSlot = context.slots().get(first);
            if (!firstSlot.optimizable() || isSlotLocked(firstSlot, context.request())) continue;
            List<Placement> firstPlacements = state.slots.get(firstSlot.key());
            for (int second = first + 1; second < context.slots().size(); second++) {
                if (isDeadlineExceeded(context)) return state;
                SlotContext secondSlot = context.slots().get(second);
                if (!secondSlot.optimizable() || isSlotLocked(secondSlot, context.request())) continue;
                List<Placement> secondPlacements = state.slots.get(secondSlot.key());
                for (int i = 0; i < firstPlacements.size(); i++) {
                    if (isDeadlineExceeded(context)) return state;
                    Placement firstPlacement = firstPlacements.get(i);
                    if (firstPlacement == null || firstSlot.lockedIndices().contains(i)) continue;
                    for (int j = 0; j < secondPlacements.size(); j++) {
                        if (isDeadlineExceeded(context)) return state;
                        Placement secondPlacement = secondPlacements.get(j);
                        if (secondPlacement == null || secondSlot.lockedIndices().contains(j)) continue;
                        if (!isValidForSlot(secondPlacement.drif(), firstSlot)
                                || !isValidForSlot(firstPlacement.drif(), secondSlot)) continue;
                        if (containsBonusExcept(firstPlacements, secondPlacement.drif().getBonusType(), i)
                                || containsBonusExcept(secondPlacements, firstPlacement.drif().getBonusType(), j)) continue;

                        BuildState trial = state.copy();
                        trial.setPlacement(firstSlot.key(), i, new Placement(secondPlacement.drif(),
                                Math.min(6, secondPlacement.drif().getSize().getMaxLevel()), false));
                        trial.setPlacement(secondSlot.key(), j, new Placement(firstPlacement.drif(),
                                Math.min(6, firstPlacement.drif().getSize().getMaxLevel()), false));
                        normalizeSlotLevelsByPriority(trial, firstSlot, context);
                        normalizeSlotLevelsByPriority(trial, secondSlot, context);
                        if (!fitsCapacity(trial.slots.get(firstSlot.key()), firstSlot)
                                || !fitsCapacity(trial.slots.get(secondSlot.key()), secondSlot)) continue;
                        if (!minimumsSatisfied(trial, context)) continue;
                        if (isBetterState(trial, bestState, context)) bestState = trial;
                    }
                }
            }
        }
        return bestState;
    }

    private BuildState reducePenalties(BuildState state, OptimizationContext context) {
        boolean changed = true;
        int guard = 0;
        while (changed && guard++ < 100) {
            if (isDeadlineExceeded(context)) return state;
            changed = false;
            for (SlotContext slot : context.slots()) {
                if (isDeadlineExceeded(context)) return state;
                if (!slot.optimizable() || isSlotLocked(slot, context.request())) continue;
                List<Placement> placements = state.slots.get(slot.key());
                for (int index = 0; index < placements.size(); index++) {
                    if (isDeadlineExceeded(context)) return state;
                    if (placements.get(index) == null || slot.lockedIndices().contains(index)) continue;
                    BuildState trial = state.copy();
                    trial.setPlacement(slot.key(), index, null);
                    normalizeSlotLevelsByPriority(trial, slot, context);
                    if (!minimumsSatisfied(trial, context)) continue;
                    if (isBetterState(trial, state, context)) {
                        state = trial;
                        changed = true;
                        break;
                    }
                }
                if (changed) break;
            }
        }
        return state;
    }

    private boolean isBetterState(BuildState candidate, BuildState current,
                                  OptimizationContext context) {
        return stateEvaluator.isBetterState(candidate, current, context);
    }

    private Comparator<BuildState> stateComparator(OptimizationContext context) {
        return stateEvaluator.stateComparator(context);
    }

    private double score(BuildState state, OptimizationContext context) {
        return stateEvaluator.score(state, context);
    }

    private OptimizationResponse failedResponse(String message, double seconds) {
        return new OptimizationResponse(new EquipmentRequest(),
                new OptimizationSummary(false, message, 0, 0, seconds));
    }

    private boolean isSlotLocked(SlotContext slot, OptimizationRequest request) {
        return request.getLockedSlots() != null && request.getLockedSlots().contains(slot.key());
    }

    private boolean isValidForSlot(DrifTemplate drif, SlotContext slot) {
        return validator.isValidDrifSizeForTier(drif, slot.item())
                && validator.isElementalDrifPositionValid(drif, slot.key());
    }

    private boolean containsAnotherElemental(BuildState state, DrifTemplate candidate, DrifTemplate replaced) {
        if (!rules.isElementalDamage(candidate.getBonusType())) return false;
        for (List<Placement> placements : state.slots.values()) {
            for (Placement placement : placements) {
                if (placement != null && rules.isElementalDamage(placement.drif().getBonusType())
                        && (replaced == null || placement.drif().getBonusType() != replaced.getBonusType())) return true;
            }
        }
        return false;
    }

    private boolean containsBonus(List<Placement> placements, DRIF_BONUS_TYPE type) {
        return placements.stream().filter(Objects::nonNull).anyMatch(p -> p.drif().getBonusType() == type);
    }

    private boolean containsBonusExcept(List<Placement> placements, DRIF_BONUS_TYPE type, int ignoredIndex) {
        for (int i = 0; i < placements.size(); i++) {
            if (i != ignoredIndex && placements.get(i) != null && placements.get(i).drif().getBonusType() == type) return true;
        }
        return false;
    }

    private int globalCount(BuildState state, DRIF_BONUS_TYPE type, OptimizationContext context) {
        return stateEvaluator.globalCount(state, type, context);
    }

    private int globalCountExcept(BuildState state, DRIF_BONUS_TYPE candidate,
                                  DRIF_BONUS_TYPE replaced, OptimizationContext context) {
        return stateEvaluator.globalCountExcept(state, candidate, replaced, context);
    }

    private boolean minimumsSatisfied(BuildState state, OptimizationContext context) {
        return stateEvaluator.minimumsSatisfied(state, context);
    }

    private void putNextFree(BuildState state, SlotContext slot, Placement placement) {
        List<Placement> placements = state.slots.get(slot.key());
        int hardLimit = Math.max(0, slot.maxDrifs());
        for (int i = 0; i < Math.min(placements.size(), hardLimit); i++) {
            if (!slot.lockedIndices().contains(i) && placements.get(i) == null) {
                state.setPlacement(slot.key(), i, placement);
                return;
            }
        }
        // Sloty optymalizowalne są prealokowane do maxDrifs. Nie dopisujemy
        // elementu poza limitem, nawet gdy lista zawiera dodatkowy indeks
        // wynikający ze starej lub niepoprawnej blokady.
    }

    private String signature(BuildState state) {
        return state.signature();
    }

    private double elapsedSeconds(long startTime) {
        return (System.nanoTime() - startTime) / 1_000_000_000.0;
    }

    private boolean isDeadlineExceeded(OptimizationContext context) {
        return context.searchBudget().consume();
    }

}
