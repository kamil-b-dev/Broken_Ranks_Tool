package pl.brokenranks.tool.broken_ranks_tool.optimization.dto;

import lombok.Data;
import pl.brokenranks.tool.broken_ranks_tool.core.enums.DRIF_BONUS_TYPE;
import pl.brokenranks.tool.broken_ranks_tool.equipment.dto.EquipmentRequest;

import java.util.List;
import java.util.Map;

/**
 * DTO dla żądania optymalizacji modyfikacji (drifów).
 */
@Data
public class OptimizationRequest {
    /**
     * Kompletna, oryginalna mapa slotów z frontendu.
     * Backend użyje jej jako bazy do przeprowadzenia optymalizacji.
     */
    private Map<String, EquipmentRequest.SlotData> originalSlots;

    /**
     * Posortowana lista typów bonusów, które użytkownik chce maksymalizować.
     * Kolejność na liście odzwierciedla priorytet.
     */
    private List<DRIF_BONUS_TYPE> prioritizedBonuses;
}
