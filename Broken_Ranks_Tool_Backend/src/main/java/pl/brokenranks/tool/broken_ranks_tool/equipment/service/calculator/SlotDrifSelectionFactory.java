package pl.brokenranks.tool.broken_ranks_tool.equipment.service.calculator;

import java.util.ArrayList;
import java.util.List;
import org.springframework.stereotype.Component;
import pl.brokenranks.tool.broken_ranks_tool.equipment.dto.EquipmentRequest;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.DrifTemplate;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.provider.EquipmentDataProvider.CalculationContext;

/** Resolves requested drif identifiers and levels into validated calculation input. */
@Component
public class SlotDrifSelectionFactory {

    public SlotDrifSelection create(
            EquipmentRequest.SlotData slotData, CalculationContext context) {
        List<DrifTemplate> drifs = new ArrayList<>();
        List<Integer> levels = new ArrayList<>();
        if (slotData.getDrifIds() == null) {
            return new SlotDrifSelection(drifs, levels);
        }

        for (int index = 0; index < slotData.getDrifIds().size(); index++) {
            Long drifId = slotData.getDrifIds().get(index);
            if (drifId == null || !context.drifs().containsKey(drifId)) continue;
            drifs.add(context.drifs().get(drifId));
            levels.add(requestedLevel(slotData, index));
        }
        return new SlotDrifSelection(drifs, levels);
    }

    private int requestedLevel(EquipmentRequest.SlotData slotData, int index) {
        if (slotData.getDrifLevels() == null) return 1;
        Integer level = slotData.getDrifLevels().get(String.valueOf(index));
        return level != null ? level : 1;
    }

    /** Drif templates and corresponding requested levels for one slot. */
    public record SlotDrifSelection(List<DrifTemplate> drifs, List<Integer> levels) {}
}
