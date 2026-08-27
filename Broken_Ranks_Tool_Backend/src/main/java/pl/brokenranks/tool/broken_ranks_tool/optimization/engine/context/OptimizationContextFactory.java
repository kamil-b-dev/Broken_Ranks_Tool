package pl.brokenranks.tool.broken_ranks_tool.optimization.engine.context;

import static pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model.OptimizationSearchModel.*;
import static pl.brokenranks.tool.broken_ranks_tool.optimization.engine.rules.OptimizationRequestConstraints.safeQuantities;

import java.util.Comparator;
import java.util.EnumMap;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_BONUS_TYPE;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.DrifTemplate;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.ItemTemplate;
import pl.brokenranks.tool.broken_ranks_tool.equipment.persistence.repository.DrifTemplateRepository;
import pl.brokenranks.tool.broken_ranks_tool.equipment.persistence.repository.ItemTemplateRepository;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.calculator.processor.ItemStatProcessor;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.validator.EquipmentValidator;
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.OptimizationRequest;

/** Assembles the immutable request context used by the optimization search. */
public final class OptimizationContextFactory {
    private final OptimizationTemplateProvider templates;
    private final OptimizationSlotContextFactory slots;

    public OptimizationContextFactory(
            DrifTemplateRepository drifRepository,
            ItemTemplateRepository itemRepository,
            EquipmentValidator validator,
            ItemStatProcessor itemStatProcessor) {
        this.templates = new OptimizationTemplateProvider(drifRepository, itemRepository);
        this.slots = new OptimizationSlotContextFactory(validator, itemStatProcessor);
    }

    public OptimizationContext create(
            OptimizationRequest request,
            int beamSearchSteps,
            int maximizationSearchSteps,
            int refinementSearchSteps) {
        Map<Long, ItemTemplate> items = templates.loadItems(request);
        Map<Long, DrifTemplate> drifs = templates.loadDrifs();
        List<SlotContext> slotContexts = slots.createAll(request, items, drifs);
        return new OptimizationContext(
                request,
                items,
                drifs,
                slotContexts,
                slotContexts.stream()
                        .collect(
                                Collectors.groupingBy(
                                        SlotContext::drifBonus,
                                        LinkedHashMap::new,
                                        Collectors.toList())),
                request.getPriorities().entrySet().stream()
                        .sorted(Map.Entry.comparingByKey(Comparator.comparing(Enum::name)))
                        .toList(),
                safeQuantities(request).entrySet().stream()
                        .sorted(Map.Entry.comparingByKey(Comparator.comparing(Enum::name)))
                        .toList(),
                new SearchBudget(beamSearchSteps),
                new SearchBudget(maximizationSearchSteps),
                new SearchBudget(refinementSearchSteps),
                new EnumMap<>(DRIF_BONUS_TYPE.class),
                new EnumMap<>(DRIF_BONUS_TYPE.class),
                new HashMap<>(),
                new HashMap<>(),
                new HashMap<>());
    }
}
