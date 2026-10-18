package pl.brokenranks.tool.broken_ranks_tool.progressionpath.model;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import pl.brokenranks.tool.broken_ranks_tool.equipment.dto.EquipmentRequest;
import pl.brokenranks.tool.broken_ranks_tool.equipment.dto.EquipmentRequest.SlotData;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.calculator.input.OrbSelectionNormalizer;

/** A detached stage snapshot; neither the caller nor a calculator can mutate its stored build. */
public record ProgressionStage(String id, int characterLevel, EquipmentRequest equipment) {
    public static final int MAX_CHARACTER_LEVEL = 140;

    public ProgressionStage {
        if (id == null || id.isBlank() || id.length() > 64) {
            throw new IllegalArgumentException("Identyfikator etapu musi mieć od 1 do 64 znaków.");
        }
        if (characterLevel < 1 || characterLevel > MAX_CHARACTER_LEVEL) {
            throw new IllegalArgumentException(
                    "Etap '" + id + "': poziom postaci musi mieścić się w zakresie 1–140.");
        }
        if (equipment == null || equipment.getSlots() == null) {
            throw new IllegalArgumentException(
                    "Etap '" + id + "': wymagany jest snapshot ekwipunku z konfiguracją slotów.");
        }
        equipment = copy(OrbSelectionNormalizer.normalize(equipment));
    }

    @Override
    public EquipmentRequest equipment() {
        return copy(equipment);
    }

    private static EquipmentRequest copy(EquipmentRequest source) {
        var copy = new EquipmentRequest();
        var slots = new LinkedHashMap<String, SlotData>();
        source.getSlots().forEach((key, slot) -> slots.put(key, copySlot(slot)));
        copy.setSlots(slots);
        copy.setCharacterStats(
                source.getCharacterStats() == null
                        ? null
                        : new LinkedHashMap<>(source.getCharacterStats()));
        return copy;
    }

    private static SlotData copySlot(SlotData source) {
        if (source == null) return null;
        var copy = new SlotData();
        copy.setItemId(source.getItemId());
        copy.setItemStars(source.getItemStars());
        copy.setDrifIds(source.getDrifIds() == null ? null : new ArrayList<>(source.getDrifIds()));
        copy.setDrifLevels(
                source.getDrifLevels() == null
                        ? null
                        : new LinkedHashMap<>(source.getDrifLevels()));
        copy.setOrbIds(source.getOrbIds() == null ? null : new ArrayList<>(source.getOrbIds()));
        copy.setOrbLevels(
                source.getOrbLevels() == null ? null : new ArrayList<>(source.getOrbLevels()));
        return copy;
    }
}
