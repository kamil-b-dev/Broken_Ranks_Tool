package pl.brokenranks.tool.broken_ranks_tool.optimization.dto;

import java.util.List;

/** Structured action data independent of its human-readable description. Socket indices are zero-based. */
public record AdvisorAction(
        Type type,
        String slotKey,
        Long fromItemId,
        Long toItemId,
        Integer fromStars,
        Integer toStars,
        List<DrifChange> drifs) {
    public AdvisorAction {
        drifs = List.copyOf(drifs);
    }

    public enum Type {
        MOVE,
        SWAP,
        UPGRADE_DRIF,
        PURCHASE_DRIF,
        UPGRADE_STARS,
        REPLACE_ITEM
    }

    public record Location(String slotKey, int socketIndex) {}

    /** Identity survives movement and upgrading, even for repeated template IDs in the build. */
    public record DrifChange(
            String identity,
            Long drifId,
            Location from,
            Location to,
            Integer fromLevel,
            Integer toLevel) {}
}
