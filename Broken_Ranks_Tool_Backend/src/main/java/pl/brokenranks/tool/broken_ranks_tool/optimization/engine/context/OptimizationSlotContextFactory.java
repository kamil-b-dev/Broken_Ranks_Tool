package pl.brokenranks.tool.broken_ranks_tool.optimization.engine.context;

import static pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model.OptimizationSearchModel.SlotContext;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumMap;
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
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.calculator.processor.ItemStatProcessor;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.validator.EquipmentPlacementRules;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.validator.UpgradeLevelPolicy;
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.OptimizationRequest;

/** Converts request slots and templates into search-ready slot contexts. */
@RequiredArgsConstructor
final class OptimizationSlotContextFactory {
    private final EquipmentPlacementRules placementRules;
    private final UpgradeLevelPolicy levelPolicy;
    private final ItemStatProcessor itemStatProcessor;

    List<SlotContext> createAll(
            OptimizationRequest request,
            Map<Long, ItemTemplate> items,
            Map<Long, DrifTemplate> drifs) {
        List<SlotContext> slots =
                request.getOriginalSlots().entrySet().stream()
                        .sorted(Map.Entry.comparingByKey())
                        .map(entry -> create(entry, request, items, drifs))
                        .filter(Objects::nonNull)
                        .collect(Collectors.toCollection(ArrayList::new));
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
                                                                request.getPriorities()
                                                                        .getOrDefault(
                                                                                drif.getBonusType(),
                                                                                0),
                                                        Comparator.reverseOrder())
                                                .thenComparing(drif -> drif.getBonusType().name())
                                                .thenComparing(DrifTemplate::getId)));
        return slots;
    }

    private SlotContext create(
            Map.Entry<String, EquipmentRequest.SlotData> entry,
            OptimizationRequest request,
            Map<Long, ItemTemplate> items,
            Map<Long, DrifTemplate> drifs) {
        EquipmentRequest.SlotData data = entry.getValue();
        if (data == null || data.getItemId() == null) return null;
        ItemTemplate item = items.get(data.getItemId());
        if (item == null || !placementRules.isValidItem(item, entry.getKey())) return null;
        int stars = data.getItemStars() == null ? 1 : data.getItemStars();
        boolean special = item.getRarity() == RARITY.EPIC || item.getRarity() == RARITY.SET;
        Set<Integer> locks =
                request.getLockedDrifs() == null
                        ? Set.of()
                        : request.getLockedDrifs().getOrDefault(entry.getKey(), Set.of());
        return new SlotContext(
                entry.getKey(),
                data,
                item,
                levelPolicy.calculateItemCapacity(item, stars),
                special ? 0 : maxDrifs(item, stars),
                itemStatProcessor.calculateFinalDrifMod(item, stars),
                special ? new ArrayList<>() : candidates(entry.getKey(), item, request, drifs),
                locks,
                special);
    }

    private List<DrifTemplate> candidates(
            String slot,
            ItemTemplate item,
            OptimizationRequest request,
            Map<Long, DrifTemplate> drifs) {
        return drifs.values().stream()
                .filter(drif -> placementRules.isValidDrifSizeForTier(drif, item))
                .filter(drif -> placementRules.isElementalDrifPositionValid(drif, slot))
                .filter(drif -> request.getPriorities().containsKey(drif.getBonusType()))
                .collect(
                        Collectors.toMap(
                                DrifTemplate::getBonusType,
                                Function.identity(),
                                this::preferLarger,
                                () -> new EnumMap<>(DRIF_BONUS_TYPE.class)))
                .values()
                .stream()
                .collect(Collectors.toCollection(ArrayList::new));
    }

    private DrifTemplate preferLarger(DrifTemplate left, DrifTemplate right) {
        int comparison =
                Integer.compare(left.getSize().getMaxLevel(), right.getSize().getMaxLevel());
        return comparison == 0
                ? (left.getId() <= right.getId() ? left : right)
                : (comparison > 0 ? left : right);
    }

    private int maxDrifs(ItemTemplate item, int stars) {
        int tier =
                item.getTier() == null
                        ? 1
                        : RomanNumeralParser.convertRomanToInteger(item.getTier());
        int max = tier >= 10 ? 3 : tier >= 4 ? 2 : tier >= 1 ? 1 : 0;
        return (tier == 2 || tier == 3) && stars >= 7 ? max + 1 : max;
    }
}
