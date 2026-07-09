package pl.brokenranks.tool.broken_ranks_tool.equipment.service;

import pl.brokenranks.tool.broken_ranks_tool.equipment.dto.EquipmentRequest;
import java.util.Map;

/**
 * Definiuje abstrakcję dla mechanizmu obliczania statystyk,
 * aby oddzielić logikę biznesową od warstwy API.
 */
public interface EquipmentStatsCalculatorService {

    /**
     * Przetwarza żądanie i oblicza finalne statystyki.
     *
     * @param request Obiekt DTO z konfiguracją ekwipunku.
     * @return Mapa sformatowanych statystyk.
     */
    Map<String, String> calculateTotalStats(EquipmentRequest request);

}
