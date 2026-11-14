package pl.brokenranks.tool.broken_ranks_tool.progressionpath.planning;

import java.util.*;
import java.util.function.Function;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.*;
import pl.brokenranks.tool.broken_ranks_tool.equipment.dto.*;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.calculator.input.EquipmentDataProvider.CalculationContext;
import pl.brokenranks.tool.broken_ranks_tool.progressionpath.dto.ProgressionTargetRequest;
import pl.brokenranks.tool.broken_ranks_tool.progressionpath.model.ProgressionDrif;

/** Validates every owned occurrence and exposes a detached inventory for forward replay. */
public final class ProgressionStartingInventory {
    private final List<ProgressionDrif> drifs = new ArrayList<>();
    private final List<ProgressionOrbs.Stone> orbs = new ArrayList<>();
    private final List<EquipmentRequest.SlotData> items = new ArrayList<>();

    public ProgressionStartingInventory(
            ProgressionTargetRequest.StartingPoint start,
            CalculationContext context,
            Function<EquipmentRequest, CalculationResultDto> calculate,
            ProgressionTransition transition,
            ProgressionOrbs orbPlanner) {
        if (start == null) return;
        drifs.addAll(transition.equipped(start.equipment()));
        orbs.addAll(orbPlanner.equipped(start.equipment()));
        var ids = new HashSet<String>();
        for (var entry : start.backpack()) {
            if (entry.kind() != ProgressionTargetRequest.ResourceKind.ITEM
                    && entry.templateId() == null)
                throw new IllegalArgumentException("Brak szablonu kamienia plecaka początkowego.");
            if (!ids.add(entry.id()))
                throw new IllegalArgumentException("Powtórzone ID sztuki w plecaku początkowym.");
            String id = "backpack:" + entry.kind() + ":" + entry.id();
            switch (entry.kind()) {
                case DRIF -> {
                    var template = context.drifs().get(entry.templateId());
                    if (template == null
                            || entry.level() == null
                            || entry.level() < 1
                            || entry.level() > template.getSize().getMaxLevel()
                            || entry.equipment() != null)
                        throw new IllegalArgumentException(
                                "Niepoprawny drif plecaka początkowego.");
                    drifs.add(new ProgressionDrif(id, entry.templateId(), entry.level(), null));
                }
                case ORB -> {
                    var template = context.orbs().get(entry.templateId());
                    if (template == null
                            || entry.level() == null
                            || entry.level() < 1
                            || entry.level() > template.getSize().getMaxLevel()
                            || entry.equipment() != null)
                        throw new IllegalArgumentException("Niepoprawny orb plecaka początkowego.");
                    orbs.add(
                            new ProgressionOrbs.Stone(id, entry.templateId(), entry.level(), null));
                }
                case ITEM -> {
                    var slot = entry.equipment();
                    var template = slot == null ? null : context.items().get(slot.getItemId());
                    if (template == null || entry.templateId() != null || entry.level() != null)
                        throw new IllegalArgumentException(
                                "Niepoprawny przedmiot plecaka początkowego.");
                    var key =
                            Arrays.stream(EQUIPMENT_SLOT.values())
                                    .filter(
                                            value ->
                                                    value.itemCategories()
                                                            .contains(template.getCategory()))
                                    .findFirst()
                                    .orElseThrow()
                                    .key();
                    var equipment = new EquipmentRequest();
                    equipment.setSlots(Map.of(key, slot));
                    calculate.apply(equipment);
                    items.add(slot);
                    int index = 0;
                    for (var stone : transition.equipped(equipment))
                        drifs.add(
                                new ProgressionDrif(
                                        id + ":drif:" + index++,
                                        stone.templateId(),
                                        stone.level(),
                                        null));
                    index = 0;
                    for (var stone : orbPlanner.equipped(equipment))
                        orbs.add(
                                new ProgressionOrbs.Stone(
                                        id + ":orb:" + index++,
                                        stone.templateId(),
                                        stone.level(),
                                        null));
                }
            }
        }
    }

    public List<ProgressionDrif> drifs() {
        return List.copyOf(drifs);
    }

    public List<ProgressionOrbs.Stone> orbs() {
        return List.copyOf(orbs);
    }

    public List<EquipmentRequest.SlotData> items() {
        return new ArrayList<>(items);
    }
}
