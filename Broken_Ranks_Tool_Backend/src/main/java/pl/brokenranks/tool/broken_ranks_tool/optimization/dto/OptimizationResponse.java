package pl.brokenranks.tool.broken_ranks_tool.optimization.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import pl.brokenranks.tool.broken_ranks_tool.equipment.dto.EquipmentRequest;

import java.util.ArrayList;
import java.util.List;

/**
 * DTO dla odpowiedzi z wynikiem optymalizacji.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class OptimizationResponse {
    /**
     * Kompletna, zoptymalizowana konfiguracja ekwipunku, gotowa do użycia
     * przez frontend do zaktualizowania stanu i interfejsu.
     */
    private EquipmentRequest optimizedSetup;

    /**
     * Podsumowanie wyników optymalizacji.
     */
    private OptimizationSummary summary;

    /** Alternatywne ścieżki optymalizacji posortowane od najlepszego wyniku. */
    private List<OptimizationVariant> variants = new ArrayList<>();

    /** Sugestie dotyczące ograniczeń lub dalszych możliwych zmian. */
    private List<String> suggestions = new ArrayList<>();

    public OptimizationResponse(EquipmentRequest optimizedSetup, OptimizationSummary summary) {
        this.optimizedSetup = optimizedSetup;
        this.summary = summary;
    }
}
