package pl.brokenranks.tool.broken_ranks_tool.app_data.dto;

import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import pl.brokenranks.tool.broken_ranks_tool.equipment.dto.DrifTemplateDto;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.ItemTemplate;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.OrbTemplate;

/** Aggregates all data returned by the {@code /api/initial-data} endpoint. */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class InitialDataDto {
    /** All available item templates. */
    private List<ItemTemplate> items;

    /** All available orb templates. */
    private List<OrbTemplate> orbs;

    /** All available drif templates represented as DTOs. */
    private List<DrifTemplateDto> drifs;

    /** Game rules required by the frontend. */
    private GameRulesDto gameRules;

    /** Translation dictionaries required by the frontend. */
    private DictionariesDto dictionaries;
}
