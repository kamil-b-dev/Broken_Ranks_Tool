package pl.brokenranks.tool.broken_ranks_tool.core.enums;

import lombok.AllArgsConstructor;
import lombok.Getter;

@AllArgsConstructor
@Getter
public enum ORB_CATEGORY {
    OFENSIVE("Ofensywne"),
    DEFENSIVE("Defensywne"),
    UTILITY("Użytkowe");

    private final String description;
}
