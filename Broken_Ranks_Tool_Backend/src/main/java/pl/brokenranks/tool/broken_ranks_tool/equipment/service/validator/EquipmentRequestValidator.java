package pl.brokenranks.tool.broken_ranks_tool.equipment.service.validator;

import java.util.Map;
import org.springframework.stereotype.Component;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.STAT_TYPE;
import pl.brokenranks.tool.broken_ranks_tool.equipment.dto.EquipmentRequest;

/** Validates the envelope and character data of a calculation request. */
@Component
public class EquipmentRequestValidator {
    public void validateRequest(EquipmentRequest request) {
        if (request == null || request.getSlots() == null) {
            throw new IllegalArgumentException("Żądanie musi zawierać konfigurację slotów.");
        }
        request.getSlots()
                .forEach(
                        (key, value) -> {
                            if (key == null || key.isBlank() || value == null) {
                                throw new IllegalArgumentException(
                                        "Konfiguracja zawiera nieprawidłowy slot.");
                            }
                        });
    }

    public void validateCharacterStats(Map<String, Integer> stats) {
        if (stats == null) return;
        stats.forEach(
                (key, value) -> {
                    if (!STAT_TYPE.isValid(key) || value == null) {
                        throw new IllegalArgumentException(
                                "Wykryto nieprawidłową statystykę postaci: " + key);
                    }
                });
    }
}
