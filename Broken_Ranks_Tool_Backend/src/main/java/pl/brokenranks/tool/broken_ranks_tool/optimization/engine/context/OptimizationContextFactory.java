package pl.brokenranks.tool.broken_ranks_tool.optimization.engine.context;

import static pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model.OptimizationSearchModel.*;
import static pl.brokenranks.tool.broken_ranks_tool.optimization.engine.rules.OptimizationRequestConstraints.safeQuantities;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_BONUS_TYPE;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.RARITY;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.util.RomanNumeralParser;
import pl.brokenranks.tool.broken_ranks_tool.equipment.dto.EquipmentRequest;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.DrifTemplate;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.ItemTemplate;
import pl.brokenranks.tool.broken_ranks_tool.equipment.persistence.repository.DrifTemplateRepository;
import pl.brokenranks.tool.broken_ranks_tool.equipment.persistence.repository.ItemTemplateRepository;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.calculator.processor.ItemStatProcessor;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.validator.EquipmentValidator;
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.OptimizationRequest;

/** Loads templates and prepares the immutable request context used by the search. */
@RequiredArgsConstructor
public final class OptimizationContextFactory {

    private final DrifTemplateRepository drifRepository;
    private final ItemTemplateRepository itemRepository;
    private final EquipmentValidator validator;
    private final ItemStatProcessor itemStatProcessor;

    public OptimizationContext create(
            OptimizationRequest request,
            int beamSearchSteps,
            int maximizationSearchSteps,
            int refinementSearchSteps) {
        Map<Long, ItemTemplate> items = loadItems(request);
        Map<Long, DrifTemplate> drifs = loadDrifs();
        List<SlotContext> slots = buildSlots(request, items, drifs);
        return new OptimizationContext(
                request,
                items,
                drifs,
                slots,
                groupSlotsByDrifBonus(slots),
                sortedPriorities(request),
                sortedQuantities(request),
                new SearchBudget(beamSearchSteps),
                new SearchBudget(maximizationSearchSteps),
                new SearchBudget(refinementSearchSteps),
                new EnumMap<>(DRIF_BONUS_TYPE.class),
                new EnumMap<>(DRIF_BONUS_TYPE.class),
                new HashMap<>(),
                new HashMap<>(),
                new HashMap<>());
    }

    private Map<Long, ItemTemplate> loadItems(OptimizationRequest request) {
        List<Long> itemIds =
                request.getOriginalSlots().values().stream()
                        .filter(Objects::nonNull)
                        .map(EquipmentRequest.SlotData::getItemId)
                        .filter(Objects::nonNull)
                        .sorted()
                        .toList();
        return itemRepository.findAllById(itemIds).stream()
                .sorted(Comparator.comparing(ItemTemplate::getId))
                .collect(
                        Collectors.toMap(
                                ItemTemplate::getId,
                                Function.identity(),
                                (left, right) -> left,
                                LinkedHashMap::new));
    }

    private Map<Long, DrifTemplate> loadDrifs() {
        return drifRepository.findAll().stream()
                .sorted(Comparator.comparing(DrifTemplate::getId))
                .collect(
                        Collectors.toMap(
                                DrifTemplate::getId,
                                Function.identity(),
                                (left, right) -> left,
                                LinkedHashMap::new));
    }

    private Map<Double, List<SlotContext>> groupSlotsByDrifBonus(List<SlotContext> slots) {
        return slots.stream()
                .collect(
                        Collectors.groupingBy(
                                SlotContext::drifBonus, LinkedHashMap::new, Collectors.toList()));
    }

    private List<Map.Entry<DRIF_BONUS_TYPE, Integer>> sortedPriorities(
            OptimizationRequest request) {
        return request.getPriorities().entrySet().stream()
                .sorted(Map.Entry.comparingByKey(Comparator.comparing(Enum::name)))
                .toList();
    }

    private List<Map.Entry<DRIF_BONUS_TYPE, OptimizationRequest.QuantityRange>> sortedQuantities(
            OptimizationRequest request) {
        return safeQuantities(request).entrySet().stream()
                .sorted(Map.Entry.comparingByKey(Comparator.comparing(Enum::name)))
                .toList();
    }

    private List<SlotContext> buildSlots(
            OptimizationRequest request,
            Map<Long, ItemTemplate> items,
            Map<Long, DrifTemplate> drifs) {
        List<SlotContext> slots = new ArrayList<>();
        request.getOriginalSlots().entrySet().stream()
                .sorted(Map.Entry.comparingByKey())
                .map(entry -> createSlot(entry, request, items, drifs))
                .filter(Objects::nonNull)
                .forEach(slots::add);

        slots.sort(
                Comparator.comparingDouble(SlotContext::drifBonus)
                        .reversed()
                        .thenComparing(SlotContext::key));
        slots.forEach(
                slot ->
                        slot.candidates()
                                .sort(
                                        Comparator.comparing(
                                                        (DrifTemplate drif) ->
                                                                priorityOf(
                                                                        drif.getBonusType(),
                                                                        request),
                                                        Comparator.reverseOrder())
                                                .thenComparing(drif -> drif.getBonusType().name())
                                                .thenComparing(DrifTemplate::getId)));
        return slots;
    }

    private SlotContext createSlot(
            Map.Entry<String, EquipmentRequest.SlotData> entry,
            OptimizationRequest request,
            Map<Long, ItemTemplate> items,
            Map<Long, DrifTemplate> drifs) {
        EquipmentRequest.SlotData slotData = entry.getValue();
        if (slotData == null || slotData.getItemId() == null) return null;

        ItemTemplate item = items.get(slotData.getItemId());
        if (item == null || !validator.isValidItem(item, entry.getKey())) return null;

        int stars = slotData.getItemStars() != null ? slotData.getItemStars() : 1;
        boolean special = item.getRarity() == RARITY.EPIC || item.getRarity() == RARITY.SET;
        int capacity = validator.calculateItemCapacity(item, stars);
        int maxDrifs = special ? 0 : calculateMaxDrifs(item, stars);
        double drifBonus = itemStatProcessor.calculateFinalDrifMod(item, stars);
        List<DrifTemplate> candidates =
                special
                        ? new ArrayList<>()
                        : candidatesForSlot(entry.getKey(), item, request, drifs);
        Set<Integer> lockedIndices =
                request.getLockedDrifs() != null
                        ? request.getLockedDrifs().getOrDefault(entry.getKey(), Set.of())
                        : Set.of();

        return new SlotContext(
                entry.getKey(),
                slotData,
                item,
                capacity,
                maxDrifs,
                drifBonus,
                candidates,
                lockedIndices,
                special);
    }

    private List<DrifTemplate> candidatesForSlot(
            String slotKey,
            ItemTemplate item,
            OptimizationRequest request,
            Map<Long, DrifTemplate> drifs) {
        return drifs.values().stream()
                .filter(drif -> validator.isValidDrifSizeForTier(drif, item))
                .filter(drif -> validator.isElementalDrifPositionValid(drif, slotKey))
                .filter(drif -> request.getPriorities().containsKey(drif.getBonusType()))
                .collect(
                        Collectors.toMap(
                                DrifTemplate::getBonusType,
                                Function.identity(),
                                this::preferLargerDrif,
                                () -> new EnumMap<>(DRIF_BONUS_TYPE.class)))
                .values()
                .stream()
                .collect(Collectors.toCollection(ArrayList::new));
    }

    private DrifTemplate preferLargerDrif(DrifTemplate left, DrifTemplate right) {
        int levelComparison =
                Integer.compare(left.getSize().getMaxLevel(), right.getSize().getMaxLevel());
        if (levelComparison != 0) return levelComparison > 0 ? left : right;
        return left.getId() <= right.getId() ? left : right;
    }

    private int calculateMaxDrifs(ItemTemplate item, int stars) {
        int tier =
                item.getTier() != null
                        ? RomanNumeralParser.convertRomanToInteger(item.getTier())
                        : 1;
        int max = tier >= 10 ? 3 : tier >= 4 ? 2 : tier >= 1 ? 1 : 0;
        if ((tier == 2 || tier == 3) && stars >= 7) max++;
        return max;
    }

    private int priorityOf(DRIF_BONUS_TYPE type, OptimizationRequest request) {
        return request.getPriorities().getOrDefault(type, 0);
    }
}
