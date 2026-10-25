package pl.brokenranks.tool.broken_ranks_tool.equipment.dto;

import lombok.Builder;

/** One actual addition to the calculator, before final display rounding. */
public record StatContributionDto(
        Source source, double baseValue, double value, boolean percentage) {
    @Builder
    public record Source(
            String kind,
            String slotKey,
            String itemName,
            int itemStars,
            String stoneName,
            String size,
            int level,
            int socketIndex,
            boolean builtIn,
            double itemBonus,
            double starBonus,
            int repeatCount,
            double penaltyMultiplier) {}
}
