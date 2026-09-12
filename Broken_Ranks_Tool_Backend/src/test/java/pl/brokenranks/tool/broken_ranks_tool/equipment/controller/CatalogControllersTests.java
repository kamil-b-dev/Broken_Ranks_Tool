package pl.brokenranks.tool.broken_ranks_tool.equipment.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_BONUS_TYPE;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_CATEGORY;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.ITEM_CATEGORY;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.ORB_BONUS_TYPE;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.rules.EquipmentRulesRegistry;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.DrifTemplate;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.ItemTemplate;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.OrbTemplate;
import pl.brokenranks.tool.broken_ranks_tool.equipment.persistence.repository.DrifTemplateRepository;
import pl.brokenranks.tool.broken_ranks_tool.equipment.persistence.repository.ItemTemplateRepository;
import pl.brokenranks.tool.broken_ranks_tool.equipment.persistence.repository.OrbTemplateRepository;

@ExtendWith(MockitoExtension.class)
class CatalogControllersTests {

    @Mock private ItemTemplateRepository itemRepository;
    @Mock private OrbTemplateRepository orbRepository;
    @Mock private DrifTemplateRepository drifRepository;

    @Test
    void returnsAllItemsAndFiltersThemByCategory() {
        ItemTemplate helmet =
                ItemTemplate.builder().id(1L).name("Hełm").category(ITEM_CATEGORY.HELMET).build();
        when(itemRepository.findAll()).thenReturn(List.of(helmet));
        when(itemRepository.findByCategory(ITEM_CATEGORY.HELMET)).thenReturn(List.of(helmet));
        ItemTemplatesController controller = new ItemTemplatesController(itemRepository);

        assertThat(controller.getAllItems().getBody()).containsExactly(helmet);
        assertThat(controller.getItemsByCategory(ITEM_CATEGORY.HELMET).getBody())
                .containsExactly(helmet);
    }

    @Test
    void returnsNotFoundForAnEmptyItemCategory() {
        when(itemRepository.findByCategory(ITEM_CATEGORY.BELT)).thenReturn(List.of());

        assertThat(
                        new ItemTemplatesController(itemRepository)
                                .getItemsByCategory(ITEM_CATEGORY.BELT)
                                .getStatusCode())
                .isEqualTo(HttpStatus.NOT_FOUND);
    }

    @Test
    void mapsPersistedDrifsToApiDtos() {
        DrifTemplate drif =
                DrifTemplate.builder()
                        .id(7L)
                        .name("Drif")
                        .bonusType(DRIF_BONUS_TYPE.DAMAGE_FIRE)
                        .category(DRIF_CATEGORY.OFFENSIVE)
                        .build();
        when(drifRepository.findAll()).thenReturn(List.of(drif));

        var response = new DrifTemplatesController(drifRepository).getAllDrifs();

        assertThat(response.getBody())
                .singleElement()
                .satisfies(
                        dto -> {
                            assertThat(dto.getId()).isEqualTo(7L);
                            assertThat(dto.getName()).isEqualTo("Drif");
                            assertThat(dto.getBonusType()).isEqualTo(DRIF_BONUS_TYPE.DAMAGE_FIRE);
                        });
    }

    @Test
    void returnsAllOrbs() {
        OrbTemplate orb = OrbTemplate.builder().id(4L).name("Orb").build();
        when(orbRepository.findAll()).thenReturn(List.of(orb));

        assertThat(new OrbTemplatesController(orbRepository).getAllOrbs().getBody())
                .containsExactly(orb);
    }

    @Test
    void exposesCompleteLegacyRulesContract() {
        EquipmentRulesRegistry registry = new EquipmentRulesRegistry();

        Map<String, Object> response = new RulesController(registry).getGameRules().getBody();

        assertThat(response)
                .containsKeys(
                        "bonusTranslations",
                        "drifBasePowers",
                        "slotOrbRules",
                        "elementalTypes",
                        "epicBuiltInDrifs");
        assertThat((Map<?, ?>) response.get("bonusTranslations"))
                .hasSize(DRIF_BONUS_TYPE.values().length + ORB_BONUS_TYPE.values().length);
        assertThat(response.get("slotOrbRules")).isEqualTo(registry.getSlotOrbRules());
        assertThat(response.get("elementalTypes")).isEqualTo(registry.getElementalDamageTypes());
        assertThat(response.get("epicBuiltInDrifs"))
                .isEqualTo(EquipmentRulesRegistry.EPIC_BUILTIN_DRIFS);
    }
}
