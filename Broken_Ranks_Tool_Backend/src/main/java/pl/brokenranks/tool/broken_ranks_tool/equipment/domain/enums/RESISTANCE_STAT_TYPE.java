package pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums;

import java.util.Arrays;
import java.util.Map;
import java.util.Optional;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.AllArgsConstructor;
import lombok.Getter;

/** Defines all resistance and armor statistics. */
@Getter
@AllArgsConstructor
public enum RESISTANCE_STAT_TYPE {
    ARMOR_SLASH("Pancerz sieczne"),
    ARMOR_PIERCE("Pancerz kłute"),
    ARMOR_BLUNT("Pancerz obuchowe"),

    RESISTANCE_ENERGY("Odporność energia"),
    RESISTANCE_FIRE("Odporność ogień"),
    RESISTANCE_COLD("Odporność zimno"),
    RESISTANCE_MENTAL("Odporność uroki");

    private final String description;

    private static final Map<String, RESISTANCE_STAT_TYPE> LOOKUP_MAP =
            Arrays.stream(values())
                    .collect(
                            Collectors.toMap(
                                    s -> s.getDescription().toLowerCase(), Function.identity()));

    /**
     * Resolves a resistance type case-insensitively from its localized description.
     * @param description Localized resistance description.
     * @return Matching resistance type, or empty when the description is unknown.
     */
    public static Optional<RESISTANCE_STAT_TYPE> fromDescription(String description) {
        if (description == null) {
            return Optional.empty();
        }
        return Optional.ofNullable(LOOKUP_MAP.get(description.toLowerCase()));
    }
}
