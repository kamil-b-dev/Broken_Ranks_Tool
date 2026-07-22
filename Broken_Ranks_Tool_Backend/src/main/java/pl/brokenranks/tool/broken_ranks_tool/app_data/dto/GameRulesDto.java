package pl.brokenranks.tool.broken_ranks_tool.app_data.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import pl.brokenranks.tool.broken_ranks_tool.core.enums.ORB_CATEGORY;

import java.util.List;
import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class GameRulesDto {
    private Map<String, List<String>> epicBuiltInDrifs;
    private Map<String, List<ORB_CATEGORY>> slotOrbRules;
    private Map<String, String> bonusTranslations;
    private Map<String, Integer> drifBasePowers;
}
