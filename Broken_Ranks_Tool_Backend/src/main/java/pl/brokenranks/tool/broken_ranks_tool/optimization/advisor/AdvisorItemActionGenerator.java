package pl.brokenranks.tool.broken_ranks_tool.optimization.advisor;

import static pl.brokenranks.tool.broken_ranks_tool.optimization.advisor.AdvisorSearch.slotName;
import static pl.brokenranks.tool.broken_ranks_tool.optimization.advisor.AdvisorSlotData.signature;
import static pl.brokenranks.tool.broken_ranks_tool.optimization.advisor.AdvisorSlotData.stars;
import static pl.brokenranks.tool.broken_ranks_tool.optimization.support.EquipmentSlotDataCopier.copySlot;

import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Consumer;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.ITEM_PROFILE;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.RARITY;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.SPECIAL_STAT_TYPE;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.STAT_TYPE;
import pl.brokenranks.tool.broken_ranks_tool.equipment.dto.EquipmentRequest.SlotData;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.ItemTemplate;
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.AdvisorProfession;

/** Selects and emits bounded item replacement actions for the advisor. */
final class AdvisorItemActionGenerator {
    private final AdvisorSearch search;
    private final AdvisorEquipmentModel model;
    private final AdvisorNodeFactory nodes;
    private final Map<ReplacementCacheKey, List<ItemTemplate>> replacements = new HashMap<>();

    AdvisorItemActionGenerator(AdvisorSearch search, AdvisorNodeFactory nodes) {
        this.search = search;
        this.model = search.model;
        this.nodes = nodes;
    }

    void generateChanges(
            AdvisorSearch.Node node,
            String key,
            SlotData slot,
            Consumer<AdvisorSearch.Node> accept) {
        for (ItemTemplate replacement :
                replacements.computeIfAbsent(
                        new ReplacementCacheKey(key, signature(Map.of(key, slot))),
                        ignored -> candidates(key, slot))) {
            if (!search.running()) return;
            SlotData next = copySlot(slot);
            next.setItemId(replacement.getId());
            nodes.emit(
                    node,
                    key,
                    next,
                    "Zmień "
                            + slotName(key)
                            + ": "
                            + model.item(slot).getName()
                            + " → "
                            + replacement.getName()
                            + " ("
                            + stars(slot)
                            + "★)",
                    new AdvisorChangeKey.Item(key),
                    1,
                    accept);
        }
    }

    private List<ItemTemplate> candidates(String key, SlotData slot) {
        AdvisorProfession selected = selectedProfile();
        List<ItemTemplate> compatible =
                model.templates.items().values().stream()
                        .filter(
                                item ->
                                        !item.getId().equals(slot.getItemId())
                                                && model.placement.isValidItem(item, key))
                        .filter(
                                item ->
                                        item.getRarity() != RARITY.EPIC
                                                && item.getRarity() != RARITY.SET)
                        .filter(item -> selected.accepts(item.getProfile()))
                        .filter(item -> validReplacement(key, slot, item))
                        .toList();
        int currentCapacity = model.levels.calculateItemCapacity(model.item(slot), stars(slot));
        int bestReplacementCapacity =
                compatible.stream()
                        .mapToInt(item -> model.levels.calculateItemCapacity(item, stars(slot)))
                        .max()
                        .orElse(currentCapacity);
        int maximumCapacity = Math.max(currentCapacity, bestReplacementCapacity);
        return compatible.stream()
                .filter(
                        item ->
                                model.levels.calculateItemCapacity(item, stars(slot))
                                        == maximumCapacity)
                .sorted(
                        Comparator.comparingDouble(
                                        (ItemTemplate item) ->
                                                (item.getStats() == null
                                                                        ? 0
                                                                        : item.getStats()
                                                                                .getOrDefault(
                                                                                        SPECIAL_STAT_TYPE
                                                                                                .DRIF_BONUS
                                                                                                .getDescription(),
                                                                                        0.0))
                                                                * 10
                                                        + model.levels.calculateItemCapacity(
                                                                item, stars(slot)))
                                .reversed()
                                .thenComparing(ItemTemplate::getId))
                .toList();
    }

    private boolean validReplacement(String key, SlotData slot, ItemTemplate item) {
        SlotData replacement = copySlot(slot);
        replacement.setItemId(item.getId());
        return model.validSlot(key, replacement);
    }

    private AdvisorProfession selectedProfile() {
        if (search.options.getProfession() != AdvisorProfession.AUTO)
            return search.options.getProfession();
        double magical = 0;
        double physical = 0;
        for (SlotData equipped : model.request.getOriginalSlots().values()) {
            ItemTemplate item = model.item(equipped);
            if (item == null || item.getStats() == null) continue;
            if (item.getProfile() == ITEM_PROFILE.MAGICAL) magical += 2;
            if (item.getProfile() == ITEM_PROFILE.PHYSICAL) physical += 2;
            magical +=
                    item.getStats().getOrDefault(STAT_TYPE.POWER.getDescription(), 0.0)
                            + item.getStats()
                                    .getOrDefault(STAT_TYPE.KNOWLEDGE.getDescription(), 0.0);
            physical +=
                    item.getStats().getOrDefault(STAT_TYPE.STRENGTH.getDescription(), 0.0)
                            + item.getStats()
                                    .getOrDefault(STAT_TYPE.DEXTERITY.getDescription(), 0.0);
        }
        var character = model.request.getCharacterStats();
        if (character != null) {
            magical +=
                    character.getOrDefault(STAT_TYPE.POWER.getDescription(), 0)
                            + character.getOrDefault(STAT_TYPE.KNOWLEDGE.getDescription(), 0);
            physical +=
                    character.getOrDefault(STAT_TYPE.STRENGTH.getDescription(), 0)
                            + character.getOrDefault(STAT_TYPE.DEXTERITY.getDescription(), 0);
        }
        return magical == physical
                ? AdvisorProfession.UNIVERSAL
                : magical > physical ? AdvisorProfession.MAGICAL : AdvisorProfession.PHYSICAL;
    }

    private record ReplacementCacheKey(String slot, String equipmentSignature) {}
}
