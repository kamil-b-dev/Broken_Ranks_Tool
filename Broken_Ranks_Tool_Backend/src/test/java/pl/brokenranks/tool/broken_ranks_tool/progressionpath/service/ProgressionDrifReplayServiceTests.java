package pl.brokenranks.tool.broken_ranks_tool.progressionpath.service;

import static org.junit.jupiter.api.Assertions.*;

import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.*;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.rules.EquipmentRulesRegistry;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.DrifTemplate;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.validator.EquipmentPlacementRules;
import pl.brokenranks.tool.broken_ranks_tool.progressionpath.model.ProgressionDrif;
import pl.brokenranks.tool.broken_ranks_tool.progressionpath.model.ProgressionDrif.Position;
import pl.brokenranks.tool.broken_ranks_tool.progressionpath.model.ProgressionDrifOperation.*;

class ProgressionDrifReplayServiceTests {
    private final ProgressionDrifReplayService service =
            new ProgressionDrifReplayService(
                    new EquipmentPlacementRules(new EquipmentRulesRegistry()));
    private final Map<Long, DrifTemplate> templates =
            Map.of(
                    1L, template(1, DRIF_SIZE.SUBDRIF, DRIF_BONUS_TYPE.DAMAGE_PHYSICAL),
                    2L, template(2, DRIF_SIZE.BIDRIF, DRIF_BONUS_TYPE.DAMAGE_PHYSICAL),
                    3L, template(3, DRIF_SIZE.MAGNIDRIF, DRIF_BONUS_TYPE.DAMAGE_PHYSICAL),
                    4L, template(4, DRIF_SIZE.ARCYDRIF, DRIF_BONUS_TYPE.DAMAGE_PHYSICAL),
                    5L, template(5, DRIF_SIZE.ARCYDRIF, DRIF_BONUS_TYPE.CRITICAL_CHANCE));
    private final Position helmet = new Position("helmet", 0);
    private final Position armor = new Position("armor", 1);

    @Test
    void preservesTheSameInstanceAcrossTransfersSizeAndLevelUpgrades() {
        var initial = List.of(new ProgressionDrif("owned", 1L, 6, helmet));
        var result =
                service.replay(
                        initial,
                        List.of(
                                new Move("owned", helmet, null),
                                new Upgrade("owned", 2L, 6),
                                new Upgrade("owned", 2L, 11),
                                new Move("owned", null, armor),
                                new Upgrade("owned", 3L, 16),
                                new Upgrade("owned", 4L, 21)),
                        templates);
        assertEquals(List.of(new ProgressionDrif("owned", 4L, 21, armor)), result);
        assertEquals(List.of(new ProgressionDrif("owned", 1L, 6, helmet)), initial);
        assertEquals(DRIF_SIZE.SUBDRIF, templates.get(1L).getSize());
        assertThrows(UnsupportedOperationException.class, result::clear);
    }

    @Test
    void distinguishesTwoIdenticalStonesAndRequiresABufferForASwap() {
        var initial =
                List.of(
                        new ProgressionDrif("first", 1L, 6, helmet),
                        new ProgressionDrif("second", 1L, 6, armor));
        assertThrows(
                IllegalArgumentException.class,
                () ->
                        service.replay(
                                initial, List.of(new Move("first", helmet, armor)), templates));
        var result =
                service.replay(
                        initial,
                        List.of(
                                new Move("first", helmet, null),
                                new Move("second", armor, helmet),
                                new Move("first", null, armor)),
                        templates);
        assertEquals(
                List.of(
                        new ProgressionDrif("first", 1L, 6, armor),
                        new ProgressionDrif("second", 1L, 6, helmet)),
                result);
    }

    @ParameterizedTest
    @CsvSource({"2,6,1,6", "2,11,3,6", "3,6,2,11", "4,21,4,16", "4,21,3,16"})
    void forbidsDowngradingEitherDimensionEvenWhileIncreasingTheOther(
            long before, int beforeLevel, long after, int afterLevel) {
        var initial = List.of(new ProgressionDrif("owned", before, beforeLevel, null));
        assertThrows(
                IllegalArgumentException.class,
                () ->
                        service.replay(
                                initial,
                                List.of(new Upgrade("owned", after, afterLevel)),
                                templates));
    }

    @Test
    void rejectsChangingTheBonusAndLevelsBeyondTheSizeLimit() {
        var initial = List.of(new ProgressionDrif("owned", 1L, 6, null));
        assertThrows(
                IllegalArgumentException.class,
                () -> service.replay(initial, List.of(new Upgrade("owned", 5L, 21)), templates));
        assertThrows(
                IllegalArgumentException.class,
                () -> service.replay(initial, List.of(new Upgrade("owned", 2L, 12)), templates));
        assertThrows(
                IllegalArgumentException.class,
                () -> service.replay(initial, List.of(new Upgrade("owned", 1L, 6)), templates));
    }

    @Test
    void rejectsDuplicateOwnershipAndOccupiedInitialPositions() {
        var first = new ProgressionDrif("first", 1L, 6, helmet);
        assertThrows(
                IllegalArgumentException.class,
                () -> service.replay(List.of(first, first), List.of(), templates));
        assertThrows(
                IllegalArgumentException.class,
                () ->
                        service.replay(
                                List.of(first, new ProgressionDrif("second", 1L, 6, helmet)),
                                List.of(),
                                templates));
        assertThrows(
                IllegalArgumentException.class,
                () ->
                        service.replay(
                                List.of(first),
                                List.of(new Acquire(new ProgressionDrif("first", 2L, 11, null))),
                                templates));
    }

    @Test
    void acquisitionIsExplicitAndMustEnterStorage() {
        var acquired = new ProgressionDrif("new", 2L, 11, null);
        assertEquals(
                List.of(new ProgressionDrif("new", 2L, 11, armor)),
                service.replay(
                        List.of(),
                        List.of(new Acquire(acquired), new Move("new", null, armor)),
                        templates));
        assertThrows(
                IllegalArgumentException.class,
                () ->
                        service.replay(
                                List.of(),
                                List.of(new Acquire(new ProgressionDrif("new", 2L, 11, armor))),
                                templates));
        assertThrows(
                IllegalArgumentException.class,
                () -> service.replay(List.of(), List.of(new Move("new", null, armor)), templates));
    }

    @Test
    void errorsIncludeTheOperationIndexAndDoNotPublishPartialChanges() {
        var initial = List.of(new ProgressionDrif("owned", 1L, 6, helmet));
        var exception =
                assertThrows(
                        IllegalArgumentException.class,
                        () ->
                                service.replay(
                                        initial,
                                        List.of(
                                                new Move("owned", helmet, armor),
                                                new Move("owned", helmet, null)),
                                        templates));
        assertTrue(exception.getMessage().startsWith("Operacja 2:"));
        assertEquals(helmet, initial.getFirst().position());
        assertEquals(initial, service.replay(initial, List.of(), templates));
        assertThrows(
                IllegalArgumentException.class,
                () ->
                        service.replay(
                                initial, List.of(new Move("owned", helmet, helmet)), templates));
    }

    @Test
    void validatesAllInitialAndAcquiredStonesIncludingUnusedOnes() {
        assertThrows(
                IllegalArgumentException.class,
                () ->
                        service.replay(
                                List.of(new ProgressionDrif("unused", 1L, 7, null)),
                                List.of(),
                                templates));
        assertThrows(
                IllegalArgumentException.class,
                () ->
                        service.replay(
                                List.of(new ProgressionDrif("unused", 99L, 1, null)),
                                List.of(),
                                templates));
        var malformed = new LinkedHashMap<>(templates);
        malformed.put(1L, template(99, DRIF_SIZE.SUBDRIF, DRIF_BONUS_TYPE.DAMAGE_PHYSICAL));
        assertThrows(
                IllegalArgumentException.class,
                () ->
                        service.replay(
                                List.of(new ProgressionDrif("unused", 1L, 1, null)),
                                List.of(),
                                malformed));
        assertThrows(
                IllegalArgumentException.class,
                () ->
                        service.replay(
                                List.of(),
                                List.of(new Acquire(new ProgressionDrif("unused", 99L, 1, null))),
                                templates));
    }

    @Test
    void rejectsMissingInputsAndMalformedInstances() {
        assertThrows(
                IllegalArgumentException.class, () -> service.replay(null, List.of(), templates));
        assertThrows(
                IllegalArgumentException.class, () -> service.replay(List.of(), null, templates));
        assertThrows(
                IllegalArgumentException.class, () -> service.replay(List.of(), List.of(), null));
        assertThrows(
                IllegalArgumentException.class,
                () -> service.replay(Arrays.asList((ProgressionDrif) null), List.of(), templates));
        assertThrows(
                IllegalArgumentException.class,
                () -> service.replay(List.of(), Arrays.asList((Move) null), templates));
        assertThrows(
                IllegalArgumentException.class,
                () -> service.replay(List.of(), List.of(new Acquire(null)), templates));
        for (String id : Arrays.asList(null, "", " ", "a".repeat(161))) {
            assertThrows(
                    IllegalArgumentException.class, () -> new ProgressionDrif(id, 1L, 1, null));
        }
        assertThrows(
                IllegalArgumentException.class, () -> new ProgressionDrif("stone", 0L, 1, null));
        assertThrows(
                IllegalArgumentException.class, () -> new ProgressionDrif("stone", 1L, 0, null));
        assertThrows(IllegalArgumentException.class, () -> new Position("no-slot", 0));
        assertThrows(IllegalArgumentException.class, () -> new Position("helmet", -1));
        assertThrows(IllegalArgumentException.class, () -> new Position("helmet", 3));
    }

    private DrifTemplate template(long id, DRIF_SIZE size, DRIF_BONUS_TYPE type) {
        return DrifTemplate.builder()
                .id(id)
                .name("Drif " + id)
                .size(size)
                .bonusType(type)
                .baseValue("1%")
                .increment("1%")
                .build();
    }
}
