package pl.brokenranks.tool.broken_ranks_tool.equipment.service;

import pl.brokenranks.tool.broken_ranks_tool.equipment.dto.EquipmentRequest;
import java.util.Map;

/**
 * Serwis odpowiedzialny za obliczanie całkowitych statystyk ekwipunku postaci.
 */
public interface EquipmentStatsCalculatorService {

    /**
     * Oblicza i formatuje statystyki na podstawie wybranego ekwipunku i statystyk bazowych postaci.
     *
     * @param request Obiekt DTO zawierający szczegóły wybranego ekwipunku (przedmioty, orby, drify)
     *                oraz bazowe statystyki postaci.
     * @return Mapa, gdzie kluczem jest nazwa statystyki, a wartością sformatowana wartość (np. "120" lub "15.5%").
     */
    Map<String, String> calculateTotalStats(EquipmentRequest request);

}
