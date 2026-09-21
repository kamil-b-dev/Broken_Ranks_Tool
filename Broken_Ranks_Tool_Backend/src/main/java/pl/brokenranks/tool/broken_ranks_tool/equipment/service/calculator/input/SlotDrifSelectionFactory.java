package pl.brokenranks.tool.broken_ranks_tool.equipment.service.calculator.input;

import java.util.ArrayList;
import java.util.List;
import org.springframework.stereotype.Component;
import pl.brokenranks.tool.broken_ranks_tool.equipment.dto.EquipmentRequest;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.DrifTemplate;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.calculator.input.EquipmentDataProvider.CalculationContext;

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
            if (drifId == null) continue;
            if (!context.drifs().containsKey(drifId)) {
                throw new IllegalArgumentException("Nie znaleziono drifa o ID " + drifId + ".");
            }
            drifs.add(context.drifs().get(drifId));
            levels.add(requestedLevel(slotData, index));
        }
        validateLevelKeys(slotData);
        return new SlotDrifSelection(drifs, levels);
    }

    private void validateLevelKeys(EquipmentRequest.SlotData slotData) {
        if (slotData.getDrifLevels() == null) return;
        int count = slotData.getDrifIds() != null ? slotData.getDrifIds().size() : 0;
        for (String key : slotData.getDrifLevels().keySet()) {
            try {
                int index = Integer.parseInt(key);
                if (index >= 0 && index < count) continue;
            } catch (NumberFormatException ignored) {
                // Report malformed indices below.
            }
            throw new IllegalArgumentException("Mapa poziomów zawiera nieprawidłowy indeks drifa.");
        }
    }

    private int requestedLevel(EquipmentRequest.SlotData slotData, int index) {
        if (slotData.getDrifLevels() == null) return 1;
        Integer level = slotData.getDrifLevels().get(String.valueOf(index));
        if (level == null && slotData.getDrifLevels().containsKey(String.valueOf(index))) {
            throw new IllegalArgumentException("Poziom drifa nie może być pusty.");
        }
        return level != null ? level : 1;
    }

    /** Drif templates and corresponding requested levels for one slot. */
    public record SlotDrifSelection(List<DrifTemplate> drifs, List<Integer> levels) {}
}
