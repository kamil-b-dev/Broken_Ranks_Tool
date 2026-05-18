package pl.brokenranks.tool.broken_ranks_tool.entity.enums;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public enum DRIF_SIZE {
    SUBDRIF(6),
    BIDRIF(11),
    MAGNIDRIF(16),
    ARCYDRIF(21);

    private final int maxLevel;
}