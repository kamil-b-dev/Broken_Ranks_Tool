package pl.brokenranks.tool.broken_ranks_tool.equipment.service.provider;

import static org.junit.jupiter.api.Assertions.assertSame;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import org.junit.jupiter.api.Test;
import pl.brokenranks.tool.broken_ranks_tool.equipment.dto.EquipmentRequest;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.DrifTemplate;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.ItemTemplate;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.OrbTemplate;
import pl.brokenranks.tool.broken_ranks_tool.equipment.persistence.repository.DrifTemplateRepository;
import pl.brokenranks.tool.broken_ranks_tool.equipment.persistence.repository.ItemTemplateRepository;
import pl.brokenranks.tool.broken_ranks_tool.equipment.persistence.repository.OrbTemplateRepository;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.provider.EquipmentDataProvider.CalculationContext;

class EquipmentDataProviderTests {

    @Test
    void loadsDistinctRequestedTemplatesInThreeBatches() {
        ItemTemplateRepository items = mock(ItemTemplateRepository.class);
        OrbTemplateRepository orbs = mock(OrbTemplateRepository.class);
        DrifTemplateRepository drifs = mock(DrifTemplateRepository.class);
        ItemTemplate item = ItemTemplate.builder().id(1L).name("Item").build();
        OrbTemplate orb = OrbTemplate.builder().id(2L).name("Orb").build();
        DrifTemplate drif = DrifTemplate.builder().id(3L).name("Drif").build();
        when(items.findAllById(List.of(1L))).thenReturn(List.of(item));
        when(orbs.findAllById(List.of(2L))).thenReturn(List.of(orb));
        when(drifs.findAllById(List.of(3L))).thenReturn(List.of(drif));
        EquipmentRequest.SlotData first = slot(1L, List.of(2L), List.of(3L));
        EquipmentRequest.SlotData duplicate = slot(1L, List.of(2L), List.of(3L));

        CalculationContext context =
                new EquipmentDataProvider(items, orbs, drifs)
                        .buildContext(List.of(first, duplicate));

        assertSame(item, context.items().get(1L));
        assertSame(orb, context.orbs().get(2L));
        assertSame(drif, context.drifs().get(3L));
        verify(items).findAllById(List.of(1L));
        verify(orbs).findAllById(List.of(2L));
        verify(drifs).findAllById(List.of(3L));
    }

    private EquipmentRequest.SlotData slot(Long itemId, List<Long> orbIds, List<Long> drifIds) {
        EquipmentRequest.SlotData slot = new EquipmentRequest.SlotData();
        slot.setItemId(itemId);
        slot.setOrbIds(orbIds);
        slot.setDrifIds(drifIds);
        return slot;
    }
}
