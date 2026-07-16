package pl.brokenranks.tool.broken_ranks_tool.equipment.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.ItemTemplate;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.OrbTemplate;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class InitialDataDto {
    private List<ItemTemplate> items;
    private List<OrbTemplate> orbs;
    private List<DrifTemplateDto> drifs;
    private GameRulesDto gameRules;
    private DictionariesDto dictionaries;
}
