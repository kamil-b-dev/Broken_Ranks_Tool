package pl.brokenranks.tool.broken_ranks_tool.entity.enums;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public enum ITEM_STAR {
    BRONZE_1(1, 0.00, 0.00, 0.00),
    BRONZE_2(2, 0.03, 0.00, 0.00),
    BRONZE_3(3, 0.06, 0.00, 0.00),
    SILVER_1(4, 0.10, 0.05, 0.00),
    SILVER_2(5, 0.15, 0.10, 0.00),
    SILVER_3(6, 0.20, 0.20, 0.00),
    GOLD_1(7, 0.25, 0.30, 0.03),
    GOLD_2(8, 0.35, 0.50, 0.08),
    GOLD_3(9, 0.50, 0.75, 0.15);

    private final int level;
    private final double statsMod;
    private final double orbMod;
    private final double drifMod;

    public static ITEM_STAR fromLevel(int level) {
        for (ITEM_STAR star : values()) {
            if (star.level == level) {
                return star;
            }
        }
        return BRONZE_1;
    }
}