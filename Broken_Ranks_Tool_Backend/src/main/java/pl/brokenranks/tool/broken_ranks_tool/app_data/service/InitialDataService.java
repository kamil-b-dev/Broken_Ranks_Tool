package pl.brokenranks.tool.broken_ranks_tool.app_data.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import pl.brokenranks.tool.broken_ranks_tool.app_data.dto.DictionariesDto;
import pl.brokenranks.tool.broken_ranks_tool.app_data.dto.GameRulesDto;
import pl.brokenranks.tool.broken_ranks_tool.app_data.dto.InitialDataDto;
import pl.brokenranks.tool.broken_ranks_tool.core.enums.DRIF_BONUS_TYPE;
import pl.brokenranks.tool.broken_ranks_tool.core.enums.DRIF_CATEGORY;
import pl.brokenranks.tool.broken_ranks_tool.core.enums.ITEM_CATEGORY;
import pl.brokenranks.tool.broken_ranks_tool.core.enums.ORB_BONUS_TYPE;
import pl.brokenranks.tool.broken_ranks_tool.core.enums.ORB_CATEGORY;
import pl.brokenranks.tool.broken_ranks_tool.equipment.dto.DrifTemplateDto;
import pl.brokenranks.tool.broken_ranks_tool.equipment.repository.DrifTemplateRepository;
import pl.brokenranks.tool.broken_ranks_tool.equipment.repository.ItemTemplateRepository;
import pl.brokenranks.tool.broken_ranks_tool.equipment.repository.OrbTemplateRepository;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.rules.EquipmentRulesRegistry;

import java.util.Arrays;
import java.util.Map;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@Service
@RequiredArgsConstructor
public class InitialDataService {

    private final ItemTemplateRepository itemRepository;
    private final OrbTemplateRepository orbRepository;
    private final DrifTemplateRepository drifRepository;
    private final EquipmentRulesRegistry rulesRegistry;

    public InitialDataDto getInitialData() {
        var items = itemRepository.findAll();
        var orbs = orbRepository.findAll();
        var drifs = drifRepository.findAll().stream().map(DrifTemplateDto::fromEntity).collect(Collectors.toList());

        var dictionaries = new DictionariesDto(
                getEnumMap(ITEM_CATEGORY.class, ITEM_CATEGORY::getDescription),
                getEnumMap(ORB_CATEGORY.class, ORB_CATEGORY::getDescription),
                getEnumMap(DRIF_CATEGORY.class, DRIF_CATEGORY::getDescription)
        );

        var bonusTranslations = Stream.of(
                        getEnumMap(DRIF_BONUS_TYPE.class, DRIF_BONUS_TYPE::getDescription),
                        getEnumMap(ORB_BONUS_TYPE.class, ORB_BONUS_TYPE::getDescription)
                )
                .flatMap(map -> map.entrySet().stream())
                .collect(Collectors.toMap(Map.Entry::getKey, Map.Entry::getValue, (v1, v2) -> v1));


        var gameRules = new GameRulesDto(
                EquipmentRulesRegistry.EPIC_BUILTIN_DRIFS,
                rulesRegistry.getSlotOrbRules(),
                bonusTranslations,
                Arrays.stream(DRIF_BONUS_TYPE.values()).collect(Collectors.toMap(Enum::name, DRIF_BONUS_TYPE::getBasePower))
        );

        return new InitialDataDto(items, orbs, drifs, gameRules, dictionaries);
    }

    private <T extends Enum<T>> Map<String, String> getEnumMap(Class<T> enumClass, java.util.function.Function<T, String> descriptionExtractor) {
        return Arrays.stream(enumClass.getEnumConstants())
                .collect(Collectors.toMap(Enum::name, descriptionExtractor));
    }
}
