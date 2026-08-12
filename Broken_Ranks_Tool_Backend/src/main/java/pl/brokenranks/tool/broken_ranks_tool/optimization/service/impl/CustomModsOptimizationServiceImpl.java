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
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.OptimizationVariant;
import pl.brokenranks.tool.broken_ranks_tool.optimization.service.ModsOptimizationService;

import java.util.ArrayList;
import java.util.Comparator;
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

/**
 * Heurystyczny algorytm optymalizacji drifów.
 *
 * <p>Algorytm najpierw przydziela drify zachłannie, odwiedzając przedmioty
 * według bonusu do drifów i wybierając najlepszy dostępny przyrost celu.
 * Następnie tworzy szybkie warianty lokalne: podbicie poziomów, balans zamian
 * oraz ograniczenie kar globalnych. Wszystkie warianty przechodzą przez ten
 * sam moduł blokad.</p>
 */
@Service
@RequiredArgsConstructor
public class CustomModsOptimizationServiceImpl implements ModsOptimizationService {

    private static final int MAX_GLOBAL_DRIFS_PER_TYPE = 12;
    private static final long MAX_OPTIMIZATION_MILLIS = 5000;
    private static final double MIN_ACCEPTED_GAIN = 0.0001;
    private static final double TARGET_TOLERANCE = 0.50;
    private static final double CAP_TOLERANCE = 0.01;
    private static final double MAX_RESIDUAL_FILL_LOSS = 15.0;

    private final DrifTemplateRepository drifRepository;
    private final ItemTemplateRepository itemRepository;
    private final EquipmentValidator validator;
    private final EquipmentRulesRegistry rules;
    private final ItemStatProcessor itemStatProcessor;
    private final OptimizationLockService lockService;
    private final EquipmentStatsCalculatorService calculatorService;

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

        long deadlineNanos = System.nanoTime() + MAX_OPTIMIZATION_MILLIS * 1_000_000L;
        OptimizationContext context = prepareContext(request, deadlineNanos);
        if (context.slots.isEmpty()) {
            return failedResponse("Brak poprawnie skonfigurowanych przedmiotów do optymalizacji.", elapsedSeconds(startTime));
        }

        BuildState greedyState = buildGreedyState(context);
        if (greedyState == null) {
            return failedResponse("Nie można spełnić wszystkich minimów ilościowych przy obecnych blokadach, slotach i pojemności.", elapsedSeconds(startTime));
        }
        greedyState = fillResidualCapacity(greedyState, context);
        greedyState = repairForcedCaps(greedyState, context);
        greedyState = maximizeDrifSizes(greedyState, context);
        greedyState = repairForcedCaps(greedyState, context);
        greedyState = allocateRemainingLevelsByPriority(greedyState, context);
        greedyState = repairForcedCaps(greedyState, context);

        List<VariantCandidate> candidates = new ArrayList<>();
        // Wynik bazowy jest zawsze kompletny. Ciężkie lokalne przeszukiwanie
        // nie może nadpisać go częściowym stanem po przekroczeniu deadline'u.
        addVariant(candidates, "Bazowy wynik",
                "Kompletny wariant z przydziałem wykonywanym według priorytetów i bonusu przedmiotów.",
                greedyState, context);

        if (candidates.isEmpty()) {
            return failedResponse("Nie udało się utworzyć poprawnego wariantu spełniającego minima.", elapsedSeconds(startTime));
        }

        candidates = deduplicateAndSort(candidates);
        VariantCandidate best = candidates.get(0);
        List<OptimizationVariant> responseVariants = candidates.stream()
                .limit(4)
                .map(candidate -> new OptimizationVariant(
                        candidate.name,
                        candidate.description,
                        score(candidate.state, context),
                        toSetup(candidate.state, context),
                        createSummary(candidate.state, context, elapsedSeconds(startTime))
                ))
                .toList();

        List<String> suggestions = buildSuggestions(best.state, context);
        EquipmentRequest bestSetup = toSetup(best.state, context);
        List<String> validationSuggestions = validateWithCalculator(bestSetup, context);
        suggestions = new ArrayList<>(suggestions);
        suggestions.addAll(validationSuggestions);
        suggestions = suggestions.stream().distinct().limit(10).toList();
        OptimizationSummary summary = createSummary(best.state, context, elapsedSeconds(startTime));
        return new OptimizationResponse(bestSetup, summary, responseVariants, suggestions);
    }

    /**
     * Przeszukiwanie wiązkowe. Dla każdej wolnej pozycji rozwijanych jest kilka
     * alternatywnych stanów: pusta pozycja oraz różne drify i poziomy. Po każdym
     * kroku pozostają najlepsze stany, ale z zachowaniem różnych profili ilości
     * modów, dzięki czemu wariant z mniejszą liczbą drifów nie znika wyłącznie
     * przez lokalnie wyższy wynik innej ścieżki.
     */
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
                .sorted(Comparator.comparingDouble((BuildState state) -> score(state, context)).reversed())
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
        levels.add(1);
        for (int level : List.of(6, 11, 16, 21)) {
            if (level <= highest && level <= candidate.getSize().getMaxLevel()) levels.add(level);
        }
        return new ArrayList<>(levels);
    }

    private List<BuildState> retainBeam(List<BuildState> states, int beamWidth,
                                        OptimizationContext context) {
        Map<String, BuildState> bestByProfile = new LinkedHashMap<>();
        states.sort(Comparator.comparingDouble((BuildState state) -> score(state, context)).reversed());
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
                .sorted(Comparator.comparingDouble((BuildState state) -> score(state, context)).reversed())
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

    private OptimizationContext prepareContext(OptimizationRequest request, long deadlineNanos) {
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
        return new OptimizationContext(request, items, drifs, slots, deadlineNanos);
    }

    private int priorityOf(DRIF_BONUS_TYPE type, OptimizationRequest request) {
        return request.getPriorities().getOrDefault(type, 0);
    }

    private BuildState buildGreedyState(OptimizationContext context) {
        BuildState state = createInitialState(context);
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

    /**
     * Rezerwuje co najmniej jeden drif dla każdego moda oznaczonego jako
     * krytyczny. Jest to cel jakościowy, a nie ukryty cap: algorytm nie musi
     * dobijać takiego moda do maksymalnej wartości, ale nie może go całkowicie
     * poświęcić na rzecz innych bonusów.
     */
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

    /**
     * Deterministycznie wykorzystuje tylko bezpieczną, pozostałą pojemność.
     * Kandydat nadal musi respektować limity, brak duplikatów w przedmiocie,
     * ograniczenia elementalne oraz osiągnięte cele wartościowe. Dopuszczamy
     * niewielki spadek wyniku, aby lekki drif mógł zostać dodany do wolnego
     * miejsca, ale nie poświęcamy przez to istotnych bonusów.
     */
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

    /**
     * Najpierw rezerwuje miejsca dla celów wartościowych, zwłaszcza dla
     * wymuszonych capów. Dzięki temu wysoki priorytet nie może zapełnić całego
     * ekwipunku innym modem zanim krytyczny cel zostanie osiągnięty.
     */
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
        return value <= target ? target - value : (value - target) * 20.0;
    }

    /**
     * Koryguje końcówkę capa na podstawie faktycznego kalkulatora. Zmieniamy
     * wyłącznie poziom albo usuwamy drifa z tego samego typu, nigdy nie ruszając
     * blokad ani minimów. Jest to mały, deterministyczny etap lokalny.
     */
    private BuildState repairForcedCaps(BuildState state, OptimizationContext context) {
        List<DRIF_BONUS_TYPE> caps = context.request().getPriorities().keySet().stream()
                .filter(type -> isForcedCap(type, context.request()))
                .sorted(Comparator.comparing(Enum::name))
                .toList();

        for (DRIF_BONUS_TYPE type : caps) {
            double target = targetFor(type, context.request());
            double current = calculatedValue(state, type, context);
            if (current <= target + CAP_TOLERANCE) continue;

            BuildState bestState = state;
            double bestValue = current;
            for (SlotContext slot : context.slots) {
                if (!slot.optimizable() || isSlotLocked(slot, context.request())) continue;
                List<Placement> placements = state.slots.get(slot.key());
                for (int index = 0; index < placements.size(); index++) {
                    Placement placement = placements.get(index);
                    if (placement == null || placement.locked() || slot.lockedIndices().contains(index)
                            || placement.drif().getBonusType() != type) continue;

                    for (int level = 1; level < placement.level(); level++) {
                        BuildState trial = state.copy();
                        trial.slots.get(slot.key()).set(index, new Placement(placement.drif(), level, false));
                        if (!minimumsSatisfied(trial, context)) continue;
                        double trialValue = calculatedValue(trial, type, context);
                        if (isBetterCapValue(trialValue, bestValue, target)) {
                            bestState = trial;
                            bestValue = trialValue;
                        }
                    }

                    BuildState removed = state.copy();
                    removed.slots.get(slot.key()).set(index, null);
                    if (minimumsSatisfied(removed, context)) {
                        double trialValue = calculatedValue(removed, type, context);
                        if (isBetterCapValue(trialValue, bestValue, target)) {
                            bestState = removed;
                            bestValue = trialValue;
                        }
                    }
                }
            }
            state = bestState;
        }
        return state;
    }

    /** Zamienia każdy niezablokowany drif na największy odpowiednik dozwolony dla przedmiotu. */
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

    /**
     * Przechodzi po każdym slocie i przeznacza wolną pojemność najpierw na
     * drify o najwyższym priorytecie. Dla każdego z nich wybiera najwyższy
     * poziom mieszczący się w pojemności i niewykraczający poza ustawiony cel.
     */
    private BuildState allocateRemainingLevelsByPriority(BuildState state, OptimizationContext context) {
        for (SlotContext slot : context.slots) {
            if (!slot.optimizable() || isSlotLocked(slot, context.request())) continue;
            List<Placement> placements = state.slots.get(slot.key());
            List<Integer> indices = new ArrayList<>();
            for (int index = 0; index < Math.min(placements.size(), slot.maxDrifs()); index++) {
                Placement placement = placements.get(index);
                if (placement != null && !placement.locked() && !slot.lockedIndices().contains(index)) {
                    indices.add(index);
                }
            }
            indices.sort(Comparator
                    .comparingInt((Integer index) -> priorityOf(
                            placements.get(index).drif().getBonusType(), context.request())).reversed()
                    .thenComparing(index -> placements.get(index).drif().getBonusType().name())
                    .thenComparingInt(Integer::intValue));

            for (Integer index : indices) {
                Placement current = placements.get(index);
                int availablePower = slot.capacity() - usedPowerExcept(placements, index);
                int selectedLevel = current.level();
                for (int level = current.drif().getSize().getMaxLevel(); level > current.level(); level--) {
                    if (power(current.drif(), level) > availablePower) continue;
                    BuildState trial = state.copy();
                    trial.slots.get(slot.key()).set(index,
                            new Placement(current.drif(), level, false));
                    if (!respectsTargetAfterLevelIncrease(state, trial,
                            current.drif().getBonusType(), context)) continue;
                    selectedLevel = level;
                    break;
                }
                if (selectedLevel != current.level()) {
                    placements.set(index, new Placement(current.drif(), selectedLevel, false));
                }
            }
        }
        return state;
    }

    private boolean respectsTargetAfterLevelIncrease(BuildState current, BuildState trial,
                                                     DRIF_BONUS_TYPE type,
                                                     OptimizationContext context) {
        Double target = targetFor(type, context.request());
        if (target == null) return true;
        double currentValue = calculatedValue(current, type, context);
        double trialValue = calculatedValue(trial, type, context);
        if (currentValue <= target + CAP_TOLERANCE) {
            return trialValue <= target + CAP_TOLERANCE;
        }
        return Math.abs(trialValue - target) < Math.abs(currentValue - target);
    }

    private boolean isBetterCapValue(double candidate, double current, double target) {
        boolean candidateUnder = candidate <= target + CAP_TOLERANCE;
        boolean currentUnder = current <= target + CAP_TOLERANCE;
        if (candidateUnder != currentUnder) return candidateUnder;
        if (candidateUnder) return candidate > current + TARGET_TOLERANCE;
        return candidate < current - TARGET_TOLERANCE;
    }

    private double calculatedValue(BuildState state, DRIF_BONUS_TYPE type, OptimizationContext context) {
        try {
            Map<String, String> stats = calculatorService.calculateTotalStats(toSetup(state, context));
            return directedValue(type, parseCalculatedValue(stats.get(type.name())), context.request());
        } catch (RuntimeException exception) {
            return currentValue(state, type, context);
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

    private double greedyCandidateScore(BuildState state, SlotContext slot, DrifTemplate candidate,
                                        int level, int currentGlobalCount,
                                        OptimizationContext context) {
        DRIF_BONUS_TYPE type = candidate.getBonusType();
        int weight = Math.max(1, context.request().getPriorities().getOrDefault(type, 1));
        double value = directedValue(type, calculateDrifValue(candidate, level), context.request());
        double target = targetFor(type, context.request()) != null
                ? targetFor(type, context.request()) : 0.0;
        double currentValue = currentValue(state, type, context);
        double targetProgress = target > 0
                ? Math.max(0.0, Math.min(1.0, (target - currentValue) / target))
                : 1.0;
        double penalty = rules.getDrifPenalty(currentGlobalCount + 1);
        double capacityValue = level * (1.0 + slot.drifBonus());
        return weight * (value * (0.5 + targetProgress) * penalty * 100.0 + capacityValue);
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

    /**
     * Wypełnia minima jako ograniczenia twarde przed rozpoczęciem optymalizacji
     * dodatkowych miejsc. Jeżeli choć jedno minimum jest niewykonalne, zwraca
     * {@code false} zamiast tworzyć pozornie poprawny wariant.
     */
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

                    Integer level = highestFittingLevel(state, slot, candidate);
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

    private BuildState improveLevels(BuildState state, OptimizationContext context, OptimizationMode mode) {
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
                    Placement placement = placements.get(index);
                    if (placement == null || slot.lockedIndices().contains(index)) continue;
                    int maxLevel = placement.drif().getSize().getMaxLevel();
                    if (placement.level() >= maxLevel) continue;
                    BuildState trial = state.copy();
                    trial.slots.get(slot.key()).set(index, new Placement(placement.drif(), placement.level() + 1, false));
                    if (variantScore(trial, context, mode) > variantScore(state, context, mode) + MIN_ACCEPTED_GAIN) {
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

    private BuildState improveReplacements(BuildState state, OptimizationContext context, OptimizationMode mode) {
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
                    Placement current = placements.get(index);
                    if (current == null || slot.lockedIndices().contains(index)) continue;
                    PlacementChoice best = null;
                    for (DrifTemplate candidate : slot.candidates()) {
                        if (isDeadlineExceeded(context)) return state;
                        if (candidate.getBonusType() == current.drif().getBonusType()) continue;
                        if (containsBonusExcept(placements, candidate.getBonusType(), index)) continue;
                        if (globalCountExcept(state, candidate.getBonusType(), current.drif().getBonusType())
                                >= maxQuantity(candidate.getBonusType(), context.request())) continue;
                        if (containsAnotherElemental(state, candidate, current.drif())) continue;

                        Integer level = highestFittingLevelForReplacement(state, slot, candidate, index);
                        if (level == null) continue;
                        BuildState trial = state.copy();
                        trial.slots.get(slot.key()).set(index, new Placement(candidate, level, false));
                        if (!minimumsSatisfied(trial, context)) continue;
                        double gain = variantScore(trial, context, mode) - variantScore(state, context, mode);
                        if (best == null || gain > best.gain()) best = new PlacementChoice(candidate, level, gain);
                    }
                    if (best != null && best.gain() > MIN_ACCEPTED_GAIN) {
                        placements.set(index, new Placement(best.drif(), best.level(), false));
                        changed = true;
                        break;
                    }
                }
                if (changed) break;
            }
        }
        return state;
    }

    private BuildState improveSwaps(BuildState state, OptimizationContext context, OptimizationMode mode) {
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
                        trial.slots.get(firstSlot.key()).set(i, new Placement(secondPlacement.drif(), secondPlacement.level(), false));
                        trial.slots.get(secondSlot.key()).set(j, new Placement(firstPlacement.drif(), firstPlacement.level(), false));
                        if (!fitsCapacity(trial.slots.get(firstSlot.key()), firstSlot)
                                || !fitsCapacity(trial.slots.get(secondSlot.key()), secondSlot)) continue;
                        if (!minimumsSatisfied(trial, context)) continue;
                        if (variantScore(trial, context, mode) > variantScore(state, context, mode) + MIN_ACCEPTED_GAIN) {
                            state = trial;
                            firstPlacements = state.slots.get(firstSlot.key());
                            break;
                        }
                    }
                }
            }
        }
        return state;
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
                    if (!minimumsSatisfied(trial, context)) continue;
                    if (score(trial, context) > score(state, context) + MIN_ACCEPTED_GAIN) {
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

    private void addVariant(List<VariantCandidate> candidates, String name, String description,
                            BuildState state, OptimizationContext context) {
        candidates.add(new VariantCandidate(name, description, state, score(state, context)));
    }

    private List<VariantCandidate> deduplicateAndSort(List<VariantCandidate> candidates) {
        Map<String, VariantCandidate> unique = new LinkedHashMap<>();
        for (VariantCandidate candidate : candidates) {
            unique.putIfAbsent(signature(candidate.state), candidate);
        }
        return unique.values().stream()
                .sorted(Comparator.comparingDouble(VariantCandidate::score).reversed())
                .toList();
    }

    private double score(BuildState state, OptimizationContext context) {
        Metrics metrics = metrics(state, context);
        double result = 0;

        for (Map.Entry<DRIF_BONUS_TYPE, Integer> priority : context.request().getPriorities().entrySet().stream()
                .sorted(Map.Entry.comparingByKey(Comparator.comparing(Enum::name))).toList()) {
            DRIF_BONUS_TYPE type = priority.getKey();
            int weight = Math.max(1, priority.getValue() != null ? priority.getValue() : 1);
            double directedValue = directedValue(type, metrics.values().getOrDefault(type, 0.0), context.request());
            Double target = targetFor(type, context.request());

            if (target != null && target > 0) {
                double progress = Math.min(directedValue / target, 1.0);
                result += progress * weight * 1000.0;
                if (directedValue < target) result -= (target - directedValue) * weight * 25.0;
                if (directedValue > target) result -= (directedValue - target) * weight * 80.0;
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

    private double variantScore(BuildState state, OptimizationContext context, OptimizationMode mode) {
        Metrics metrics = metrics(state, context);
        double value = score(state, context);
        if (mode == OptimizationMode.CAPACITY) {
            value += metrics.capacityUtilization() * 100.0;
        } else if (mode == OptimizationMode.PENALTY) {
            value -= metrics.penaltyLoss() * 100.0;
        } else if (mode == OptimizationMode.BALANCE) {
            value += metrics.coveredPriorityTypes() * 25.0;
        }
        return value;
    }

    private Metrics metrics(BuildState state, OptimizationContext context) {
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

        long covered = context.request().getPriorities().keySet().stream()
                .filter(type -> counts.getOrDefault(type, 0) > 0)
                .count();
        double utilization = totalCapacity > 0 ? (double) usedCapacity / totalCapacity : 0.0;
        return new Metrics(counts, values, totalPower, overflowPower, utilization, penaltyLoss, (int) covered);
    }

    private OptimizationSummary createSummary(BuildState state, OptimizationContext context, double executionTime) {
        Metrics metrics = metrics(state, context);
        return new OptimizationSummary(true, "Optymalizacja zakończona.",
                metrics.counts().values().stream().mapToInt(Integer::intValue).sum(),
                metrics.totalPower(), executionTime);
    }

    private List<String> buildSuggestions(BuildState state, OptimizationContext context) {
        Metrics metrics = metrics(state, context);
        List<String> suggestions = new ArrayList<>();

        for (Map.Entry<DRIF_BONUS_TYPE, Integer> entry : context.request().getPriorities().entrySet().stream()
                .sorted(Map.Entry.comparingByKey(Comparator.comparing(Enum::name))).toList()) {
            DRIF_BONUS_TYPE type = entry.getKey();
            int count = metrics.counts().getOrDefault(type, 0);
            if (isCritical(type, context.request()) && count == 0) {
                suggestions.add("Krytyczny mod " + type.getDescription() + " nie został umieszczony.");
            }
            OptimizationRequest.QuantityRange range = safeQuantities(context.request()).get(type);
            if (range != null && count < range.getMin()) {
                suggestions.add("Nie osiągnięto minimum dla " + type.getDescription() + ".");
            }
            if (count >= 4) {
                suggestions.add("" + type.getDescription() + " występuje " + count + " razy i podlega karze globalnej.");
            }
            Double target = targetFor(type, context.request());
            if (target != null && calculatedValue(state, type, context) + TARGET_TOLERANCE < target) {
                suggestions.add("" + type.getDescription() + " jest poniżej wybranego celu.");
            }
        }

        for (SlotContext slot : context.slots) {
            Metrics slotMetrics = metricsForSlot(state, slot);
            if (slot.optimizable() && slotMetrics.remainingCapacity() >= 2) {
                suggestions.add("Slot " + slot.key() + " ma niewykorzystaną pojemność: "
                        + slotMetrics.remainingCapacity() + ".");
            }
        }
        return suggestions.stream().distinct().limit(8).toList();
    }

    /** Końcowa kontrola używa tego samego kalkulatora, który widzi gracz. */
    private List<String> validateWithCalculator(EquipmentRequest setup, OptimizationContext context) {
        List<String> suggestions = new ArrayList<>();
        try {
            Map<String, String> calculated = calculatorService.calculateTotalStats(setup);
            for (DRIF_BONUS_TYPE type : context.request().getPriorities().keySet().stream()
                    .sorted(Comparator.comparing(Enum::name)).toList()) {
                if (isCritical(type, context.request()) && countBonusInSetup(setup, type, context) == 0) {
                    suggestions.add("Krytyczny mod " + type.getDescription() + " nie został potwierdzony w wyniku.");
                }
                Double target = targetFor(type, context.request());
                if (target == null) continue;

                double actual = parseCalculatedValue(calculated.get(type.name()));
                actual = directedValue(type, actual, context.request());
                if (actual + TARGET_TOLERANCE < target) {
                    suggestions.add(type.getDescription() + " nadal jest poniżej celu po walidacji kalkulatorem ("
                            + formatValue(actual) + "/" + formatValue(target) + ").");
                } else if (isForcedCap(type, context.request()) && actual > target + CAP_TOLERANCE) {
                    suggestions.add(type.getDescription() + " przekracza cap po walidacji kalkulatorem ("
                            + formatValue(actual) + "/" + formatValue(target) + ").");
                }
            }
        } catch (RuntimeException exception) {
            suggestions.add("Nie udało się wykonać końcowej walidacji kalkulatorem statystyk.");
        }
        return suggestions;
    }

    private double parseCalculatedValue(String value) {
        if (value == null || value.isBlank()) return 0.0;
        try {
            return Double.parseDouble(value.replace("%", "").replace(",", ".").replace("+", "").trim());
        } catch (NumberFormatException exception) {
            return 0.0;
        }
    }

    private String formatValue(double value) {
        return String.format(java.util.Locale.ROOT, "%.2f", value);
    }

    private int countBonusInSetup(EquipmentRequest setup, DRIF_BONUS_TYPE type,
                                  OptimizationContext context) {
        if (setup == null || setup.getSlots() == null) return 0;
        return setup.getSlots().values().stream()
                .filter(Objects::nonNull)
                .map(EquipmentRequest.SlotData::getDrifIds)
                .filter(Objects::nonNull)
                .flatMap(List::stream)
                .map(context.drifs()::get)
                .filter(Objects::nonNull)
                .filter(drif -> drif.getBonusType() == type)
                .mapToInt(ignored -> 1)
                .sum();
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

    /**
     * Ostateczna bariera bezpieczeństwa dla odpowiedzi API. Chroni również
     * przed starym stanem wejściowym albo blokadą wskazującą indeks poza
     * limitem przedmiotu. Przedmioty epickie/setowe pomijamy, ponieważ ich
     * wbudowane drify nie są standardowymi slotami drifów.
     */
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

    private OptimizationResponse failedResponse(String message, double seconds) {
        return new OptimizationResponse(new EquipmentRequest(),
                new OptimizationSummary(false, message, 0, 0, seconds));
    }

    private Integer highestFittingLevel(BuildState state, SlotContext slot, DrifTemplate drif) {
        int remaining = slot.capacity() - usedPower(state.slots.get(slot.key()));
        for (int level = drif.getSize().getMaxLevel(); level >= 1; level--) {
            if (power(drif, level) <= remaining) return level;
        }
        return null;
    }

    private Integer highestFittingLevelForReplacement(BuildState state, SlotContext slot,
                                                       DrifTemplate drif, int index) {
        int remaining = slot.capacity() - usedPowerExcept(state.slots.get(slot.key()), index);
        for (int level = drif.getSize().getMaxLevel(); level >= 1; level--) {
            if (power(drif, level) <= remaining) return level;
        }
        return null;
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

    private Metrics metricsForSlot(BuildState state, SlotContext slot) {
        int used = usedPower(state.slots.getOrDefault(slot.key(), List.of()));
        return new Metrics(Map.of(), Map.of(), used, Math.max(0, used - slot.capacity()),
                slot.capacity() > 0 ? (double) Math.min(used, slot.capacity()) / slot.capacity() : 0,
                0, 0, slot.capacity() - used);
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
        return System.nanoTime() >= context.deadlineNanos();
    }

    private enum OptimizationMode { CAPACITY, BALANCE, PENALTY }

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
                                        long deadlineNanos) { }

    private static final class BuildState {
        private final Map<String, List<Placement>> slots = new HashMap<>();

        private BuildState copy() {
            BuildState copy = new BuildState();
            slots.forEach((key, values) -> copy.slots.put(key, new ArrayList<>(values)));
            return copy;
        }
    }

    private record VariantCandidate(String name, String description, BuildState state, double score) { }

    private record Metrics(Map<DRIF_BONUS_TYPE, Integer> counts, Map<DRIF_BONUS_TYPE, Double> values,
                           int totalPower, int overflowPower, double capacityUtilization,
                           double penaltyLoss, int coveredPriorityTypes, int remainingCapacity) {
        private Metrics(Map<DRIF_BONUS_TYPE, Integer> counts, Map<DRIF_BONUS_TYPE, Double> values,
                        int totalPower, int overflowPower, double capacityUtilization,
                        double penaltyLoss, int coveredPriorityTypes) {
            this(counts, values, totalPower, overflowPower, capacityUtilization, penaltyLoss, coveredPriorityTypes, 0);
        }
    }
}
