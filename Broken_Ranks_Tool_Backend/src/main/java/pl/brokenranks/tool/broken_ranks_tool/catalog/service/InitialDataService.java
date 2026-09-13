package pl.brokenranks.tool.broken_ranks_tool.catalog.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import pl.brokenranks.tool.broken_ranks_tool.catalog.dto.DrifTemplateDto;
import pl.brokenranks.tool.broken_ranks_tool.catalog.dto.InitialDataDto;
import pl.brokenranks.tool.broken_ranks_tool.catalog.dto.ItemTemplateDto;
import pl.brokenranks.tool.broken_ranks_tool.catalog.dto.OrbTemplateDto;
import pl.brokenranks.tool.broken_ranks_tool.equipment.persistence.repository.DrifTemplateRepository;
import pl.brokenranks.tool.broken_ranks_tool.equipment.persistence.repository.ItemTemplateRepository;
import pl.brokenranks.tool.broken_ranks_tool.equipment.persistence.repository.OrbTemplateRepository;

/** Aggregates and provides the data required to initialize the frontend. */
@Service
@RequiredArgsConstructor
public class InitialDataService {

    private final ItemTemplateRepository itemRepository;
    private final OrbTemplateRepository orbRepository;
    private final DrifTemplateRepository drifRepository;
    private final DictionariesFactory dictionariesFactory;
    private final GameRulesFactory gameRulesFactory;

    /**
     * Collects data from repositories and rule registries into one startup DTO.
     * @return Complete data required to initialize the frontend.
     */
    public InitialDataDto getInitialData() {
        var items = itemRepository.findAll().stream().map(ItemTemplateDto::fromEntity).toList();
        var orbs = orbRepository.findAll().stream().map(OrbTemplateDto::fromEntity).toList();
        var drifEntities = drifRepository.findAll();
        var drifs = drifEntities.stream().map(DrifTemplateDto::fromEntity).toList();

        return new InitialDataDto(
                items,
                orbs,
                drifs,
                gameRulesFactory.create(drifEntities),
                dictionariesFactory.create());
    }
}
