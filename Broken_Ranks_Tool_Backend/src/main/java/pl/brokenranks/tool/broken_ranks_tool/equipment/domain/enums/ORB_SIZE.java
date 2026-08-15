package pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums;

import lombok.AllArgsConstructor;
import lombok.Getter;

/** Defines orb sizes and their maximum upgrade levels. */
@Getter
@AllArgsConstructor
public enum ORB_SIZE {
    SUBORB(1),
    BIORB(3),
    MAGNIORB(3),
    ARCYORB(3);

    private final int maxLevel;
}
