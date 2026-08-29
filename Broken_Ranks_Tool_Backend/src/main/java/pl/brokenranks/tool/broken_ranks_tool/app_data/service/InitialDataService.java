package pl.brokenranks.tool.broken_ranks_tool.app_data.service;

import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import pl.brokenranks.tool.broken_ranks_tool.app_data.dto.InitialDataDto;
import pl.brokenranks.tool.broken_ranks_tool.equipment.dto.DrifTemplateDto;
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
        var items = itemRepository.findAll();
        var orbs = orbRepository.findAll();
        var drifEntities = drifRepository.findAll();
        var drifs =
                drifEntities.stream().map(DrifTemplateDto::fromEntity).collect(Collectors.toList());

        return new InitialDataDto(
                items,
                orbs,
                drifs,
                gameRulesFactory.create(drifEntities),
                dictionariesFactory.create());
    }
}
