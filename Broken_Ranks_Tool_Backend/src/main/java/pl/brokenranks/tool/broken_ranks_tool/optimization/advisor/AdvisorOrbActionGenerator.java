package pl.brokenranks.tool.broken_ranks_tool.optimization.advisor;

import static pl.brokenranks.tool.broken_ranks_tool.optimization.advisor.AdvisorSearch.slotName;
import static pl.brokenranks.tool.broken_ranks_tool.optimization.advisor.AdvisorStatValues.TYPES;
import static pl.brokenranks.tool.broken_ranks_tool.optimization.support.EquipmentSlotDataCopier.copySlot;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.function.Consumer;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.RARITY;
import pl.brokenranks.tool.broken_ranks_tool.equipment.dto.EquipmentRequest.SlotData;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.OrbTemplate;

/** Generates orb replacement actions for one equipment slot. */
final class AdvisorOrbActionGenerator {
    private final AdvisorSearch search;
    private final AdvisorEquipmentModel model;
    private final AdvisorNodeFactory nodes;

    AdvisorOrbActionGenerator(AdvisorSearch search, AdvisorNodeFactory nodes) {
        this.search = search;
        this.model = search.model;
        this.nodes = nodes;
    }

    void generateChanges(
            AdvisorSearch.Node node,
            String key,
            SlotData slot,
            Consumer<AdvisorSearch.Node> accept) {
        int max = model.item(slot).getRarity() == RARITY.LEGENDARY ? 2 : 1;
        for (int index = 0; index < max && search.running(); index++) {
            if (node.changed().contains("orb:" + key + ":" + index)) continue;
            for (OrbTemplate orb : model.templates.orbs().values()) {
                if (!search.running()) return;
                if (Arrays.stream(TYPES)
                        .noneMatch(type -> type.name().equals(orb.getBonusType().name()))) continue;
                if (!model.placement.isValidOrb(orb, key, model.item(slot), index > 0)) continue;
                SlotData next = withOrb(slot, index, orb);
                nodes.emit(
                        node,
                        key,
                        next,
                        "Ustaw orb "
                                + orb.getName()
                                + " (poziom "
                                + orb.getSize().getMaxLevel()
                                + ") w "
                                + slotName(key)
                                + ", miejsce "
                                + (index + 1),
                        "orb:" + key + ":" + index,
                        1,
                        accept);
            }
        }
    }

    private SlotData withOrb(SlotData slot, int index, OrbTemplate orb) {
        SlotData next = copySlot(slot);
        if (next.getOrbIds() == null) next.setOrbIds(new ArrayList<>());
        if (next.getOrbLevels() == null) next.setOrbLevels(new ArrayList<>());
        while (next.getOrbIds().size() <= index) next.getOrbIds().add(null);
        while (next.getOrbLevels().size() <= index) next.getOrbLevels().add(1);
        next.getOrbIds().set(index, orb.getId());
        next.getOrbLevels().set(index, orb.getSize().getMaxLevel());
        return next;
    }
}
