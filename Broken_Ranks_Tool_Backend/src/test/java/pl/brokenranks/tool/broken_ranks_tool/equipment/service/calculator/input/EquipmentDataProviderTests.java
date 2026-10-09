package pl.brokenranks.tool.broken_ranks_tool.equipment.service.calculator.input;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import pl.brokenranks.tool.broken_ranks_tool.equipment.dto.EquipmentRequest;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.DrifTemplate;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.ItemTemplate;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.OrbTemplate;
import pl.brokenranks.tool.broken_ranks_tool.equipment.persistence.repository.DrifTemplateRepository;
import pl.brokenranks.tool.broken_ranks_tool.equipment.persistence.repository.ItemTemplateRepository;
import pl.brokenranks.tool.broken_ranks_tool.equipment.persistence.repository.OrbTemplateRepository;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.calculator.input.EquipmentDataProvider.CalculationContext;

class EquipmentDataProviderTests {

    @Test
    void calculationContextOwnsReadOnlyMapsAndSharesRunScopedTemplates() {
        ItemTemplate item = ItemTemplate.builder().id(1L).build();
        OrbTemplate orb = OrbTemplate.builder().id(2L).build();
        DrifTemplate drif = DrifTemplate.builder().id(3L).build();
        var items = new LinkedHashMap<>(Map.of(1L, item));
        var orbs = new LinkedHashMap<>(Map.of(2L, orb));
        var drifs = new LinkedHashMap<>(Map.of(3L, drif));
        CalculationContext context = new CalculationContext(items, orbs, drifs);
        items.clear();
        orbs.clear();
        drifs.clear();

        assertSame(item, context.items().get(1L));
        assertSame(orb, context.orbs().get(2L));
        assertSame(drif, context.drifs().get(3L));
        assertThrows(UnsupportedOperationException.class, () -> context.items().clear());
        assertThrows(UnsupportedOperationException.class, () -> context.orbs().put(4L, orb));
        assertThrows(UnsupportedOperationException.class, () -> context.drifs().remove(3L));
    }

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
