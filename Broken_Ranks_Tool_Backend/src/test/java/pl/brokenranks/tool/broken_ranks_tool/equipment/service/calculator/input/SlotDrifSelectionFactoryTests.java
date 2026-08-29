package pl.brokenranks.tool.broken_ranks_tool.equipment.service.calculator.input;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import pl.brokenranks.tool.broken_ranks_tool.equipment.dto.EquipmentRequest;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.DrifTemplate;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.calculator.input.EquipmentDataProvider.CalculationContext;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.calculator.input.SlotDrifSelectionFactory.SlotDrifSelection;

class SlotDrifSelectionFactoryTests {
    private final SlotDrifSelectionFactory factory = new SlotDrifSelectionFactory();

    @Test
    void resolvesKnownDrifsAndKeepsLevelsAlignedAfterUnknownIdentifiers() {
        DrifTemplate first = DrifTemplate.builder().id(1L).name("First").build();
        DrifTemplate second = DrifTemplate.builder().id(2L).name("Second").build();
        EquipmentRequest.SlotData slot = new EquipmentRequest.SlotData();
        slot.setDrifIds(List.of(1L, 99L, 2L));
        slot.setDrifLevels(Map.of("0", 6, "1", 16, "2", 11));
        CalculationContext context =
                new CalculationContext(Map.of(), Map.of(), Map.of(1L, first, 2L, second));

        SlotDrifSelection selection = factory.create(slot, context);

        assertEquals(List.of(first, second), selection.drifs());
        assertEquals(List.of(6, 11), selection.levels());
    }

    @Test
    void usesDefaultLevelAndHandlesMissingDrifList() {
        DrifTemplate drif = DrifTemplate.builder().id(1L).name("Drif").build();
        EquipmentRequest.SlotData slot = new EquipmentRequest.SlotData();
        slot.setDrifIds(List.of(1L));
        CalculationContext context = new CalculationContext(Map.of(), Map.of(), Map.of(1L, drif));

        assertEquals(List.of(1), factory.create(slot, context).levels());

        slot.setDrifIds(null);
        SlotDrifSelection empty = factory.create(slot, context);
        assertTrue(empty.drifs().isEmpty());
        assertTrue(empty.levels().isEmpty());
    }
}
