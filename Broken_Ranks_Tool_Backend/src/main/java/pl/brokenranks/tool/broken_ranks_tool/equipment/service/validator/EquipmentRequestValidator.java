package pl.brokenranks.tool.broken_ranks_tool.equipment.service.validator;

import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.rules.CharacterStatRules;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.rules.EquipmentRulesRegistry;
import pl.brokenranks.tool.broken_ranks_tool.equipment.dto.EquipmentRequest;

/** Validates the envelope and character data of a calculation request. */
@Component
@RequiredArgsConstructor
public class EquipmentRequestValidator {
    public static final int MAX_CHARACTER_STAT = CharacterStatRules.MAX_CHARACTER_STAT;

    private final EquipmentRulesRegistry rules;

    public void validateRequest(EquipmentRequest request) {
        if (request == null || request.getSlots() == null) {
            throw new IllegalArgumentException("Żądanie musi zawierać konfigurację slotów.");
        }
        request.getSlots()
                .forEach(
                        (key, value) -> {
                            if (key == null
                                    || key.isBlank()
                                    || !rules.getSlotItemRules().containsKey(key)
                                    || value == null) {
                                throw new IllegalArgumentException(
                                        "Konfiguracja zawiera nieprawidłowy slot.");
                            }
                            validateSlotPayload(key, value);
                        });
    }

    private void validateSlotPayload(String key, EquipmentRequest.SlotData slot) {
        if (slot.getSynergetic() != null) validateSynergetic(key, slot);
        boolean hasDrifs =
                slot.getDrifIds() != null
                        && slot.getDrifIds().stream().anyMatch(java.util.Objects::nonNull);
        boolean hasOrbs =
                slot.getOrbIds() != null
                        && slot.getOrbIds().stream().anyMatch(java.util.Objects::nonNull);
        boolean hasDrifLevels = slot.getDrifLevels() != null && !slot.getDrifLevels().isEmpty();
        boolean hasOrbLevels = slot.getOrbLevels() != null && !slot.getOrbLevels().isEmpty();
        if (slot.getItemId() == null && (hasDrifs || hasOrbs || hasDrifLevels || hasOrbLevels)) {
            throw new IllegalArgumentException(
                    "Pusty slot " + key + " nie może zawierać kamieni ani ich poziomów.");
        }
        if (!hasDrifs && hasDrifLevels) {
            throw new IllegalArgumentException(
                    "Slot " + key + " zawiera poziomy bez przypisanych drifów.");
        }
        if (hasOrbLevels) {
            for (int index = 0; index < slot.getOrbLevels().size(); index++) {
                if (slot.getOrbIds() == null
                        || index >= slot.getOrbIds().size()
                        || slot.getOrbIds().get(index) == null) {
                    throw new IllegalArgumentException(
                            "Slot " + key + " zawiera poziomy bez przypisanych orbów.");
                }
            }
        }
    }

    public void validateCharacterStats(Map<String, Integer> stats) {
        CharacterStatRules.validate(stats);
    }

    private void validateSynergetic(String key, EquipmentRequest.SlotData slot) {
        var item = slot.getSynergetic();
        if (!java.util.Set.of("ring1", "ring2", "necklace").contains(key)
                || slot.getItemId() != null
                || slot.getItemStars() != null && slot.getItemStars() != 1
                || slot.getDrifIds() != null && !slot.getDrifIds().isEmpty()
                || slot.getOrbIds() != null && !slot.getOrbIds().isEmpty()
                || item.name() == null
                || item.name().isBlank()
                || item.name().length() > 64
                || item.stats() == null
                || item.stats().isEmpty()
                || item.stats().size() > 16) {
            throw new IllegalArgumentException(
                    "Synergetyk wymaga pustego slotu pierścienia lub naszyjnika, bez gwiazdek i kamieni.");
        }
        item.stats()
                .forEach(
                        (name, value) -> {
                            boolean known =
                                    java.util.Arrays.stream(
                                                            pl.brokenranks.tool.broken_ranks_tool
                                                                    .equipment.domain.enums
                                                                    .STAT_TYPE.values())
                                                    .anyMatch(
                                                            stat ->
                                                                    stat.getDescription()
                                                                            .equals(name))
                                            || java.util.Arrays.stream(
                                                            pl.brokenranks.tool.broken_ranks_tool
                                                                    .equipment.domain.enums
                                                                    .RESISTANCE_STAT_TYPE.values())
                                                    .anyMatch(
                                                            stat ->
                                                                    stat.getDescription()
                                                                            .equals(name));
                            if (!known || value == null || value < 0 || value > 50_000)
                                throw new IllegalArgumentException(
                                        "Synergetyk zawiera niepoprawną statystykę lub wartość spoza zakresu 0–50000.");
                        });
    }
}
