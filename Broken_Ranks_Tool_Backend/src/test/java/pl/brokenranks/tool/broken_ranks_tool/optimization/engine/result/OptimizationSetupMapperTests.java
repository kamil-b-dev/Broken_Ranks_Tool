package pl.brokenranks.tool.broken_ranks_tool.optimization.engine.result;

import static org.junit.jupiter.api.Assertions.*;
import static pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model.OptimizationEngineFixture.*;

import java.util.*;
import org.junit.jupiter.api.Test;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_BONUS_TYPE;
import pl.brokenranks.tool.broken_ranks_tool.equipment.dto.EquipmentRequest;
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.OptimizationRequest;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model.*;
import pl.brokenranks.tool.broken_ranks_tool.optimization.locking.OptimizationLockService;

class OptimizationSetupMapperTests {

    private final OptimizationSetupMapper mapper =
            new OptimizationSetupMapper(new OptimizationLockService());

    @Test
    void mapsOnlyAvailableSocketsAndCopiesCharacterStats() {
        var magic = drif(10, DRIF_BONUS_TYPE.DAMAGE_MAGIC);
        var critical = drif(20, DRIF_BONUS_TYPE.CRITICAL_CHANCE);
        SlotContext helmet = slot("helmet", 20, 2, 0, false, Set.of(), magic, critical);
        OptimizationRequest request = request(DRIF_BONUS_TYPE.DAMAGE_MAGIC);
        request.setOriginalSlots(Map.of("helmet", helmet.original()));
        request.setCharacterStats(new HashMap<>(Map.of("Moc", 80)));
        OptimizationContext context = context(request, helmet);
        BuildState state = new BuildState();
        put(
                state,
                "helmet",
                new Placement(magic, 6, false),
                null,
                new Placement(critical, 11, false));

        EquipmentRequest setup = mapper.toSetup(state, context);

        assertEquals(List.of(10L), setup.getSlots().get("helmet").getDrifIds());
        assertEquals(Map.of("0", 6), setup.getSlots().get("helmet").getDrifLevels());
        assertEquals(Map.of("Moc", 80), setup.getCharacterStats());
        assertNotSame(request.getCharacterStats(), setup.getCharacterStats());
        setup.getCharacterStats().put("Moc", 1);
        assertEquals(80, request.getCharacterStats().get("Moc"));
    }

    @Test
    void preservesSpecialAndLockedSlotsFromTheOriginalRequest() {
        var magic = drif(10, DRIF_BONUS_TYPE.DAMAGE_MAGIC);
        SlotContext locked = slot("helmet", 20, 1, 0, false, Set.of(), magic);
        SlotContext special = slot("weapon", 0, 2, 0, true, Set.of(), magic);
        locked.original().setDrifIds(List.of(10L));
        locked.original().setDrifLevels(Map.of("0", 6));
        special.original().setDrifIds(List.of(10L, 10L));
        special.original().setDrifLevels(Map.of("0", 11, "1", 16));
        OptimizationRequest request = request(DRIF_BONUS_TYPE.DAMAGE_MAGIC);
        request.setOriginalSlots(Map.of("helmet", locked.original(), "weapon", special.original()));
        request.setLockedSlots(Set.of("helmet"));
        OptimizationContext context = context(request, locked, special);
        BuildState state = new BuildState();
        put(state, "helmet", new Placement(magic, 1, false));
        put(state, "weapon");

        EquipmentRequest setup = mapper.toSetup(state, context);

        assertEquals(List.of(10L), setup.getSlots().get("helmet").getDrifIds());
        assertEquals(6, setup.getSlots().get("helmet").getDrifLevels().get("0"));
        assertEquals(List.of(10L, 10L), setup.getSlots().get("weapon").getDrifIds());
        assertNull(setup.getCharacterStats());
        assertNotSame(locked.original(), setup.getSlots().get("helmet"));
        assertNotSame(special.original(), setup.getSlots().get("weapon"));
    }

    @Test
    void removesMalformedAndOutOfRangeLevelsWhenEnforcingSocketLimit() {
        var magic = drif(10, DRIF_BONUS_TYPE.DAMAGE_MAGIC);
        SlotContext helmet = slot("helmet", 20, 1, 0, false, Set.of(), magic);
        helmet.original().setDrifIds(new ArrayList<>(List.of(10L, 10L, 10L)));
        helmet.original().setDrifLevels(new HashMap<>(Map.of("0", 6, "1", 11, "invalid", 16)));
        OptimizationRequest request = request(DRIF_BONUS_TYPE.DAMAGE_MAGIC);
        request.setOriginalSlots(Map.of("helmet", helmet.original()));
        request.setLockedSlots(Set.of("helmet"));
        OptimizationContext context = context(request, helmet);

        EquipmentRequest setup = mapper.toSetup(new BuildState(), context);

        assertEquals(List.of(10L), setup.getSlots().get("helmet").getDrifIds());
        assertEquals(Map.of("0", 6), setup.getSlots().get("helmet").getDrifLevels());
    }
}
