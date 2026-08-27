package pl.brokenranks.tool.broken_ranks_tool.optimization.constraints;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotSame;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.junit.jupiter.api.Test;
import pl.brokenranks.tool.broken_ranks_tool.equipment.dto.EquipmentRequest;
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.OptimizationRequest;

class OptimizationLockServiceTests {

    private final OptimizationLockService lockService = new OptimizationLockService();

    @Test
    void preservesCompleteLockedSlot() {
        EquipmentRequest.SlotData originalSlot = slot(1L, List.of(10L), Map.of("0", 21));
        EquipmentRequest.SlotData candidateSlot = slot(2L, List.of(20L), Map.of("0", 1));

        Map<String, EquipmentRequest.SlotData> original = Map.of("helmet", originalSlot);
        Map<String, EquipmentRequest.SlotData> candidate = Map.of("helmet", candidateSlot);

        OptimizationRequest request = new OptimizationRequest();
        request.setLockedSlots(Set.of("helmet"));

        Map<String, EquipmentRequest.SlotData> result =
                lockService.enforce(original, candidate, request);

        assertEquals(originalSlot.getItemId(), result.get("helmet").getItemId());
        assertEquals(originalSlot.getDrifIds(), result.get("helmet").getDrifIds());
        assertEquals(originalSlot.getDrifLevels(), result.get("helmet").getDrifLevels());
        assertNotSame(originalSlot, result.get("helmet"));
        assertTrue(lockService.isValid(original, result, request));
    }

    @Test
    void preservesLockedDrifIndexAndLevel() {
        EquipmentRequest.SlotData originalSlot =
                slot(1L, List.of(10L, 20L), Map.of("0", 6, "1", 11));
        EquipmentRequest.SlotData candidateSlot =
                slot(1L, List.of(30L, 40L), Map.of("0", 21, "1", 21));

        Map<String, EquipmentRequest.SlotData> original = Map.of("helmet", originalSlot);
        Map<String, EquipmentRequest.SlotData> candidate = Map.of("helmet", candidateSlot);

        OptimizationRequest request = new OptimizationRequest();
        request.setLockedDrifs(Map.of("helmet", Set.of(0)));

        Map<String, EquipmentRequest.SlotData> result =
                lockService.enforce(original, candidate, request);
        EquipmentRequest.SlotData resultSlot = result.get("helmet");

        assertEquals(List.of(10L, 40L), resultSlot.getDrifIds());
        assertEquals(6, resultSlot.getDrifLevels().get("0"));
        assertEquals(21, resultSlot.getDrifLevels().get("1"));
        assertTrue(lockService.isValid(original, result, request));
    }

    private EquipmentRequest.SlotData slot(
            Long itemId, List<Long> drifIds, Map<String, Integer> drifLevels) {
        EquipmentRequest.SlotData slot = new EquipmentRequest.SlotData();
        slot.setItemId(itemId);
        slot.setItemStars(8);
        slot.setDrifIds(drifIds);
        slot.setDrifLevels(new HashMap<>(drifLevels));
        return slot;
    }
}
