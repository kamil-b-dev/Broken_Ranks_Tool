package pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums;

import java.util.Arrays;
import java.util.List;
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

    public static List<Integer> meaningfulLevels() {
        return Arrays.stream(values()).map(DRIF_SIZE::getMaxLevel).toList();
    }

    public static int levelForPowerMultiplier(int multiplier) {
        int index = Math.max(1, Math.min(values().length, multiplier)) - 1;
        return values()[index].maxLevel;
    }
}
