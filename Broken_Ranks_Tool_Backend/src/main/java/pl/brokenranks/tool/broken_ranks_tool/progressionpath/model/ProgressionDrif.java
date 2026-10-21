package pl.brokenranks.tool.broken_ranks_tool.progressionpath.model;

import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.EQUIPMENT_SLOT;

/** One ordinary drif instance; a null position means the stone is stored outside equipment. */
public record ProgressionDrif(String instanceId, long templateId, int level, Position position) {
    public ProgressionDrif {
        if (instanceId == null || instanceId.isBlank() || instanceId.length() > 160) {
            throw new IllegalArgumentException(
                    "Identyfikator sztuki drifa musi mieć od 1 do 160 znaków.");
        }
        if (templateId < 1 || level < 1) {
            throw new IllegalArgumentException("Drif wymaga dodatniego ID szablonu i poziomu.");
        }
    }

    /** Original socket indices are retained even when other sockets are empty. */
    public record Position(String slot, int socketIndex) {
        public Position {
            if (EQUIPMENT_SLOT.fromKey(slot) == null || socketIndex < 0 || socketIndex > 2) {
                throw new IllegalArgumentException("Nieprawidłowa pozycja zwykłego drifa.");
            }
        }
    }
}
