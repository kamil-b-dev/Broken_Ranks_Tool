package pl.brokenranks.tool.broken_ranks_tool.progressionpath.model;

import static org.junit.jupiter.api.Assertions.*;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.CHARACTER_CLASS;
import pl.brokenranks.tool.broken_ranks_tool.equipment.dto.EquipmentRequest;

class ProgressionPathTests {
    @Test
    void ownsDeepSnapshotsWithoutFillingMissingCharacterStatsOrDrifHoles() {
        var input = equipment();
        var slot = new EquipmentRequest.SlotData();
        slot.setItemId(1L);
        slot.setItemStars(7);
        slot.setDrifIds(new ArrayList<>(Arrays.asList(null, 3L)));
        slot.setDrifLevels(new LinkedHashMap<>(Map.of("1", 6)));
        slot.setOrbIds(new ArrayList<>(Arrays.asList(2L, null)));
        slot.setOrbLevels(new ArrayList<>(Arrays.asList(1, null)));
        input.getSlots().put("helmet", slot);
        input.setCharacterStats(new LinkedHashMap<>(Map.of("Siła", 20)));
        var stage = new ProgressionStage("start", 50, input);

        slot.setItemId(99L);
        slot.setItemStars(1);
        slot.getDrifIds().clear();
        slot.getDrifLevels().clear();
        slot.getOrbIds().clear();
        slot.getOrbLevels().clear();
        input.getCharacterStats().clear();
        input.getSlots().clear();

        var snapshot = stage.equipment();
        var stored = snapshot.getSlots().get("helmet");
        assertEquals(1L, stored.getItemId());
        assertEquals(7, stored.getItemStars());
        assertEquals(Arrays.asList(null, 3L), stored.getDrifIds());
        assertEquals(Map.of("1", 6), stored.getDrifLevels());
        assertEquals(List.of(2L), stored.getOrbIds());
        assertEquals(List.of(1), stored.getOrbLevels());
        assertEquals(Map.of("Siła", 20), snapshot.getCharacterStats());
        stored.getDrifIds().clear();
        stored.getDrifLevels().clear();
        stored.getOrbIds().clear();
        stored.getOrbLevels().clear();
        stored.setItemStars(9);
        snapshot.getCharacterStats().clear();
        snapshot.getSlots().clear();
        assertEquals(
                Arrays.asList(null, 3L), stage.equipment().getSlots().get("helmet").getDrifIds());
        assertEquals(Map.of("1", 6), stage.equipment().getSlots().get("helmet").getDrifLevels());
        assertEquals(List.of(2L), stage.equipment().getSlots().get("helmet").getOrbIds());
        assertEquals(List.of(1), stage.equipment().getSlots().get("helmet").getOrbLevels());
        assertEquals(7, stage.equipment().getSlots().get("helmet").getItemStars());
        assertEquals(Map.of("Siła", 20), stage.equipment().getCharacterStats());
        assertNull(new ProgressionStage("empty", 1, equipment()).equipment().getCharacterStats());
    }

    @Test
    void ownsStageOrderAndAllowsSeveralStagesAtTheSameLevel() {
        var stages = new ArrayList<>(List.of(stage("start", 1), stage("target", 1)));
        var path = new ProgressionPath(CHARACTER_CLASS.ARCHER, stages);
        stages.clear();
        assertEquals(
                List.of("start", "target"),
                path.stages().stream().map(ProgressionStage::id).toList());
        assertThrows(UnsupportedOperationException.class, () -> path.stages().clear());
    }

    @Test
    void rejectsDuplicateIdsDescendingLevelsAndNullStages() {
        assertThrows(
                IllegalArgumentException.class,
                () ->
                        new ProgressionPath(
                                CHARACTER_CLASS.ARCHER,
                                List.of(stage("same", 1), stage("same", 2))));
        assertThrows(
                IllegalArgumentException.class,
                () ->
                        new ProgressionPath(
                                CHARACTER_CLASS.ARCHER,
                                List.of(stage("start", 50), stage("target", 49))));
        assertThrows(
                IllegalArgumentException.class,
                () ->
                        new ProgressionPath(
                                CHARACTER_CLASS.ARCHER, Arrays.asList(stage("start", 1), null)));
        assertThrows(
                IllegalArgumentException.class,
                () -> new ProgressionPath(null, List.of(stage("start", 1), stage("target", 2))));
        assertThrows(
                IllegalArgumentException.class,
                () -> new ProgressionPath(CHARACTER_CLASS.ARCHER, null));
    }

    @ParameterizedTest
    @ValueSource(ints = {0, 1, 161})
    void boundsTheNumberOfStages(int count) {
        var stages = new ArrayList<ProgressionStage>();
        for (int index = 0; index < count; index++) stages.add(stage("stage-" + index, 1));
        assertThrows(
                IllegalArgumentException.class,
                () -> new ProgressionPath(CHARACTER_CLASS.ARCHER, stages));
    }

    @ParameterizedTest
    @ValueSource(ints = {0, -1, 141, Integer.MAX_VALUE})
    void rejectsInvalidCharacterLevel(int level) {
        assertThrows(IllegalArgumentException.class, () -> stage("start", level));
    }

    @Test
    void rejectsMissingSnapshotAndInvalidStageId() {
        assertThrows(IllegalArgumentException.class, () -> new ProgressionStage("start", 1, null));
        assertThrows(
                IllegalArgumentException.class,
                () -> new ProgressionStage("start", 1, new EquipmentRequest()));
        for (String id : Arrays.asList(null, "", " ", "a".repeat(65))) {
            assertThrows(IllegalArgumentException.class, () -> stage(id, 1));
        }
    }

    private ProgressionStage stage(String id, int level) {
        return new ProgressionStage(id, level, equipment());
    }

    private EquipmentRequest equipment() {
        var equipment = new EquipmentRequest();
        equipment.setSlots(new LinkedHashMap<>());
        return equipment;
    }
}
