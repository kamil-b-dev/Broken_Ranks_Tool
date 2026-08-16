package pl.brokenranks.tool.broken_ranks_tool.optimization.service.impl;

import lombok.RequiredArgsConstructor;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_BONUS_TYPE;
import pl.brokenranks.tool.broken_ranks_tool.equipment.dto.EquipmentRequest;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.EquipmentStatsCalculatorService;
import pl.brokenranks.tool.broken_ranks_tool.optimization.constraints.OptimizationLockService;
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.OptimizationSummary;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

import static pl.brokenranks.tool.broken_ranks_tool.optimization.service.impl.DrifOptimizationMath.*;
import static pl.brokenranks.tool.broken_ranks_tool.optimization.service.impl.OptimizationRequestConstraints.*;
import static pl.brokenranks.tool.broken_ranks_tool.optimization.service.impl.OptimizationSearchModel.*;

/** Converts internal search state into the API response and validates the final setup. */
@RequiredArgsConstructor
final class OptimizationResultAssembler {

    private final OptimizationLockService lockService;
    private final EquipmentStatsCalculatorService calculatorService;
    private final OptimizationStateEvaluator stateEvaluator;

    void calibrateCalculatorBaseline(BuildState state, OptimizationContext context) {
        Map<String, String> stats = actualStats(state, context);
        for (DRIF_BONUS_TYPE type : context.request().getPriorities().keySet()) {
            if (!stats.containsKey(type.name())) continue;
            double actual = directedValue(type, parseCalculatedValue(stats.get(type.name())), context.request());
            context.calculatorBaseline().put(type,
                    actual - stateEvaluator.currentValue(state, type, context));
        }
    }

    EquipmentRequest toSetup(BuildState state, OptimizationContext context) {
        Map<String, EquipmentRequest.SlotData> slots = deepCopySlots(context.request().getOriginalSlots());
        for (SlotContext slot : context.slots()) {
            if (!slot.optimizable()) continue;
            EquipmentRequest.SlotData output = copySlot(slot.original());
            List<Placement> placements = state.slots.getOrDefault(slot.key(), List.of());
            List<Long> ids = new ArrayList<>();
            Map<String, Integer> levels = new HashMap<>();
            int outputLimit = Math.min(placements.size(), slot.maxDrifs());
            for (int index = 0; index < outputLimit; index++) {
                Placement placement = placements.get(index);
                ids.add(placement != null ? placement.drif().getId() : null);
                if (placement != null) levels.put(String.valueOf(index), placement.level());
            }
            while (!ids.isEmpty() && ids.get(ids.size() - 1) == null) {
                ids.remove(ids.size() - 1);
            }
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

    OptimizationSummary createSummary(BuildState state, OptimizationContext context,
                                       double executionTime, List<String> warnings) {
        Metrics metrics = stateEvaluator.metrics(state, context);
        return new OptimizationSummary(warnings.isEmpty(),
                warnings.isEmpty() ? "Optymalizacja zakończona."
                        : "Nie udało się osiągnąć wymuszonego capa dla co najmniej jednego modyfikatora.",
                metrics.counts().values().stream().mapToInt(Integer::intValue).sum(),
                metrics.totalPower(), executionTime, warnings);
    }

    String validateFinalResult(BuildState state, OptimizationContext context) {
        if (!stateEvaluator.minimumsSatisfied(state, context)) {
            return "Końcowy wynik nie spełnia minimalnych limitów ilościowych.";
        }
        for (SlotContext slot : context.slots()) {
            List<Placement> placements = state.slots.getOrDefault(slot.key(), List.of());
            if (slot.optimizable() && countPlaced(placements) > slot.maxDrifs()) {
                return "Końcowy wynik przekracza limit drifów w slocie " + slot.key() + ".";
            }
            if (slot.optimizable() && usedPower(placements) > slot.capacity()) {
                return "Końcowy wynik przekracza pojemność w slocie " + slot.key() + ".";
            }
            Set<DRIF_BONUS_TYPE> unique = new HashSet<>();
            for (Placement placement : placements) {
                if (placement != null && !unique.add(placement.drif().getBonusType())) {
                    return "Końcowy wynik zawiera zduplikowany mod w slocie " + slot.key() + ".";
                }
            }
        }

        return null;
    }

    /** Returns non-fatal warnings for every forced cap the best valid build cannot reach. */
    List<String> forcedCapWarnings(BuildState state, OptimizationContext context) {
        Map<String, String> actual = actualStats(state, context);
        List<String> warnings = new ArrayList<>();
        for (DRIF_BONUS_TYPE type : context.request().getPriorities().keySet().stream()
                .filter(candidate -> isForcedCap(candidate, context.request()))
                .sorted(Comparator.comparing(Enum::name))
                .toList()) {
            Double target = targetFor(type, context.request());
            if (target == null) continue;
            if (!actual.containsKey(type.name())) {
                warnings.add("Kalkulator nie zwrócił wartości wymaganego capa: "
                        + type.getDescription() + ".");
                continue;
            }
            double value = directedValue(type, parseCalculatedValue(actual.get(type.name())),
                    context.request());
            if (value < target - TARGET_TOLERANCE) {
                warnings.add("Nie udało się osiągnąć wymuszonego capa dla " + type.getDescription()
                        + " (" + String.format(java.util.Locale.ROOT, "%.2f", value) + "/"
                        + String.format(java.util.Locale.ROOT, "%.2f", target) + ").");
            }
        }
        return warnings;
    }

    private Map<String, String> actualStats(BuildState state, OptimizationContext context) {
        String key = state.signature();
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

    /** Final API safety barrier for stale input, invalid locks, and capacity violations. */
    private void enforceDrifLimits(Map<String, EquipmentRequest.SlotData> slots,
                                   OptimizationContext context) {
        for (SlotContext slot : context.slots()) {
            if (slot.special()) continue;
            EquipmentRequest.SlotData output = slots.get(slot.key());
            if (output == null || output.getDrifIds() == null
                    || output.getDrifIds().size() <= slot.maxDrifs()) continue;

            List<Long> limitedIds = new ArrayList<>(output.getDrifIds().subList(0, slot.maxDrifs()));
            Map<String, Integer> limitedLevels = new HashMap<>();
            if (output.getDrifLevels() != null) {
                output.getDrifLevels().entrySet().stream()
                        .filter(entry -> isIndexWithinLimit(entry.getKey(), slot.maxDrifs()))
                        .forEach(entry -> limitedLevels.put(entry.getKey(), entry.getValue()));
            }
            output.setDrifIds(limitedIds);
            output.setDrifLevels(limitedLevels);
        }
    }

    private boolean isIndexWithinLimit(String index, int limit) {
        try {
            return Integer.parseInt(index) < limit;
        } catch (NumberFormatException exception) {
            return false;
        }
    }

    private double parseCalculatedValue(String value) {
        if (value == null || value.isBlank()) return 0.0;
        try {
            return Double.parseDouble(value.replace("%", "").replace(",", ".")
                    .replace("+", "").trim());
        } catch (NumberFormatException exception) {
            return 0.0;
        }
    }

    private Map<String, EquipmentRequest.SlotData> deepCopySlots(
            Map<String, EquipmentRequest.SlotData> source) {
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
}
