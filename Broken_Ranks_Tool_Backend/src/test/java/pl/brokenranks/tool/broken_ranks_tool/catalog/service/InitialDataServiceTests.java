package pl.brokenranks.tool.broken_ranks_tool.catalog.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import pl.brokenranks.tool.broken_ranks_tool.catalog.dto.DictionariesDto;
import pl.brokenranks.tool.broken_ranks_tool.catalog.dto.GameRulesDto;
import pl.brokenranks.tool.broken_ranks_tool.catalog.dto.InitialDataDto;
import pl.brokenranks.tool.broken_ranks_tool.catalog.dto.ItemTemplateDto;
import pl.brokenranks.tool.broken_ranks_tool.catalog.dto.OrbTemplateDto;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_BONUS_TYPE;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_CATEGORY;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_SIZE;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.DrifTemplate;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.ItemTemplate;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.OrbTemplate;
import pl.brokenranks.tool.broken_ranks_tool.equipment.persistence.repository.DrifTemplateRepository;
import pl.brokenranks.tool.broken_ranks_tool.equipment.persistence.repository.ItemTemplateRepository;
import pl.brokenranks.tool.broken_ranks_tool.equipment.persistence.repository.OrbTemplateRepository;

@ExtendWith(MockitoExtension.class)
class InitialDataServiceTests {

    @Mock private ItemTemplateRepository itemRepository;
    @Mock private OrbTemplateRepository orbRepository;
    @Mock private DrifTemplateRepository drifRepository;
    @Mock private DictionariesFactory dictionariesFactory;
    @Mock private GameRulesFactory gameRulesFactory;

    @Test
    void aggregatesCatalogsRulesAndDictionariesWithoutLeakingDrifEntities() {
        ItemTemplate item = ItemTemplate.builder().id(1L).name("Allenor").build();
        OrbTemplate orb = OrbTemplate.builder().id(2L).name("Orb").build();
        DrifTemplate drif =
                DrifTemplate.builder()
                        .id(3L)
                        .name("Drif ognia")
                        .baseValue("3")
                        .increment("1")
                        .size(DRIF_SIZE.SUBDRIF)
                        .bonusType(DRIF_BONUS_TYPE.DAMAGE_FIRE)
                        .rankRange("1-10")
                        .price(42)
                        .category(DRIF_CATEGORY.OFFENSIVE)
                        .build();
        GameRulesDto gameRules = new GameRulesDto();
        DictionariesDto dictionaries = new DictionariesDto();
        when(itemRepository.findAll()).thenReturn(List.of(item));
        when(orbRepository.findAll()).thenReturn(List.of(orb));
        when(drifRepository.findAll()).thenReturn(List.of(drif));
        when(gameRulesFactory.create(List.of(drif))).thenReturn(gameRules);
        when(dictionariesFactory.create()).thenReturn(dictionaries);

        InitialDataDto result = service().getInitialData();

        assertThat(result.getItems()).containsExactly(ItemTemplateDto.fromEntity(item));
        assertThat(result.getOrbs()).containsExactly(OrbTemplateDto.fromEntity(orb));
        assertThat(result.getDrifs())
                .singleElement()
                .satisfies(
                        dto -> {
                            assertThat(dto.getId()).isEqualTo(3L);
                            assertThat(dto.getName()).isEqualTo("Drif ognia");
                            assertThat(dto.getBaseValue()).isEqualTo("3");
                            assertThat(dto.getIncrement()).isEqualTo("1");
                            assertThat(dto.getSize()).isEqualTo(DRIF_SIZE.SUBDRIF);
                            assertThat(dto.getBonusType()).isEqualTo(DRIF_BONUS_TYPE.DAMAGE_FIRE);
                            assertThat(dto.getRankRange()).isEqualTo("1-10");
                            assertThat(dto.getPrice()).isEqualTo(42);
                            assertThat(dto.getCategory()).isEqualTo(DRIF_CATEGORY.OFFENSIVE);
                        });
        assertThat(result.getGameRules()).isSameAs(gameRules);
        assertThat(result.getDictionaries()).isSameAs(dictionaries);
        verify(gameRulesFactory).create(List.of(drif));
        verify(dictionariesFactory).create();
    }

    private InitialDataService service() {
        return new InitialDataService(
                itemRepository,
                orbRepository,
                drifRepository,
                dictionariesFactory,
                gameRulesFactory);
    }
}
