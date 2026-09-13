package pl.brokenranks.tool.broken_ranks_tool.optimization.advisor;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Consumer;
import pl.brokenranks.tool.broken_ranks_tool.equipment.dto.EquipmentRequest.SlotData;

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
            String label,
            String change,
            int effort,
            Consumer<AdvisorSearch.Node> accept) {
        if (!search.running()) return;
        Map<String, SlotData> next = new LinkedHashMap<>(node.slots());
        next.put(key, slot);
        if (model.valid(next)) accept.accept(child(node, next, label, change, 1, effort));
    }

    AdvisorSearch.Node child(
            AdvisorSearch.Node parent,
            Map<String, SlotData> slots,
            String label,
            String change,
            int upgrades,
            int effort) {
        List<String> actions = new ArrayList<>(parent.actions());
        actions.add(label);
        Set<String> changed = new HashSet<>(parent.changed());
        if (change != null) changed.add(change);
        return new AdvisorSearch.Node(
                slots,
                null,
                actions,
                changed,
                parent.upgrades() + upgrades,
                parent.effort() + effort);
    }
}
