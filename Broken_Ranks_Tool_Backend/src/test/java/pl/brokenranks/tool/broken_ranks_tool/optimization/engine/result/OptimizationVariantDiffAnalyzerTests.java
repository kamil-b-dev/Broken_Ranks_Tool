package pl.brokenranks.tool.broken_ranks_tool.optimization.engine.result;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.mock;
import static pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model.OptimizationEngineFixture.*;

import java.util.*;
import org.junit.jupiter.api.Test;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_BONUS_TYPE;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.EquipmentStatsCalculatorService;
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.OptimizationSummary.*;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model.*;

class OptimizationVariantDiffAnalyzerTests {
    private final OptimizationVariantDiffAnalyzer analyzer =
            new OptimizationVariantDiffAnalyzer(
                    new OptimizationCalculatorAdapter(
                            mock(EquipmentStatsCalculatorService.class), null, null));
    private final DRIF_BONUS_TYPE critical = DRIF_BONUS_TYPE.CRITICAL_CHANCE;
    private final DRIF_BONUS_TYPE magic = DRIF_BONUS_TYPE.DAMAGE_MAGIC;

    @Test
    void describesInsertionRemovalReplacementAndLevelChangeAtTheirActualSlots() {
        var first = drif(1, critical);
        var second = drif(2, magic);
        var context =
                context(
                        request(critical, magic),
                        slot("helmet", 100, 3, 0, false, Set.of(), first, second),
                        slot("armor", 100, 3, 0, false, Set.of(), first, second));
        BuildState main = new BuildState();
        BuildState variant = new BuildState();
        put(main, "helmet", new Placement(first, 1, false), new Placement(second, 6, false));
        put(variant, "helmet", new Placement(first, 6, false));
        put(main, "armor", new Placement(first, 6, false), null);
        put(
                variant,
                "armor",
                new Placement(second, 6, false),
                null,
                new Placement(first, 1, false));
        assertEquals(
                List.of(
                        new PlacementChange(
                                "helmet",
                                "helmet",
                                critical.getDescription(),
                                1,
                                critical.getDescription(),
                                6),
                        new PlacementChange(
                                "helmet", "helmet", magic.getDescription(), 6, null, null),
                        new PlacementChange(
                                "armor",
                                "armor",
                                critical.getDescription(),
                                6,
                                magic.getDescription(),
                                6),
                        new PlacementChange(
                                "armor", "armor", null, null, critical.getDescription(), 1)),
                analyzer.placementChanges(main, variant, context));
    }

    @Test
    void identicalPlacementIgnoresLockFlagAndMissingSlotIsAnEmptySlot() {
        var drif = drif(1, critical);
        var context = context(request(critical), slot("helmet", 10, 2, 0, false, Set.of(), drif));
        BuildState main = new BuildState();
        BuildState variant = new BuildState();
        put(main, "helmet", new Placement(drif, 6, true), null);
        put(variant, "helmet", new Placement(drif, 6, false), null);
        assertTrue(analyzer.placementChanges(main, variant, context).isEmpty());
        assertEquals(1, analyzer.placementChanges(new BuildState(), variant, context).size());
        assertEquals(1, analyzer.placementChanges(main, new BuildState(), context).size());
    }

    @Test
    void reportsOnlyChangedDrifStatsWithStableOrderAndZeroForMissingValues() {
        var context =
                context(
                        request(critical, magic),
                        slot(
                                "helmet",
                                10,
                                2,
                                0,
                                false,
                                Set.of(),
                                drif(1, critical),
                                drif(2, magic)));
        BuildState main = new BuildState();
        BuildState variant = new BuildState();
        put(variant, "helmet", new Placement(drif(1, critical), 6, false));
        context.calculatorCache()
                .put(main.signature(), Map.of(critical.name(), "2%", "HEALTH", "100"));
        context.calculatorCache()
                .put(variant.signature(), Map.of(magic.name(), "7%", "HEALTH", "200"));
        assertEquals(
                List.of(
                        new StatChange(critical.name(), "2%", "0"),
                        new StatChange(magic.name(), "0", "7%")),
                analyzer.statChanges(main, variant, context));
    }

    @Test
    void comparisonParsesCommaSignsAndUsesInclusiveHalfPointTolerance() {
        var context =
                context(
                        request(critical, magic),
                        slot(
                                "helmet",
                                10,
                                2,
                                0,
                                false,
                                Set.of(),
                                drif(1, critical),
                                drif(2, magic)));
        BuildState main = new BuildState();
        BuildState variant = new BuildState();
        put(variant, "helmet", new Placement(drif(1, critical), 6, false));
        context.calculatorCache()
                .put(main.signature(), Map.of(critical.name(), " +2,0% ", magic.name(), "-3%"));
        context.calculatorCache()
                .put(variant.signature(), Map.of(critical.name(), "2.5%", magic.name(), "-3.51%"));
        assertEquals(
                List.of(new StatChange(magic.name(), "-3%", "-3.51%")),
                analyzer.statChanges(main, variant, context));
    }
}
