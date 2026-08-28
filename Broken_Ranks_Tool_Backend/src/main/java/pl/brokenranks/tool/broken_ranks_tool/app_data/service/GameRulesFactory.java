package pl.brokenranks.tool.broken_ranks_tool.app_data.service;

import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import java.util.stream.IntStream;
import java.util.stream.Stream;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import pl.brokenranks.tool.broken_ranks_tool.app_data.dto.GameRulesDto;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_BONUS_TYPE;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.ORB_BONUS_TYPE;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.rules.EquipmentRulesRegistry;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.DrifTemplate;

/** Creates the frontend representation of equipment and modifier rules. */
@Component
@RequiredArgsConstructor
public class GameRulesFactory {
    private final EquipmentRulesRegistry rulesRegistry;

    public GameRulesDto create(List<DrifTemplate> drifs) {
        Map<String, Integer> maxCaps = new HashMap<>();
        for (DRIF_BONUS_TYPE type : DRIF_BONUS_TYPE.values())
            maxCaps.put(type.name(), type.getMaxCap());
        return new GameRulesDto(
                EquipmentRulesRegistry.EPIC_BUILTIN_DRIFS,
                rulesRegistry.getSlotOrbRules(),
                bonusTranslations(),
                Arrays.stream(DRIF_BONUS_TYPE.values())
                        .collect(Collectors.toMap(Enum::name, DRIF_BONUS_TYPE::getBasePower)),
                maxCaps,
                drifs.stream()
                        .filter(drif -> drif.getBonusType() != null && drif.getCategory() != null)
                        .collect(
                                Collectors.toMap(
                                        drif -> drif.getBonusType().name(),
                                        drif -> drif.getCategory().name(),
                                        (first, ignored) -> first)),
                IntStream.rangeClosed(1, 12)
                        .boxed()
                        .collect(Collectors.toMap(count -> count, rulesRegistry::getDrifPenalty)));
    }

    private Map<String, String> bonusTranslations() {
        return Stream.concat(
                        Arrays.stream(DRIF_BONUS_TYPE.values())
                                .map(type -> Map.entry(type.name(), type.getDescription())),
                        Arrays.stream(ORB_BONUS_TYPE.values())
                                .map(type -> Map.entry(type.name(), type.getDescription())))
                .collect(
                        Collectors.toMap(
                                Map.Entry::getKey, Map.Entry::getValue, (first, ignored) -> first));
    }
}
