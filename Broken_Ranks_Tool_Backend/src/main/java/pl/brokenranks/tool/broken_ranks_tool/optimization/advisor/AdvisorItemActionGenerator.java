package pl.brokenranks.tool.broken_ranks_tool.optimization.advisor;

import static pl.brokenranks.tool.broken_ranks_tool.optimization.advisor.AdvisorSearch.slotName;
import static pl.brokenranks.tool.broken_ranks_tool.optimization.advisor.AdvisorSlotData.stars;
import static pl.brokenranks.tool.broken_ranks_tool.optimization.support.EquipmentSlotDataCopier.copySlot;

import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Consumer;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.ITEM_PROFILE;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.RARITY;
import pl.brokenranks.tool.broken_ranks_tool.equipment.dto.EquipmentRequest.SlotData;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.ItemTemplate;

/** Selects and emits bounded item replacement actions for the advisor. */
final class AdvisorItemActionGenerator {
    private final AdvisorSearch search;
    private final AdvisorEquipmentModel model;
    private final AdvisorNodeFactory nodes;
    private final Map<String, List<ItemTemplate>> replacements = new HashMap<>();

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
                replacements.computeIfAbsent(key, ignored -> candidates(key, slot))) {
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
                    "item:" + key,
                    1,
                    accept);
        }
    }

    private List<ItemTemplate> candidates(String key, SlotData slot) {
        String selected = selectedProfile();
        return model.templates.items().values().stream()
                .filter(
                        item ->
                                !item.getId().equals(slot.getItemId())
                                        && model.placement.isValidItem(item, key))
                .filter(item -> item.getRarity() != RARITY.EPIC && item.getRarity() != RARITY.SET)
                .filter(
                        item ->
                                item.getProfile() == ITEM_PROFILE.UNIVERSAL
                                        || item.getProfile() == ITEM_PROFILE.UNSPECIFIED
                                        || item.getProfile().name().equals(selected))
                .sorted(
                        Comparator.comparingDouble(
                                        (ItemTemplate item) ->
                                                (item.getStats() == null
                                                                        ? 0
                                                                        : item.getStats()
                                                                                .getOrDefault(
                                                                                        "Bonus drify",
                                                                                        0.0))
                                                                * 10
                                                        + model.levels.calculateItemCapacity(
                                                                item, stars(slot)))
                                .reversed()
                                .thenComparing(ItemTemplate::getId))
                .limit(3)
                .toList();
    }

    private String selectedProfile() {
        if (!"AUTO".equals(search.options.getProfession())) return search.options.getProfession();
        double magical = 0;
        double physical = 0;
        for (SlotData equipped : model.request.getOriginalSlots().values()) {
            ItemTemplate item = model.item(equipped);
            if (item == null || item.getStats() == null) continue;
            if (item.getProfile() == ITEM_PROFILE.MAGICAL) magical += 2;
            if (item.getProfile() == ITEM_PROFILE.PHYSICAL) physical += 2;
            magical +=
                    item.getStats().getOrDefault("Moc", 0.0)
                            + item.getStats().getOrDefault("Wiedza", 0.0);
            physical +=
                    item.getStats().getOrDefault("Siła", 0.0)
                            + item.getStats().getOrDefault("Zręczność", 0.0);
        }
        var character = model.request.getCharacterStats();
        if (character != null) {
            magical += character.getOrDefault("Moc", 0) + character.getOrDefault("Wiedza", 0);
            physical += character.getOrDefault("Siła", 0) + character.getOrDefault("Zręczność", 0);
        }
        return magical == physical ? "UNIVERSAL" : magical > physical ? "MAGICAL" : "PHYSICAL";
    }
}
