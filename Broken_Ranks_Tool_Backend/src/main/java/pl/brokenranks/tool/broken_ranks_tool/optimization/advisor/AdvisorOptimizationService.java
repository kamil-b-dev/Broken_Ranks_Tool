package pl.brokenranks.tool.broken_ranks_tool.optimization.advisor;

import static pl.brokenranks.tool.broken_ranks_tool.optimization.advisor.AdvisorStatValues.parsed;
import static pl.brokenranks.tool.broken_ranks_tool.optimization.support.EquipmentSlotDataCopier.copySlots;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.rules.DrifValueCalculator;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.rules.EquipmentRulesRegistry;
import pl.brokenranks.tool.broken_ranks_tool.equipment.dto.CalculationResultDto;
import pl.brokenranks.tool.broken_ranks_tool.equipment.dto.EquipmentRequest.SlotData;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.DrifTemplate;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.ItemTemplate;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.OrbTemplate;
import pl.brokenranks.tool.broken_ranks_tool.equipment.persistence.repository.DrifTemplateRepository;
import pl.brokenranks.tool.broken_ranks_tool.equipment.persistence.repository.ItemTemplateRepository;
import pl.brokenranks.tool.broken_ranks_tool.equipment.persistence.repository.OrbTemplateRepository;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.EquipmentStatsCalculatorService;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.calculator.input.EquipmentDataProvider.CalculationContext;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.calculator.processor.ItemStatProcessor;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.calculator.processor.OrbStatProcessor;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.validator.EquipmentPlacementRules;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.validator.UpgradeLevelPolicy;
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.AdvisorOptions;
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.OptimizationRequest;
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.OptimizationResponse;

/** Owns one bounded advisor run and verifies its finalists with the shared calculator. */
@Service
@RequiredArgsConstructor
public class AdvisorOptimizationService {
    private final AdvisorOptionsValidator optionsValidator = new AdvisorOptionsValidator();
    private final AdvisorFinalistVerifier finalistVerifier = new AdvisorFinalistVerifier();
    private final AdvisorResponseFactory responses = new AdvisorResponseFactory();
    private final ItemTemplateRepository itemRepository;
    private final DrifTemplateRepository drifRepository;
    private final OrbTemplateRepository orbRepository;
    private final EquipmentPlacementRules placement;
    private final UpgradeLevelPolicy levels;
    private final EquipmentRulesRegistry rules;
    private final ItemStatProcessor itemProcessor;
    private final OrbStatProcessor orbProcessor;
    private final DrifValueCalculator values;
    private final EquipmentStatsCalculatorService calculator;
    private final AdvisorRunRegistry runs;

    public OptimizationResponse optimize(OptimizationRequest request) {
        long started = System.nanoTime();
        AdvisorOptions options = request.getAdvisor();
        if (!optionsValidator.valid(options))
            return responses.failure("Nieprawidłowy cel lub zakres analizy Doradcy.", started);
        String runId = options.getRunId() == null ? null : options.getRunId().toString();
        var cancelled = runs.start(runId);
        try {
            AdvisorEquipmentModel model = createModel(request, loadTemplates());
            Map<String, SlotData> slots = copySlots(request.getOriginalSlots());
            if (!validSlotAndLockReferences(request, slots)) {
                return responses.failure(
                        "Popraw obecny build: pusty slot nie może zawierać kamieni, a blokady muszą wskazywać istniejące drify.",
                        started);
            }
            slots.entrySet()
                    .removeIf(
                            entry ->
                                    entry.getValue() == null
                                            || entry.getValue().getItemId() == null);
            if (slots.isEmpty() || !model.valid(slots))
                return responses.failure(
                        "Popraw obecny build: sprawdź tier, poziomy, gniazda, pojemność i unikalność kamieni.",
                        started);

            CalculationResultDto baselineCalculation =
                    calculator.calculateWithSources(model.setup(slots));
            Map<String, String> before = baselineCalculation.stats();
            double[] baseline = parsed(before);
            long deadline = started + options.getTimeBudgetMs() * 1_000_000L;
            // Reserve part of the common budget for final calculator verification.
            long searchDeadline =
                    deadline - Math.min(300, options.getTimeBudgetMs() / 5) * 1_000_000L;
            AdvisorSearch search =
                    new AdvisorSearch(model, options, baseline, searchDeadline, cancelled);
            if (search.reached(baseline)
                    && options.getStrategy() == AdvisorOptions.Strategy.MINIMUM_CHANGE)
                return responses.success(
                        model, search, slots, baselineCalculation, List.of(), started);

            List<AdvisorSearch.Node> candidates = new ArrayList<>(search.run(slots));
            List<AdvisorFinalistVerifier.Verified> selected =
                    finalistVerifier.verify(candidates, model, search, calculator, deadline);
            return responses.success(model, search, slots, baselineCalculation, selected, started);
        } finally {
            runs.finish(runId, cancelled);
        }
    }

    private boolean validSlotAndLockReferences(
            OptimizationRequest request, Map<String, SlotData> slots) {
        for (var entry : slots.entrySet()) {
            String key = entry.getKey();
            SlotData slot = entry.getValue();
            if (key == null || !rules.getSlotItemRules().containsKey(key) || slot == null) {
                return false;
            }
            if (slot.getItemId() == null && hasStonePayload(slot)) return false;
        }
        if (request.getLockedSlots() != null) {
            for (String key : request.getLockedSlots()) {
                if (!equipped(slots.get(key))) return false;
            }
        }
        if (request.getLockedDrifs() != null) {
            for (var entry : request.getLockedDrifs().entrySet()) {
                SlotData slot = slots.get(entry.getKey());
                if (!equipped(slot) || entry.getValue() == null) return false;
                List<Long> ids = slot.getDrifIds() != null ? slot.getDrifIds() : List.of();
                for (Integer index : entry.getValue()) {
                    if (index == null || index < 0 || index >= ids.size() || ids.get(index) == null)
                        return false;
                }
            }
        }
        return true;
    }

    private boolean equipped(SlotData slot) {
        return slot != null && slot.getItemId() != null;
    }

    private boolean hasStonePayload(SlotData slot) {
        boolean hasDrif =
                slot.getDrifIds() != null
                                && slot.getDrifIds().stream().anyMatch(java.util.Objects::nonNull)
                        || slot.getDrifLevels() != null && !slot.getDrifLevels().isEmpty();
        boolean hasOrb =
                slot.getOrbIds() != null
                        && slot.getOrbIds().stream().anyMatch(java.util.Objects::nonNull);
        return hasDrif || hasOrb;
    }

    private CalculationContext loadTemplates() {
        return new CalculationContext(
                index(itemRepository.findAll(), ItemTemplate::getId),
                index(orbRepository.findAll(), OrbTemplate::getId),
                index(drifRepository.findAll(), DrifTemplate::getId));
    }

    private <T> Map<Long, T> index(List<T> templates, Function<T, Long> id) {
        return templates.stream()
                .collect(
                        Collectors.toMap(
                                id, Function.identity(), (first, ignored) -> first, TreeMap::new));
    }

    private AdvisorEquipmentModel createModel(
            OptimizationRequest request, CalculationContext templates) {
        return new AdvisorEquipmentModel(
                templates, request, placement, levels, rules, itemProcessor, orbProcessor, values);
    }
}
