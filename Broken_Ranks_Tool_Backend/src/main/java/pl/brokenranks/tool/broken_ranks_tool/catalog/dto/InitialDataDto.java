package pl.brokenranks.tool.broken_ranks_tool.catalog.dto;

import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Aggregates all data returned by the {@code /api/initial-data} endpoint. */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class InitialDataDto {
    /** All available item templates. */
    private List<ItemTemplateDto> items;

    /** All available orb templates. */
    private List<OrbTemplateDto> orbs;

    /** All available drif templates represented as DTOs. */
    private List<DrifTemplateDto> drifs;

    /** Game rules required by the frontend. */
    private GameRulesDto gameRules;

    /** Translation dictionaries required by the frontend. */
    private DictionariesDto dictionaries;
}
