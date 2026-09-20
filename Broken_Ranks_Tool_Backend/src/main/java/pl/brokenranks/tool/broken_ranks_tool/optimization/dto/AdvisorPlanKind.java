package pl.brokenranks.tool.broken_ranks_tool.optimization.dto;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

/** Groups advisor plans by the number of paid upgrades or purchases they require. */
@Getter
@RequiredArgsConstructor
public enum AdvisorPlanKind {
    MOVES("Same przełożenia"),
    ONE_UPGRADE("Jedno ulepszenie lub zakup"),
    PLAN("Plan kilku zmian");

    private final String label;

    public static AdvisorPlanKind fromUpgradeCount(int upgrades) {
        if (upgrades <= 0) return MOVES;
        if (upgrades == 1) return ONE_UPGRADE;
        return PLAN;
    }
}
