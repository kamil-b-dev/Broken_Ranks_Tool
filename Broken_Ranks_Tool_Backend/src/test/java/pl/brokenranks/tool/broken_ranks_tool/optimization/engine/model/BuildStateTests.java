package pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model;

import static org.junit.jupiter.api.Assertions.*;
import static pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model.OptimizationEngineFixture.drif;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import org.junit.jupiter.api.Test;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_BONUS_TYPE;

class BuildStateTests {
    private final Placement first =
            new Placement(drif(1, DRIF_BONUS_TYPE.CRITICAL_CHANCE), 1, false);
    private final Placement second = new Placement(drif(2, DRIF_BONUS_TYPE.DAMAGE_MAGIC), 6, false);

    @Test
    void detachesInputAndBlocksMapListAndEntryMutations() {
        BuildState state = new BuildState();
        List<Placement> supplied = new ArrayList<>(Arrays.asList(first, null));
        state.putSlot("helmet", supplied);
        String signature = state.signature();
        supplied.set(0, second);
        supplied.clear();

        assertEquals(signature, state.signature());
        assertEquals(Arrays.asList(first, null), state.slots().get("helmet"));
        assertThrows(
                UnsupportedOperationException.class, () -> state.slots().put("boots", List.of()));
        assertThrows(
                UnsupportedOperationException.class,
                () -> state.slots().get("helmet").set(0, second));
        assertThrows(
                UnsupportedOperationException.class, () -> state.slots().get("helmet").clear());
        assertThrows(
                UnsupportedOperationException.class,
                () -> state.slots().entrySet().iterator().next().setValue(List.of()));
    }

    @Test
    void controlledMutationsInvalidateSignatureAndRemainVisibleToReaders() {
        BuildState state = new BuildState();
        state.putSlot("helmet", Arrays.asList(first, null));
        List<Placement> view = state.slots().get("helmet");
        assertEquals("helmet:1@1,_", state.signature());

        state.setPlacement("helmet", 1, second);
        assertSame(second, view.get(1));
        assertEquals("helmet:1@1,2@6", state.signature());

        state.putSlot("helmet", List.of(second));
        assertEquals("helmet:2@6", state.signature());
        state.putSlot("boots", List.of(first));
        assertEquals("boots:1@1|helmet:2@6", state.signature());
    }

    @Test
    void copyingAnEvaluatedStateKeepsMutationsAndSignaturesIndependent() {
        BuildState source = new BuildState();
        source.putSlot("helmet", Arrays.asList(first, null));
        String signature = source.signature();
        BuildState copy = source.copy();
        assertEquals(signature, copy.signature());

        copy.setPlacement("helmet", 0, second);
        assertEquals(signature, source.signature());
        assertSame(first, source.slots().get("helmet").get(0));
        assertEquals("helmet:2@6,_", copy.signature());

        source.setPlacement("helmet", 0, null);
        assertEquals("helmet:_,_", source.signature());
        assertSame(second, copy.slots().get("helmet").get(0));
    }
}
