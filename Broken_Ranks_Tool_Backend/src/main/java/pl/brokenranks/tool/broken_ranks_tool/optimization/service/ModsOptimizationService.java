package pl.brokenranks.tool.broken_ranks_tool.optimization.service;

import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.OptimizationRequest;
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.OptimizationResponse;

public interface ModsOptimizationService {
    /**
     * Uruchamia proces optymalizacji modyfikacji (np. drifów) na podstawie
     * podanych przez użytkownika kryteriów i priorytetów.
     *
     * @param request DTO z żądaniem optymalizacji.
     * @return DTO z wynikiem optymalizacji, zawierające zoptymalizowaną
     *         konfigurację ekwipunku oraz podsumowanie.
     */
    OptimizationResponse optimize(OptimizationRequest request);
}
