package pl.brokenranks.tool.broken_ranks_tool.optimization.service.impl;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_BONUS_TYPE;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_SIZE;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.RARITY;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.rules.EquipmentRulesRegistry;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.util.RomanNumeralParser;
import pl.brokenranks.tool.broken_ranks_tool.equipment.dto.EquipmentRequest;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.DrifTemplate;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.ItemTemplate;
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
import java.util.EnumMap;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.TreeSet;
import java.util.function.Function;
import java.util.stream.Collectors;

/** Heuristic optimizer that balances drif priorities, caps, capacity, and locks. */
@Service
@RequiredArgsConstructor
public class CustomModsOptimizationServiceImpl implements ModsOptimizationService {

    private static final int MAX_GLOBAL_DRIFS_PER_TYPE = 12;
    private static final int MAX_SEARCH_STEPS = 100_000;
    private static final double MIN_ACCEPTED_GAIN = 0.0001;
    private static final double TARGET_TOLERANCE = 0.50;
    private static final double MAX_RESIDUAL_FILL_LOSS = 15.0;

    private final DrifTemplateRepository drifRepository;
    private final ItemTemplateRepository itemRepository;
    private final EquipmentValidator validator;
    private final EquipmentRulesRegistry rules;
    private final ItemStatProcessor itemStatProcessor;
    private final OptimizationLockService lockService;
    private final EquipmentStatsCalculatorService calculatorService;

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

        OptimizationContext context = prepareContext(request);
        if (context.slots.isEmpty()) {
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

        EquipmentRequest optimizedSetup = toSetup(greedyState, context);
        String validationError = validateFinalResult(greedyState, context);
        if (validationError != null) {
            return failedResponse(validationError, elapsedSeconds(startTime));
        }
        OptimizationSummary summary = createSummary(greedyState, context, elapsedSeconds(startTime));
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
        BuildState initial = createInitialState(context);
        if (!satisfyMinimums(initial, context)) return List.of();

        List<BuildState> beam = List.of(initial);
        for (SlotContext slot : context.slots) {
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
                    expanded.add(state.copy());

                    for (DrifTemplate candidate : slot.candidates()) {
                        if (containsBonus(placements, candidate.getBonusType())
                                || globalCount(state, candidate.getBonusType())
                                >= maxQuantity(candidate.getBonusType(), context.request())
                                || containsAnotherElemental(state, candidate, null)) {
                            continue;
                        }

                        for (Integer level : candidateLevels(state, slot, candidate)) {
                            BuildState trial = state.copy();
                            trial.slots.get(slot.key()).set(index, new Placement(candidate, level, false));
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

    private List<BuildState> selectDiverseStates(List<BuildState> states, int limit,
                                                  OptimizationContext context) {
        Map<String, BuildState> selected = new LinkedHashMap<>();
        for (BuildState state : states) {
            selected.putIfAbsent(globalCountSignature(state, context), state);
            if (selected.size() >= limit) break;
        }
        return new ArrayList<>(selected.values());
    }

    private String globalCountSignature(BuildState state, OptimizationContext context) {
        return context.request().getPriorities().keySet().stream()
                .sorted(Comparator.comparing(Enum::name))
                .map(type -> type.name() + "=" + globalCount(state, type))
                .collect(Collectors.joining("|"));
    }

    private OptimizationContext prepareContext(OptimizationRequest request) {
        List<Long> itemIds = request.getOriginalSlots().values().stream()
                .filter(Objects::nonNull)
                .map(EquipmentRequest.SlotData::getItemId)
                .filter(Objects::nonNull)
                .sorted()
                .toList();

        Map<Long, ItemTemplate> items = itemRepository.findAllById(itemIds).stream()
                .sorted(Comparator.comparing(ItemTemplate::getId))
                .collect(Collectors.toMap(ItemTemplate::getId, Function.identity(), (left, right) -> left, LinkedHashMap::new));
        Map<Long, DrifTemplate> drifs = drifRepository.findAll().stream()
                .sorted(Comparator.comparing(DrifTemplate::getId))
                .collect(Collectors.toMap(DrifTemplate::getId, Function.identity(), (left, right) -> left, LinkedHashMap::new));

        List<SlotContext> slots = new ArrayList<>();
        request.getOriginalSlots().entrySet().stream()
                .sorted(Map.Entry.comparingByKey())
                .forEach(entry -> {
            EquipmentRequest.SlotData slotData = entry.getValue();
            if (slotData == null || slotData.getItemId() == null) return;

            ItemTemplate item = items.get(slotData.getItemId());
            if (item == null || !validator.isValidItem(item, entry.getKey())) return;

            int stars = slotData.getItemStars() != null ? slotData.getItemStars() : 1;
            boolean special = item.getRarity() == RARITY.EPIC || item.getRarity() == RARITY.SET;
            int capacity = validator.calculateItemCapacity(item, stars);
            int maxDrifs = special ? 0 : calculateMaxDrifs(item, stars);
            double drifBonus = itemStatProcessor.calculateFinalDrifMod(item, stars);
            List<DrifTemplate> candidates = special ? List.of() : drifs.values().stream()
                    .filter(drif -> validator.isValidDrifSizeForTier(drif, item))
                    .filter(drif -> validator.isElementalDrifPositionValid(drif, entry.getKey()))
                    .filter(drif -> request.getPriorities().containsKey(drif.getBonusType()))
                    .collect(Collectors.toMap(
                            DrifTemplate::getBonusType,
                            Function.identity(),
                            this::preferLargerDrif,
                            () -> new EnumMap<>(DRIF_BONUS_TYPE.class)))
                    .values().stream()
                    .collect(Collectors.toCollection(ArrayList::new));

            Set<Integer> lockedIndices = request.getLockedDrifs() != null
                    ? request.getLockedDrifs().getOrDefault(entry.getKey(), Set.of())
                    : Set.of();
            slots.add(new SlotContext(
                    entry.getKey(), slotData, item, capacity, maxDrifs, drifBonus,
                    candidates, lockedIndices, special
            ));
                });

        slots.sort(Comparator.comparingDouble(SlotContext::drifBonus).reversed()
                .thenComparing(SlotContext::key));
        slots.forEach(slot -> slot.candidates().sort(Comparator
                .comparing((DrifTemplate drif) -> priorityOf(drif.getBonusType(), request), Comparator.reverseOrder())
                .thenComparing(drif -> drif.getBonusType().name())
                .thenComparing(DrifTemplate::getId)));
        return new OptimizationContext(request, items, drifs, slots, new SearchBudget(MAX_SEARCH_STEPS),
                new EnumMap<>(DRIF_BONUS_TYPE.class), new HashMap<>(), new HashMap<>());
    }

    private DrifTemplate preferLargerDrif(DrifTemplate left, DrifTemplate right) {
        int levelComparison = Integer.compare(left.getSize().getMaxLevel(), right.getSize().getMaxLevel());
        if (levelComparison != 0) return levelComparison > 0 ? left : right;
        return left.getId() <= right.getId() ? left : right;
    }

    private int priorityOf(DRIF_BONUS_TYPE type, OptimizationRequest request) {
        return request.getPriorities().getOrDefault(type, 0);
    }

    private BuildState buildGreedyState(OptimizationContext context) {
        BuildState state = createInitialState(context);
        calibrateCalculatorBaseline(state, context);
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

        for (SlotContext slot : context.slots) {
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
                    putNextFree(trial.slots.get(slot.key()), new Placement(candidate, level, false), slot.lockedIndices(), slot.maxDrifs());
                    double candidateScore = score(trial, context) - score(state, context);
                    if (best == null || candidateScore > best.gain() + MIN_ACCEPTED_GAIN
                            || (Math.abs(candidateScore - best.gain()) <= MIN_ACCEPTED_GAIN
                            && isEarlierPlacement(slot, candidate, level, best, context))) {
                        best = new PlacementChoice(candidate, level, candidateScore);
                    }
                }

                if (best == null || best.gain() <= MIN_ACCEPTED_GAIN) break;
                putNextFree(state.slots.get(slot.key()), new Placement(best.drif(), best.level(), false), slot.lockedIndices(), slot.maxDrifs());
                globalCounts.merge(best.drif().getBonusType(), 1, Integer::sum);
            }
        }
        return state;
    }

    /** Reserves at least one drif for every modifier marked as critical. */
    private void satisfyCriticalBonuses(BuildState state, OptimizationContext context) {
        List<DRIF_BONUS_TYPE> criticalTypes = context.request().getPriorities().keySet().stream()
                .filter(type -> isCritical(type, context.request()))
                .filter(type -> globalCount(state, type) == 0)
                .sorted(Comparator
                        .comparing((DRIF_BONUS_TYPE type) -> context.request().getPriorities().getOrDefault(type, 0), Comparator.reverseOrder())
                        .thenComparing(Enum::name))
                .toList();

        for (DRIF_BONUS_TYPE type : criticalTypes) {
            if (globalCount(state, type) > 0) continue;
            RequiredPlacementChoice best = null;
            for (SlotContext slot : context.slots) {
                if (!slot.optimizable() || isSlotLocked(slot, context.request())) continue;
                List<Placement> placements = state.slots.get(slot.key());
                if (!hasFreeDrifPosition(placements, slot) || containsBonus(placements, type)) continue;

                for (DrifTemplate candidate : slot.candidates()) {
                    if (candidate.getBonusType() != type
                            || globalCount(state, type) >= maxQuantity(type, context.request())
                            || containsAnotherElemental(state, candidate, null)) continue;
                    Integer level = highestFittingLevel(state, slot, candidate);
                    if (level == null) continue;

                    BuildState trial = state.copy();
                    putNextFree(trial.slots.get(slot.key()), new Placement(candidate, level, false), slot.lockedIndices(), slot.maxDrifs());
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
                putNextFree(state.slots.get(best.slot().key()),
                        new Placement(best.drif(), best.level(), false), best.slot().lockedIndices(), best.slot().maxDrifs());
            }
        }
    }

    /** Fills only safe remaining capacity while preserving limits and achieved targets. */
    private BuildState fillResidualCapacity(BuildState state, OptimizationContext context) {
        int maxSteps = context.slots.stream().mapToInt(SlotContext::maxDrifs).sum();
        for (int step = 0; step < maxSteps; step++) {
            PlacementChoice best = null;
            SlotContext bestSlot = null;

            for (SlotContext slot : context.slots) {
                if (!slot.optimizable() || isSlotLocked(slot, context.request())) continue;
                List<Placement> placements = state.slots.get(slot.key());
                if (!hasFreeDrifPosition(placements, slot)) continue;

                for (DrifTemplate candidate : slot.candidates()) {
                    DRIF_BONUS_TYPE type = candidate.getBonusType();
                    Double target = targetFor(type, context.request());
                    if (target != null && calculatedValue(state, type, context) >= target - TARGET_TOLERANCE) continue;
                    if (containsBonus(placements, type)
                            || globalCount(state, type) >= maxQuantity(type, context.request())
                            || containsAnotherElemental(state, candidate, null)) continue;

                    Integer level = highestFittingLevel(state, slot, candidate);
                    if (level == null) continue;
                    BuildState trial = state.copy();
                    putNextFree(trial.slots.get(slot.key()), new Placement(candidate, level, false), slot.lockedIndices(), slot.maxDrifs());
                    if (!minimumsSatisfied(trial, context)) continue;

                    double gain = score(trial, context) - score(state, context);
                    int candidatePower = power(candidate, level);
                    int currentCount = globalCount(state, type);
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
            putNextFree(state.slots.get(bestSlot.key()),
                    new Placement(best.drif(), best.level(), false), bestSlot.lockedIndices(), bestSlot.maxDrifs());
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

                for (SlotContext slot : context.slots) {
                    if (!slot.optimizable() || isSlotLocked(slot, context.request())) continue;
                    List<Placement> placements = state.slots.get(slot.key());
                    if (!hasFreeDrifPosition(placements, slot)) continue;

                    for (DrifTemplate candidate : slot.candidates()) {
                        if (candidate.getBonusType() != type
                                || containsBonus(placements, type)
                                || globalCount(state, type) >= maxQuantity(type, context.request())
                                || containsAnotherElemental(state, candidate, null)) continue;

                        Integer highestLevel = highestFittingLevel(state, slot, candidate);
                        if (highestLevel == null) continue;
                        // Najpierw używamy najwyższego poziomu, aby osiągać
                        // cap możliwie małą liczbą drifów. Korekta poziomu do
                        // dokładnej wartości odbywa się później.
                        for (Integer level : List.of(highestLevel)) {
                            BuildState trial = state.copy();
                            putNextFree(trial.slots.get(slot.key()), new Placement(candidate, level, false), slot.lockedIndices(), slot.maxDrifs());
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
                putNextFree(state.slots.get(best.slot().key()),
                        new Placement(best.drif(), best.level(), false), best.slot().lockedIndices(), best.slot().maxDrifs());
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
                for (SlotContext slot : context.slots) {
                    if (!slot.optimizable() || isSlotLocked(slot, context.request())) continue;
                    List<Placement> placements = state.slots.get(slot.key());
                    for (int index = 0; index < Math.min(placements.size(), slot.maxDrifs()); index++) {
                        Placement placement = placements.get(index);
                        if (placement == null || placement.locked() || slot.lockedIndices().contains(index)
                                || placement.drif().getBonusType() != type) continue;

                        BuildState trial = state.copy();
                        trial.slots.get(slot.key()).set(index, null);
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
        for (SlotContext slot : context.slots) {
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
                placements.set(index, new Placement(largest, level, false));
            }
        }
        return state;
    }

    /** Allocates remaining capacity to the highest-priority drifs without exceeding targets. */
    private BuildState allocateRemainingLevelsByPriority(BuildState state, OptimizationContext context) {
        for (SlotContext slot : context.slots) {
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
            placements.set(index, new Placement(placement.drif(), baseTierMax, false));
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
            placements.set(index, new Placement(current.drif(), selectedLevel, false));
        }
    }

    private double calculatedValue(BuildState state, DRIF_BONUS_TYPE type, OptimizationContext context) {
        return currentValue(state, type, context)
                + context.calculatorBaseline().getOrDefault(type, 0.0);
    }

    private void calibrateCalculatorBaseline(BuildState state, OptimizationContext context) {
        Map<String, String> stats = actualStats(state, context);
        for (DRIF_BONUS_TYPE type : context.request().getPriorities().keySet()) {
            if (!stats.containsKey(type.name())) continue;
            double actual = directedValue(type, parseCalculatedValue(stats.get(type.name())), context.request());
            context.calculatorBaseline().put(type, actual - currentValue(state, type, context));
        }
    }

    private Map<String, String> actualStats(BuildState state, OptimizationContext context) {
        String key = signature(state);
        Map<String, String> cached = context.calculatorCache().get(key);
        if (cached != null) return cached;
        try {
            Map<String, String> calculated = calculatorService.calculateTotalStats(toSetup(state, context));
            context.calculatorCache().put(key, calculated);
            return calculated;
        } catch (RuntimeException exception) {
            return Map.of();
        }
    }

    private boolean isForcedCap(DRIF_BONUS_TYPE type, OptimizationRequest request) {
        return request.getForceCapBonuses() != null && request.getForceCapBonuses().contains(type);
    }

    private boolean isCritical(DRIF_BONUS_TYPE type, OptimizationRequest request) {
        return request.getCriticalBonuses() != null && request.getCriticalBonuses().contains(type);
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
        double total = 0.0;
        for (SlotContext slot : context.slots) {
            for (Placement placement : state.slots.getOrDefault(slot.key(), List.of())) {
                if (placement != null && placement.drif().getBonusType() == type) {
                    total += calculateDrifValue(placement.drif(), placement.level()) * (1.0 + slot.drifBonus());
                }
            }
        }
        return directedValue(type, total * rules.getDrifPenalty(globalCount(state, type)), context.request());
    }

    /** Fulfills hard minimum quantities before optimizing remaining capacity. */
    private boolean satisfyMinimums(BuildState state, OptimizationContext context) {
        while (true) {
            DRIF_BONUS_TYPE requiredType = null;
            int fewestOptions = Integer.MAX_VALUE;

            for (Map.Entry<DRIF_BONUS_TYPE, OptimizationRequest.QuantityRange> entry
                    : safeQuantities(context.request()).entrySet().stream()
                    .sorted(Map.Entry.comparingByKey(Comparator.comparing(Enum::name))).toList()) {
                int deficit = entry.getValue().getMin() - globalCount(state, entry.getKey());
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
            for (SlotContext slot : context.slots) {
                if (!slot.optimizable() || isSlotLocked(slot, context.request())) continue;
                List<Placement> placements = state.slots.get(slot.key());
                if (!hasFreeDrifPosition(placements, slot)) continue;
                for (DrifTemplate candidate : slot.candidates()) {
                    if (candidate.getBonusType() != requiredType
                            || containsBonus(placements, requiredType)
                            || globalCount(state, requiredType) >= maxQuantity(requiredType, context.request())
                            || containsAnotherElemental(state, candidate, null)) {
                        continue;
                    }

                    Integer level = lowestTierFittingLevel(state, slot, candidate);
                    if (level == null) continue;

                    BuildState trial = state.copy();
                    putNextFree(trial.slots.get(slot.key()), new Placement(candidate, level, false), slot.lockedIndices(), slot.maxDrifs());
                    double gain = score(trial, context) - score(state, context);
                    if (best == null || gain > best.gain() + MIN_ACCEPTED_GAIN
                            || (Math.abs(gain - best.gain()) <= MIN_ACCEPTED_GAIN
                            && isEarlierPlacement(slot, candidate, level, best, context))) {
                        best = new RequiredPlacementChoice(slot, candidate, level, gain);
                    }
                }
            }

            if (best == null) return false;
            putNextFree(state.slots.get(best.slot().key()),
                    new Placement(best.drif(), best.level(), false), best.slot().lockedIndices(), best.slot().maxDrifs());
        }
    }

    private int countFeasiblePlacements(BuildState state, DRIF_BONUS_TYPE type,
                                        OptimizationContext context) {
        int options = 0;
        for (SlotContext slot : context.slots) {
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

    private BuildState createInitialState(OptimizationContext context) {
        BuildState state = new BuildState();
        for (SlotContext slot : context.slots) {
            List<Placement> placements = new ArrayList<>();
            if (!slot.optimizable() || isSlotLocked(slot, context.request())) {
                placements = readOriginalPlacements(slot, context);
            } else {
                int requiredSize = Math.max(slot.maxDrifs(), maxLockedIndex(slot.lockedIndices()) + 1);
                for (int i = 0; i < requiredSize; i++) placements.add(null);
                for (Integer index : slot.lockedIndices()) {
                    if (index == null || index < 0) continue;
                    Placement fixed = originalPlacement(slot, index, context);
                    if (fixed != null) {
                        while (placements.size() <= index) placements.add(null);
                        placements.set(index, fixed);
                    }
                }
            }
            state.slots.put(slot.key(), placements);
        }
        return state;
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
                            relocated.slots.get(source.key()).set(sourceIndex,
                                    new Placement(other.drif(), Math.min(6, other.drif().getSize().getMaxLevel()), false));
                            relocated.slots.get(targetSlot.key()).set(targetIndex,
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
                                    trial.slots.get(removalSlot.key()).set(removalIndex, null);
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
            for (SlotContext slot : context.slots) {
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
                        if (globalCountExcept(state, candidate.getBonusType(), current.drif().getBonusType())
                                >= maxQuantity(candidate.getBonusType(), context.request())) continue;
                        if (containsAnotherElemental(state, candidate, current.drif())) continue;

                        BuildState trial = state.copy();
                        trial.slots.get(slot.key()).set(index,
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
        for (int first = 0; first < context.slots.size(); first++) {
            if (isDeadlineExceeded(context)) return state;
            SlotContext firstSlot = context.slots.get(first);
            if (!firstSlot.optimizable() || isSlotLocked(firstSlot, context.request())) continue;
            List<Placement> firstPlacements = state.slots.get(firstSlot.key());
            for (int second = first + 1; second < context.slots.size(); second++) {
                if (isDeadlineExceeded(context)) return state;
                SlotContext secondSlot = context.slots.get(second);
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
                        trial.slots.get(firstSlot.key()).set(i, new Placement(secondPlacement.drif(),
                                Math.min(6, secondPlacement.drif().getSize().getMaxLevel()), false));
                        trial.slots.get(secondSlot.key()).set(j, new Placement(firstPlacement.drif(),
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
            for (SlotContext slot : context.slots) {
                if (isDeadlineExceeded(context)) return state;
                if (!slot.optimizable() || isSlotLocked(slot, context.request())) continue;
                List<Placement> placements = state.slots.get(slot.key());
                for (int index = 0; index < placements.size(); index++) {
                    if (isDeadlineExceeded(context)) return state;
                    if (placements.get(index) == null || slot.lockedIndices().contains(index)) continue;
                    BuildState trial = state.copy();
                    trial.slots.get(slot.key()).set(index, null);
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
        int comparison = compareQuality(quality(candidate, context), quality(current, context));
        if (comparison != 0) return comparison > 0;
        return signature(candidate).compareTo(signature(current)) < 0;
    }

    private Comparator<BuildState> stateComparator(OptimizationContext context) {
        return (left, right) -> {
            int comparison = compareQuality(quality(left, context), quality(right, context));
            if (comparison != 0) return -comparison;
            return signature(left).compareTo(signature(right));
        };
    }

    private int compareQuality(Quality left, Quality right) {
        int comparison = Integer.compare(right.hardViolations(), left.hardViolations());
        if (comparison != 0) return comparison;
        comparison = Double.compare(right.forcedCapDeficit(), left.forcedCapDeficit());
        if (comparison != 0) return comparison;
        comparison = Integer.compare(right.missingCritical(), left.missingCritical());
        if (comparison != 0) return comparison;
        comparison = Double.compare(right.targetDeficit(), left.targetDeficit());
        if (comparison != 0) return comparison;
        comparison = Double.compare(left.weightedUtility(), right.weightedUtility());
        if (comparison != 0) return comparison;
        comparison = Double.compare(right.penaltyLoss(), left.penaltyLoss());
        if (comparison != 0) return comparison;
        comparison = Double.compare(right.forcedCapExcess(), left.forcedCapExcess());
        if (comparison != 0) return comparison;
        comparison = Double.compare(left.capacityUtilization(), right.capacityUtilization());
        if (comparison != 0) return comparison;
        return Integer.compare(left.totalPower(), right.totalPower());
    }

    private Quality quality(BuildState state, OptimizationContext context) {
        Metrics metrics = metrics(state, context);
        int hardViolations = metrics.overflowPower();
        int missingCritical = 0;
        double forcedCapDeficit = 0.0;
        double forcedCapExcess = 0.0;
        double targetDeficit = 0.0;
        double weightedUtility = 0.0;

        for (Map.Entry<DRIF_BONUS_TYPE, OptimizationRequest.QuantityRange> entry
                : safeQuantities(context.request()).entrySet()) {
            int count = metrics.counts().getOrDefault(entry.getKey(), 0);
            hardViolations += Math.max(0, entry.getValue().getMin() - count);
            hardViolations += Math.max(0, count - entry.getValue().getMax());
        }

        for (Map.Entry<DRIF_BONUS_TYPE, Integer> entry : context.request().getPriorities().entrySet()) {
            DRIF_BONUS_TYPE type = entry.getKey();
            int priority = Math.max(1, entry.getValue() != null ? entry.getValue() : 1);
            int count = metrics.counts().getOrDefault(type, 0);
            if (isCritical(type, context.request()) && count == 0) missingCritical++;

            double value = calculatedValue(state, type, context);
            Double target = targetFor(type, context.request());
            if (target != null) {
                double deficit = Math.max(0.0, target - value);
                if (isForcedCap(type, context.request())) {
                    forcedCapDeficit += deficit * priority;
                    forcedCapExcess += Math.max(0.0, value - target) * priority;
                } else {
                    targetDeficit += deficit * priority;
                }
                weightedUtility += Math.min(value, target) * priority;
            } else {
                weightedUtility += value * priority;
            }
        }
        return new Quality(hardViolations, forcedCapDeficit, missingCritical, targetDeficit,
                weightedUtility, metrics.penaltyLoss(), forcedCapExcess,
                metrics.capacityUtilization(), metrics.totalPower());
    }

    private double score(BuildState state, OptimizationContext context) {
        Metrics metrics = metrics(state, context);
        double result = 0;

        for (Map.Entry<DRIF_BONUS_TYPE, Integer> priority : context.request().getPriorities().entrySet().stream()
                .sorted(Map.Entry.comparingByKey(Comparator.comparing(Enum::name))).toList()) {
            DRIF_BONUS_TYPE type = priority.getKey();
            int weight = Math.max(1, priority.getValue() != null ? priority.getValue() : 1);
            double directedValue = calculatedValue(state, type, context);
            Double target = targetFor(type, context.request());

            if (target != null && target > 0) {
                double progress = Math.min(directedValue / target, 1.0);
                result += progress * weight * 1000.0;
                if (directedValue < target) result -= (target - directedValue) * weight * 25.0;
                if (directedValue > target && !isForcedCap(type, context.request())) {
                    result -= (directedValue - target) * weight * 5.0;
                }
            } else {
                result += directedValue * weight * 100.0;
            }

            if (isCritical(type, context.request())) {
                int count = metrics.counts().getOrDefault(type, 0);
                if (count == 0) result -= 200000.0;
                else result += Math.min(count, 3) * weight * 75.0;
            }
        }

        for (Map.Entry<DRIF_BONUS_TYPE, OptimizationRequest.QuantityRange> entry
                : safeQuantities(context.request()).entrySet().stream()
                .sorted(Map.Entry.comparingByKey(Comparator.comparing(Enum::name))).toList()) {
            int count = metrics.counts().getOrDefault(entry.getKey(), 0);
            int min = clampQuantity(entry.getValue().getMin());
            int max = clampQuantity(entry.getValue().getMax());
            if (count < min) result -= (min - count) * 100000.0;
            if (count > max) result -= (count - max) * 100000.0;
        }

        result -= metrics.overflowPower() * 100000.0;
        result += metrics.totalPower() * 0.25;
        return result;
    }

    private Metrics metrics(BuildState state, OptimizationContext context) {
        String key = signature(state);
        Metrics cached = context.metricsCache().get(key);
        if (cached != null) return cached;
        Metrics calculated = calculateMetrics(state, context);
        context.metricsCache().put(key, calculated);
        return calculated;
    }

    private Metrics calculateMetrics(BuildState state, OptimizationContext context) {
        Map<DRIF_BONUS_TYPE, Integer> counts = new LinkedHashMap<>();
        Map<DRIF_BONUS_TYPE, Double> rawValues = new LinkedHashMap<>();
        int totalPower = 0;
        int overflowPower = 0;
        int usedCapacity = 0;
        int totalCapacity = 0;

        for (SlotContext slot : context.slots) {
            List<Placement> placements = state.slots.getOrDefault(slot.key(), List.of());
            int used = 0;
            Set<DRIF_BONUS_TYPE> unique = new HashSet<>();
            for (Placement placement : placements) {
                if (placement == null || placement.drif() == null) continue;
                if (!unique.add(placement.drif().getBonusType())) continue;
                int power = power(placement.drif(), placement.level());
                used += power;
                totalPower += power;
                counts.merge(placement.drif().getBonusType(), 1, Integer::sum);
                rawValues.merge(placement.drif().getBonusType(),
                        calculateDrifValue(placement.drif(), placement.level()) * (1.0 + slot.drifBonus()),
                        Double::sum);
            }
            usedCapacity += Math.min(used, slot.capacity());
            totalCapacity += slot.capacity();
            overflowPower += Math.max(0, used - slot.capacity());
        }

        Map<DRIF_BONUS_TYPE, Double> values = new LinkedHashMap<>();
        double penaltyLoss = 0;
        for (Map.Entry<DRIF_BONUS_TYPE, Double> entry : rawValues.entrySet()) {
            double penalty = rules.getDrifPenalty(counts.getOrDefault(entry.getKey(), 0));
            values.put(entry.getKey(), entry.getValue() * penalty);
            penaltyLoss += Math.abs(entry.getValue()) * (1.0 - penalty);
        }

        double utilization = totalCapacity > 0 ? (double) usedCapacity / totalCapacity : 0.0;
        return new Metrics(counts, values, totalPower, overflowPower, utilization, penaltyLoss);
    }

    private OptimizationSummary createSummary(BuildState state, OptimizationContext context, double executionTime) {
        Metrics metrics = metrics(state, context);
        return new OptimizationSummary(true, "Optymalizacja zakończona.",
                metrics.counts().values().stream().mapToInt(Integer::intValue).sum(),
                metrics.totalPower(), executionTime);
    }

    private double parseCalculatedValue(String value) {
        if (value == null || value.isBlank()) return 0.0;
        try {
            return Double.parseDouble(value.replace("%", "").replace(",", ".").replace("+", "").trim());
        } catch (NumberFormatException exception) {
            return 0.0;
        }
    }

    private EquipmentRequest toSetup(BuildState state, OptimizationContext context) {
        Map<String, EquipmentRequest.SlotData> slots = deepCopySlots(context.request().getOriginalSlots());
        for (SlotContext slot : context.slots) {
            if (!slot.optimizable()) continue;
            EquipmentRequest.SlotData output = copySlot(slot.original());
            List<Placement> placements = state.slots.getOrDefault(slot.key(), List.of());
            List<Long> ids = new ArrayList<>();
            Map<String, Integer> levels = new HashMap<>();
            int outputLimit = Math.min(placements.size(), slot.maxDrifs());
            for (int i = 0; i < outputLimit; i++) {
                Placement placement = placements.get(i);
                ids.add(placement != null ? placement.drif().getId() : null);
                if (placement != null) levels.put(String.valueOf(i), placement.level());
            }
            while (!ids.isEmpty() && ids.get(ids.size() - 1) == null) ids.remove(ids.size() - 1);
            output.setDrifIds(ids);
            output.setDrifLevels(levels);
            slots.put(slot.key(), output);
        }

        slots = lockService.enforce(context.request().getOriginalSlots(), slots, context.request());
        enforceDrifLimits(slots, context);
        EquipmentRequest setup = new EquipmentRequest();
        setup.setSlots(slots);
        return setup;
    }

    /** Final API safety barrier for stale input, invalid locks, and capacity violations. */
    private void enforceDrifLimits(Map<String, EquipmentRequest.SlotData> slots,
                                   OptimizationContext context) {
        for (SlotContext slot : context.slots) {
            if (slot.special()) continue;
            EquipmentRequest.SlotData output = slots.get(slot.key());
            if (output == null || output.getDrifIds() == null
                    || output.getDrifIds().size() <= slot.maxDrifs()) continue;

            List<Long> limitedIds = new ArrayList<>(output.getDrifIds().subList(0, slot.maxDrifs()));
            Map<String, Integer> limitedLevels = new HashMap<>();
            if (output.getDrifLevels() != null) {
                output.getDrifLevels().entrySet().stream()
                        .filter(entry -> {
                            try {
                                return Integer.parseInt(entry.getKey()) < slot.maxDrifs();
                            } catch (NumberFormatException exception) {
                                return false;
                            }
                        })
                        .forEach(entry -> limitedLevels.put(entry.getKey(), entry.getValue()));
            }
            output.setDrifIds(limitedIds);
            output.setDrifLevels(limitedLevels);
        }
    }

    private String validateFinalResult(BuildState state, OptimizationContext context) {
        if (!minimumsSatisfied(state, context)) {
            return "KoĹ„cowy wynik nie speĹ‚nia minimalnych limitĂłw iloĹ›ciowych.";
        }
        for (SlotContext slot : context.slots()) {
            List<Placement> placements = state.slots.getOrDefault(slot.key(), List.of());
            if (slot.optimizable() && countPlaced(placements) > slot.maxDrifs()) {
                return "KoĹ„cowy wynik przekracza limit drifĂłw w slocie " + slot.key() + ".";
            }
            if (slot.optimizable() && usedPower(placements) > slot.capacity()) {
                return "KoĹ„cowy wynik przekracza pojemnoĹ›Ä‡ w slocie " + slot.key() + ".";
            }
            Set<DRIF_BONUS_TYPE> unique = new HashSet<>();
            for (Placement placement : placements) {
                if (placement != null && !unique.add(placement.drif().getBonusType())) {
                    return "KoĹ„cowy wynik zawiera zduplikowany mod w slocie " + slot.key() + ".";
                }
            }
        }

        Map<String, String> actual = actualStats(state, context);
        for (DRIF_BONUS_TYPE type : context.request().getPriorities().keySet().stream()
                .filter(candidate -> isForcedCap(candidate, context.request()))
                .sorted(Comparator.comparing(Enum::name)).toList()) {
            Double target = targetFor(type, context.request());
            if (target == null) continue;
            if (!actual.containsKey(type.name())) {
                return "Kalkulator nie zwrĂłciĹ‚ wartoĹ›ci wymaganego capa: " + type.getDescription() + ".";
            }
            double value = directedValue(type, parseCalculatedValue(actual.get(type.name())), context.request());
            if (value < target - TARGET_TOLERANCE) {
                return "Nie udaĹ‚o siÄ™ osiÄ…gnÄ…Ä‡ wymuszonego capa dla " + type.getDescription()
                        + " (" + String.format(java.util.Locale.ROOT, "%.2f", value) + "/"
                        + String.format(java.util.Locale.ROOT, "%.2f", target) + ").";
            }
        }
        return null;
    }

    private OptimizationResponse failedResponse(String message, double seconds) {
        return new OptimizationResponse(new EquipmentRequest(),
                new OptimizationSummary(false, message, 0, 0, seconds));
    }

    private Integer highestFittingLevel(BuildState state, SlotContext slot, DrifTemplate drif) {
        int remaining = slot.capacity() - usedPower(state.slots.get(slot.key()));
        if (remaining < drif.getBonusType().getBasePower()) return null;
        return highestLevelForPower(drif, remaining);
    }

    private Integer lowestTierFittingLevel(BuildState state, SlotContext slot, DrifTemplate drif) {
        int remaining = slot.capacity() - usedPower(state.slots.get(slot.key()));
        if (remaining < drif.getBonusType().getBasePower()) return null;
        return Math.min(6, drif.getSize().getMaxLevel());
    }

    private int highestLevelForPower(DrifTemplate drif, int availablePower) {
        int affordableMultiplier = Math.max(1,
                Math.min(4, availablePower / Math.max(1, drif.getBonusType().getBasePower())));
        int sizeMultiplier = effectiveMultiplier(drif.getSize().getMaxLevel());
        int multiplier = Math.min(affordableMultiplier, sizeMultiplier);
        return switch (multiplier) {
            case 1 -> Math.min(6, drif.getSize().getMaxLevel());
            case 2 -> Math.min(11, drif.getSize().getMaxLevel());
            case 3 -> Math.min(16, drif.getSize().getMaxLevel());
            default -> drif.getSize().getMaxLevel();
        };
    }

    private boolean fitsCapacity(List<Placement> placements, SlotContext slot) {
        return usedPower(placements) <= slot.capacity();
    }

    private int usedPower(List<Placement> placements) {
        return placements.stream().filter(Objects::nonNull)
                .mapToInt(placement -> power(placement.drif(), placement.level())).sum();
    }

    private int countPlaced(List<Placement> placements) {
        return (int) placements.stream().filter(Objects::nonNull).count();
    }

    private int usedPowerExcept(List<Placement> placements, int index) {
        int power = 0;
        for (int i = 0; i < placements.size(); i++) {
            if (i != index && placements.get(i) != null) power += power(placements.get(i).drif(), placements.get(i).level());
        }
        return power;
    }

    private int power(DrifTemplate drif, int level) {
        return drif.getBonusType().getBasePower() * effectiveMultiplier(level);
    }

    private int effectiveMultiplier(int level) {
        if (level <= 6) return 1;
        if (level <= 11) return 2;
        if (level <= 16) return 3;
        return 4;
    }

    private double calculateDrifValue(DrifTemplate drif, int level) {
        if (drif.getBaseValue() == null || drif.getIncrement() == null) return 0.0;
        try {
            double total = Double.parseDouble(drif.getBaseValue().replace("%", "").replace(",", ".").trim());
            double increment = Double.parseDouble(drif.getIncrement().replace("%", "").replace(",", ".").trim());
            for (int current = 2; current <= level; current++) {
                total += current >= 19 && current <= 21 ? increment * 2 : increment;
            }
            return total;
        } catch (NumberFormatException exception) {
            return 0.0;
        }
    }

    private int calculateMaxDrifs(ItemTemplate item, int stars) {
        int tier = item.getTier() != null ? RomanNumeralParser.convertRomanToInteger(item.getTier()) : 1;
        int max = tier >= 10 ? 3 : tier >= 4 ? 2 : tier >= 1 ? 1 : 0;
        if ((tier == 2 || tier == 3) && stars >= 7) max++;
        return max;
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

    private int globalCount(BuildState state, DRIF_BONUS_TYPE type) {
        return (int) state.slots.values().stream().flatMap(List::stream).filter(Objects::nonNull)
                .filter(p -> p.drif().getBonusType() == type).count();
    }

    private int globalCountExcept(BuildState state, DRIF_BONUS_TYPE candidate, DRIF_BONUS_TYPE replaced) {
        return Math.max(0, globalCount(state, candidate) - (candidate == replaced ? 1 : 0));
    }

    private int maxQuantity(DRIF_BONUS_TYPE type, OptimizationRequest request) {
        OptimizationRequest.QuantityRange range = safeQuantities(request).get(type);
        return range != null ? clampQuantity(range.getMax()) : MAX_GLOBAL_DRIFS_PER_TYPE;
    }

    private boolean minimumsSatisfied(BuildState state, OptimizationContext context) {
        for (Map.Entry<DRIF_BONUS_TYPE, OptimizationRequest.QuantityRange> entry
                : safeQuantities(context.request()).entrySet()) {
            if (globalCount(state, entry.getKey()) < entry.getValue().getMin()) return false;
        }
        return true;
    }

    private String validateQuantityRanges(OptimizationRequest request) {
        if (request.getTargetQuantities() == null) return null;
        for (Map.Entry<DRIF_BONUS_TYPE, OptimizationRequest.QuantityRange> entry
                : request.getTargetQuantities().entrySet()) {
            OptimizationRequest.QuantityRange range = entry.getValue();
            if (range == null || range.getMin() < 0 || range.getMax() > MAX_GLOBAL_DRIFS_PER_TYPE
                    || range.getMin() > range.getMax()) {
                return "Nieprawidłowy zakres ilości dla " + entry.getKey().getDescription()
                        + ". Minimum i maksimum muszą mieścić się w zakresie 0–12, a minimum nie może przekraczać maksimum.";
            }
        }
        return null;
    }

    private Map<DRIF_BONUS_TYPE, OptimizationRequest.QuantityRange> safeQuantities(OptimizationRequest request) {
        return request.getTargetQuantities() != null ? request.getTargetQuantities() : Map.of();
    }

    private Double targetFor(DRIF_BONUS_TYPE type, OptimizationRequest request) {
        if (request.getForceCapBonuses() != null && request.getForceCapBonuses().contains(type)
                && type.getMaxCap() != null) return (double) Math.abs(type.getMaxCap());
        if (request.getTargetValues() != null && request.getTargetValues().containsKey(type)) {
            return Math.abs(request.getTargetValues().get(type));
        }
        return null;
    }

    private double directedValue(DRIF_BONUS_TYPE type, double value, OptimizationRequest request) {
        if (request.getForceCapBonuses() != null && request.getForceCapBonuses().contains(type)
                && type.getMaxCap() != null && type.getMaxCap() < 0) {
            return -value;
        }
        if (request.getTargetValues() != null && request.getTargetValues().get(type) != null
                && request.getTargetValues().get(type) < 0) {
            return -value;
        }
        return value;
    }

    private int clampQuantity(int value) {
        return Math.max(0, Math.min(MAX_GLOBAL_DRIFS_PER_TYPE, value));
    }

    private void putNextFree(List<Placement> placements, Placement placement,
                             Set<Integer> lockedIndices, int maxDrifs) {
        int hardLimit = Math.max(0, maxDrifs);
        for (int i = 0; i < Math.min(placements.size(), hardLimit); i++) {
            if (!lockedIndices.contains(i) && placements.get(i) == null) {
                placements.set(i, placement);
                return;
            }
        }
        // Sloty optymalizowalne są prealokowane do maxDrifs. Nie dopisujemy
        // elementu poza limitem, nawet gdy lista zawiera dodatkowy indeks
        // wynikający ze starej lub niepoprawnej blokady.
    }

    private List<Placement> readOriginalPlacements(SlotContext slot, OptimizationContext context) {
        List<Long> ids = slot.original().getDrifIds() != null ? slot.original().getDrifIds() : List.of();
        List<Placement> placements = new ArrayList<>();
        for (int i = 0; i < ids.size(); i++) {
            Long id = ids.get(i);
            placements.add(id != null && context.drifs().containsKey(id) ? originalPlacement(slot, i, context) : null);
        }
        return placements;
    }

    private Placement originalPlacement(SlotContext slot, int index, OptimizationContext context) {
        List<Long> ids = slot.original().getDrifIds();
        if (ids == null || index >= ids.size() || ids.get(index) == null) return null;
        DrifTemplate drif = context.drifs().get(ids.get(index));
        if (drif == null) return null;
        int level = slot.original().getDrifLevels() != null
                ? slot.original().getDrifLevels().getOrDefault(String.valueOf(index), 1) : 1;
        return new Placement(drif, validator.sanitizeDrifLevel(level, drif), true);
    }

    private int maxLockedIndex(Set<Integer> indices) {
        return indices.stream().filter(Objects::nonNull).mapToInt(Integer::intValue).max().orElse(-1);
    }

    private String signature(BuildState state) {
        return state.slots.entrySet().stream().sorted(Map.Entry.comparingByKey())
                .map(entry -> entry.getKey() + ":" + entry.getValue().stream()
                        .map(p -> p == null ? "_" : p.drif().getId() + "@" + p.level()).collect(Collectors.joining(",")))
                .collect(Collectors.joining("|"));
    }

    private Map<String, EquipmentRequest.SlotData> deepCopySlots(Map<String, EquipmentRequest.SlotData> source) {
        Map<String, EquipmentRequest.SlotData> copy = new LinkedHashMap<>();
        source.entrySet().stream().sorted(Map.Entry.comparingByKey())
                .forEach(entry -> copy.put(entry.getKey(), copySlot(entry.getValue())));
        return copy;
    }

    private EquipmentRequest.SlotData copySlot(EquipmentRequest.SlotData source) {
        if (source == null) return null;
        EquipmentRequest.SlotData copy = new EquipmentRequest.SlotData();
        copy.setItemId(source.getItemId());
        copy.setItemStars(source.getItemStars());
        copy.setOrbIds(source.getOrbIds() != null ? new ArrayList<>(source.getOrbIds()) : null);
        copy.setOrbLevels(source.getOrbLevels() != null ? new ArrayList<>(source.getOrbLevels()) : null);
        copy.setDrifIds(source.getDrifIds() != null ? new ArrayList<>(source.getDrifIds()) : null);
        copy.setDrifLevels(source.getDrifLevels() != null ? new HashMap<>(source.getDrifLevels()) : null);
        return copy;
    }

    private double elapsedSeconds(long startTime) {
        return (System.nanoTime() - startTime) / 1_000_000_000.0;
    }

    private boolean isDeadlineExceeded(OptimizationContext context) {
        return context.searchBudget().consume();
    }

    private record PlacementChoice(DrifTemplate drif, int level, double gain) { }

    private record RequiredPlacementChoice(SlotContext slot, DrifTemplate drif, int level, double gain) { }

    private record Placement(DrifTemplate drif, int level, boolean locked) { }

    private record SlotContext(String key, EquipmentRequest.SlotData original, ItemTemplate item,
                                int capacity, int maxDrifs, double drifBonus,
                                List<DrifTemplate> candidates, Set<Integer> lockedIndices,
                                boolean special) {
        boolean optimizable() { return !special && maxDrifs > 0; }
    }

    private record OptimizationContext(OptimizationRequest request, Map<Long, ItemTemplate> items,
                                        Map<Long, DrifTemplate> drifs, List<SlotContext> slots,
                                        SearchBudget searchBudget,
                                        Map<DRIF_BONUS_TYPE, Double> calculatorBaseline,
                                        Map<String, Map<String, String>> calculatorCache,
                                        Map<String, Metrics> metricsCache) { }

    private static final class BuildState {
        private final Map<String, List<Placement>> slots = new HashMap<>();

        private BuildState copy() {
            BuildState copy = new BuildState();
            slots.forEach((key, values) -> copy.slots.put(key, new ArrayList<>(values)));
            return copy;
        }
    }

    private static final class SearchBudget {
        private int remaining;

        private SearchBudget(int remaining) {
            this.remaining = remaining;
        }

        private boolean consume() {
            return remaining-- <= 0;
        }
    }

    private record Quality(int hardViolations, double forcedCapDeficit, int missingCritical,
                           double targetDeficit, double weightedUtility, double penaltyLoss,
                           double forcedCapExcess, double capacityUtilization, int totalPower) { }

    private record Metrics(Map<DRIF_BONUS_TYPE, Integer> counts, Map<DRIF_BONUS_TYPE, Double> values,
                           int totalPower, int overflowPower, double capacityUtilization,
                           double penaltyLoss) { }
}
