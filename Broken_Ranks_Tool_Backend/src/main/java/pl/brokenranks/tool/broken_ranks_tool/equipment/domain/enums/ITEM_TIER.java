package pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums;

import java.util.Locale;
import java.util.Optional;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

/** Defines supported item tiers and their numeric rank. */
@Getter
@RequiredArgsConstructor
public enum ITEM_TIER {
    I(1),
    II(2),
    III(3),
    IV(4),
    V(5),
    VI(6),
    VII(7),
    VIII(8),
    IX(9),
    X(10),
    XI(11),
    XII(12);

    private final int level;

    public static Optional<ITEM_TIER> fromCode(String code) {
        if (code == null || code.isBlank()) return Optional.empty();
        try {
            return Optional.of(valueOf(code.trim().toUpperCase(Locale.ROOT)));
        } catch (IllegalArgumentException exception) {
            return Optional.empty();
        }
    }

    public static int levelOf(String code) {
        return fromCode(code).map(ITEM_TIER::getLevel).orElse(0);
    }
}
