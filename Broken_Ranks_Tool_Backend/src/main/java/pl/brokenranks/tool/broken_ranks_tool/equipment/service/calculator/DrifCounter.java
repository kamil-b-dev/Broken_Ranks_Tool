package pl.brokenranks.tool.broken_ranks_tool.equipment.service.calculator;

import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_BONUS_TYPE;
import pl.brokenranks.tool.broken_ranks_tool.equipment.dto.EquipmentRequest;
import pl.brokenranks.tool.broken_ranks_tool.equipment.dto.EquipmentRequest.SlotData;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.DrifTemplate;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.ItemTemplate;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.calculator.input.EquipmentDataProvider.CalculationContext;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.validator.EquipmentPlacementRules;

/** Counts valid drif bonus occurrences used to determine global duplicate penalties. */
@Component
@RequiredArgsConstructor
public class DrifCounter {
    private final EquipmentPlacementRules placementRules;

    public Map<DRIF_BONUS_TYPE, Integer> count(
            EquipmentRequest request, CalculationContext context) {
        Map<DRIF_BONUS_TYPE, Integer> counts = new HashMap<>();
        boolean elementalDamageAssigned = false;
        for (Map.Entry<String, SlotData> entry : request.getSlots().entrySet()) {
            SlotData slot = entry.getValue();
            if (slot.getItemId() == null || !context.items().containsKey(slot.getItemId()))
                continue;
            ItemTemplate item = context.items().get(slot.getItemId());
            if (!placementRules.isValidItem(item, entry.getKey()) || slot.getDrifIds() == null)
                continue;
            Set<DRIF_BONUS_TYPE> uniqueTypes = new HashSet<>();
            for (Long drifId : slot.getDrifIds()) {
                if (drifId == null || !context.drifs().containsKey(drifId)) continue;
                DrifTemplate drif = context.drifs().get(drifId);
                if (!placementRules.isValidDrif(drif)
                        || !placementRules.isElementalDrifPositionValid(drif, entry.getKey())
                        || !placementRules.isValidDrifSizeForTier(drif, item)
                        || uniqueTypes.contains(drif.getBonusType())) continue;
                if (placementRules.isElementalDamage(drif.getBonusType())) {
                    if (elementalDamageAssigned) continue;
                    elementalDamageAssigned = true;
                }
                uniqueTypes.add(drif.getBonusType());
                counts.merge(drif.getBonusType(), 1, Integer::sum);
            }
        }
        return counts;
    }
}
