package pl.brokenranks.tool.broken_ranks_tool.equipment.service.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.DrifTemplate;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.ItemTemplate;
import pl.brokenranks.tool.broken_ranks_tool.equipment.persistence.repository.DrifTemplateRepository;
import pl.brokenranks.tool.broken_ranks_tool.equipment.persistence.repository.ItemTemplateRepository;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.validator.EquipmentPlacementRules;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.validator.UpgradeLevelPolicy;

@ExtendWith(MockitoExtension.class)
class EquipmentFacadeImplTests {

    @Mock private ItemTemplateRepository itemRepository;
    @Mock private DrifTemplateRepository drifRepository;
    @Mock private EquipmentPlacementRules placementRules;
    @Mock private UpgradeLevelPolicy levelPolicy;

    @Test
    void loadsTemplatesAndIndexesItemsByIdentifier() {
        ItemTemplate first = ItemTemplate.builder().id(1L).name("A").build();
        ItemTemplate second = ItemTemplate.builder().id(2L).name("B").build();
        DrifTemplate drif = DrifTemplate.builder().id(3L).build();
        when(itemRepository.findAllById(List.of(1L, 2L))).thenReturn(List.of(first, second));
        when(drifRepository.findAll()).thenReturn(List.of(drif));

        EquipmentFacadeImpl facade = facade();

        assertThat(facade.getItemTemplates(List.of(1L, 2L)))
                .containsExactlyInAnyOrderEntriesOf(java.util.Map.of(1L, first, 2L, second));
        assertThat(facade.getAllDrifs()).containsExactly(drif);
    }

    @Test
    void delegatesCapacityAndPlacementRulesToTheirDomainPolicies() {
        ItemTemplate item = ItemTemplate.builder().id(1L).build();
        DrifTemplate drif = DrifTemplate.builder().id(2L).build();
        when(levelPolicy.calculateItemCapacity(item, 8)).thenReturn(12);
        when(placementRules.isValidDrifSizeForTier(drif, item)).thenReturn(true);
        when(placementRules.isElementalDrifPositionValid(drif, "weapon")).thenReturn(false);

        EquipmentFacadeImpl facade = facade();

        assertThat(facade.calculateItemCapacity(item, 8)).isEqualTo(12);
        assertThat(facade.isValidDrifSizeForTier(drif, item)).isTrue();
        assertThat(facade.isElementalDrifPositionValid(drif, "weapon")).isFalse();
        verify(levelPolicy).calculateItemCapacity(item, 8);
        verify(placementRules).isValidDrifSizeForTier(drif, item);
        verify(placementRules).isElementalDrifPositionValid(drif, "weapon");
    }

    private EquipmentFacadeImpl facade() {
        return new EquipmentFacadeImpl(itemRepository, drifRepository, placementRules, levelPolicy);
    }
}
