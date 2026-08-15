package pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

import java.util.Arrays;
import java.util.Map;
import java.util.Optional;
import java.util.function.Function;
import java.util.stream.Collectors;

/** Defines valid base and primary statistic types for validation and normalization. */
@Getter
@RequiredArgsConstructor
public enum STAT_TYPE {
    STRENGTH("Siła"),
    DEXTERITY("Zręczność"),
    POWER("Moc"),
    KNOWLEDGE("Wiedza"),
    HEALTH("PŻ"),
    MANA("Mana"),
    STAMINA("Kondycja"),
    DAMAGE("Obrażenia");

    private final String description;

    private static final Map<String, STAT_TYPE> LOOKUP_MAP = Arrays.stream(values())
            .collect(Collectors.toMap(
                    s -> s.getDescription().toLowerCase(),
                    Function.identity()
            ));

    /**
     * Resolves a statistic type case-insensitively from its localized description.
     * @param description Localized statistic description.
     * @return Matching statistic type, or empty when the description is unknown.
     */
    public static Optional<STAT_TYPE> fromDescription(String description) {
        if (description == null) {
            return Optional.empty();
        }
        return Optional.ofNullable(LOOKUP_MAP.get(description.toLowerCase()));
    }

    /**
     * Returns whether the description identifies a valid statistic type.
     * @param description Localized statistic description.
     * @return Whether the description is supported.
     */
    public static boolean isValid(String description) {
        return fromDescription(description).isPresent();
    }
}
