package pl.brokenranks.tool.broken_ranks_tool.optimization.advisor;

import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Consumer;
import pl.brokenranks.tool.broken_ranks_tool.equipment.dto.EquipmentRequest.SlotData;
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.AdvisorAction;

/** Creates child search nodes and applies whole-build validation when required. */
final class AdvisorNodeFactory {
    private final AdvisorSearch search;
    private final AdvisorEquipmentModel model;

    AdvisorNodeFactory(AdvisorSearch search) {
        this.search = search;
        this.model = search.model;
    }

    void emit(
            AdvisorSearch.Node node,
            String key,
            SlotData slot,
            AdvisorChangeKey change,
            int effort,
            Consumer<AdvisorSearch.Node> accept) {
        if (!search.running()) return;
        Map<String, SlotData> next = new LinkedHashMap<>(node.slots());
        next.put(key, slot);
        if (model.valid(next)) accept.accept(child(node, next, change, 1, effort));
    }

    AdvisorSearch.Node child(
            AdvisorSearch.Node parent,
            Map<String, SlotData> slots,
            AdvisorChangeKey change,
            int upgrades,
            int effort) {
        AdvisorAction action = new AdvisorActionFactory().create(parent, slots);
        List<AdvisorAction> details =
                new AdvisorActionSequence().append(parent.actionDetails(), action);
        AdvisorActionRenderer renderer = new AdvisorActionRenderer(model);
        List<String> actions = details.stream().map(renderer::render).toList();
        int mergedUpgrades = parent.actionDetails().size() + 1 - details.size();
        Set<AdvisorChangeKey> changed = new HashSet<>(parent.changed());
        if (change != null) changed.add(change);
        return new AdvisorSearch.Node(
                slots,
                null,
                actions,
                changed,
                parent.upgrades() + upgrades - mergedUpgrades,
                parent.effort() + effort,
                details);
    }

    AdvisorSearch.Node child(
            AdvisorSearch.Node parent, Map<String, SlotData> slots, int upgrades, int effort) {
        return child(parent, slots, null, upgrades, effort);
    }
}
