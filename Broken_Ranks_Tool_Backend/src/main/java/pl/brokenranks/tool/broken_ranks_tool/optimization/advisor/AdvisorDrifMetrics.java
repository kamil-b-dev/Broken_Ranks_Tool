package pl.brokenranks.tool.broken_ranks_tool.optimization.advisor;

import static pl.brokenranks.tool.broken_ranks_tool.optimization.advisor.AdvisorSlotData.*;
import static pl.brokenranks.tool.broken_ranks_tool.optimization.advisor.AdvisorStatValues.TYPES;

import java.util.Arrays;
import java.util.Map;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_BONUS_TYPE;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.rules.DrifPowerRules;
import pl.brokenranks.tool.broken_ranks_tool.equipment.dto.EquipmentRequest.SlotData;

/** Calculates response metrics directly from an advisor equipment setup. */
final class AdvisorDrifMetrics {
    int total(Map<String, SlotData> slots, AdvisorEquipmentModel model) {
        return Arrays.stream(TYPES).mapToInt(type -> count(slots, model, type)).sum();
    }

    int power(Map<String, SlotData> slots, AdvisorEquipmentModel model) {
        return slots.values().stream()
                .filter(slot -> !model.special(slot))
                .mapToInt(slot -> power(slot, model))
                .sum();
    }

    int count(Map<String, SlotData> slots, AdvisorEquipmentModel model, DRIF_BONUS_TYPE type) {
        return slots.values().stream().mapToInt(slot -> count(slot, model, type)).sum();
    }

    private int power(SlotData slot, AdvisorEquipmentModel model) {
        int power = 0;
        for (int index = 0; index < size(slot); index++)
            if (id(slot, index) != null)
                power +=
                        DrifPowerRules.power(
                                model.templates
                                        .drifs()
                                        .get(id(slot, index))
                                        .getBonusType()
                                        .getBasePower(),
                                level(slot, index));
        return power;
    }

    private int count(SlotData slot, AdvisorEquipmentModel model, DRIF_BONUS_TYPE type) {
        int count = 0;
        for (int index = 0; index < size(slot); index++)
            if (id(slot, index) != null
                    && model.templates.drifs().get(id(slot, index)).getBonusType() == type) count++;
        return count;
    }
}
