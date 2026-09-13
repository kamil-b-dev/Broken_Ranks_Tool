package pl.brokenranks.tool.broken_ranks_tool.optimization.advisor;

import static pl.brokenranks.tool.broken_ranks_tool.optimization.advisor.AdvisorSearch.slotName;
import static pl.brokenranks.tool.broken_ranks_tool.optimization.advisor.AdvisorSlotData.stars;
import static pl.brokenranks.tool.broken_ranks_tool.optimization.support.EquipmentSlotDataCopier.copySlot;

import java.util.ArrayList;
import java.util.List;
import java.util.function.Consumer;
import pl.brokenranks.tool.broken_ranks_tool.equipment.dto.EquipmentRequest.SlotData;

/** Coordinates specialized generators of valid neighboring equipment configurations. */
final class AdvisorActionGenerator {
    private final AdvisorSearch search;
    private final AdvisorEquipmentModel model;
    private final AdvisorNodeFactory nodes;
    private final AdvisorDrifActionGenerator drifs;
    private final AdvisorItemActionGenerator items;

    AdvisorActionGenerator(AdvisorSearch search) {
        this.search = search;
        this.model = search.model;
        this.nodes = new AdvisorNodeFactory(search);
        this.drifs = new AdvisorDrifActionGenerator(search, nodes);
        this.items = new AdvisorItemActionGenerator(search, nodes);
    }

    void generate(AdvisorSearch.Node node, Consumer<AdvisorSearch.Node> accept) {
        List<String> keys = new ArrayList<>(node.slots().keySet());
        drifs.generateMoves(node, keys, accept);
        var allowed = search.options.getAllowedChanges();
        for (String key : keys) {
            if (!search.running()) return;
            if (model.locked(key)) continue;
            SlotData slot = node.slots().get(key);
            if (allowed.isStars() && !node.changed().contains("stars:" + key))
                generateStarChanges(node, key, slot, accept);
            if (model.special(slot)) continue;
            if (allowed.isDrifs() || allowed.isDrifUpgrades())
                drifs.generateChanges(node, key, slot, accept);
            if (allowed.isItems() && !node.changed().contains("item:" + key))
                items.generateChanges(node, key, slot, accept);
        }
    }

    private void generateStarChanges(
            AdvisorSearch.Node node,
            String key,
            SlotData slot,
            Consumer<AdvisorSearch.Node> accept) {
        for (int star = stars(slot) + 1; star <= 9 && search.running(); star++) {
            SlotData next = copySlot(slot);
            next.setItemStars(star);
            nodes.emit(
                    node,
                    key,
                    next,
                    starLabel(key, slot, star),
                    "stars:" + key,
                    star - stars(slot),
                    accept);
        }
    }

    private String starLabel(String key, SlotData slot, int star) {
        return "Podnieś "
                + slotName(key)
                + " ("
                + model.item(slot).getName()
                + ") z "
                + stars(slot)
                + "★ do "
                + star
                + "★";
    }
}
