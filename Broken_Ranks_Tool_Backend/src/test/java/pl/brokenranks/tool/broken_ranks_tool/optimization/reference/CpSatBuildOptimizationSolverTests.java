package pl.brokenranks.tool.broken_ranks_tool.optimization.reference;

import static org.junit.jupiter.api.Assertions.*;
import static pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model.OptimizationEngineFixture.*;

import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.junit.jupiter.api.Test;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_BONUS_TYPE;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.rules.EquipmentRulesRegistry;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.validator.UpgradeLevelPolicy;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.context.OptimizationInitialStateFactory;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.evaluation.OptimizationStateEvaluator;

class CpSatBuildOptimizationSolverTests {
    private CpSatBuildOptimizationSolver solver() {
        var rules = new EquipmentRulesRegistry();
        return new CpSatBuildOptimizationSolver(
                rules,
                new OptimizationInitialStateFactory(new UpgradeLevelPolicy()),
                new OptimizationStateEvaluator(rules));
    }

    @Test
    void preservesBothMirrorPartitionsWhenTheirSlotConstraintsDiffer() {
        var type = DRIF_BONUS_TYPE.DAMAGE_MAGIC;
        var stone = drif(1, type);
        var context =
                context(
                        request(type),
                        slot("ring1", 4, 1, 0, false, Set.of(), stone),
                        slot("ring2", 4, 1, 0, false, Set.of(), stone));
        var plan = new CpSatBuildOptimizationSolver.ObjectivePlan(Map.of(), List.of(type));
        for (String occupied : List.of("ring1", "ring2")) {
            var result =
                    solver().proveNoBetter(
                                    context,
                                    Duration.ofSeconds(5),
                                    null,
                                    List.of(),
                                    Map.of(),
                                    Map.of(),
                                    Map.of(
                                            new CpSatBuildOptimizationSolver.SlotCount(
                                                    type, "ring1"),
                                            occupied.equals("ring1") ? 1 : 0,
                                            new CpSatBuildOptimizationSolver.SlotCount(
                                                    type, "ring2"),
                                            occupied.equals("ring2") ? 1 : 0),
                                    1,
                                    0,
                                    0L,
                                    plan);
            assertEquals(CpSatBuildOptimizationSolver.Status.FEASIBLE, result.status());
            assertNotNull(result.best().slots().get(occupied).getFirst());
        }
    }

    @Test
    void optimizesNegativeReductionForTargetsMaximizationAndExplicitPlans() {
        var type = DRIF_BONUS_TYPE.MANA_USAGE_REDUCTION;
        var stone = drif(2, type);
        stone.setBaseValue("-2%");
        stone.setIncrement("-1%");
        var request = request(type);
        request.setForcedPercentageTargets(Map.of(type, 7.0));
        var context = context(request, slot("helmet", 8, 1, 0, false, Set.of(), stone));
        // Independent one-socket enumeration: levels 1..6 yield -2..-7%, optimum is 6.
        var result = solver().solve(context, Duration.ofSeconds(5), null);
        assertEquals(CpSatBuildOptimizationSolver.Status.OPTIMAL, result.status());
        assertEquals(6, result.best().slots().get("helmet").getFirst().level());
        request.setForcedPercentageTargets(Map.of());
        request.setMaximizeBonuses(Set.of(type));
        var maximum = solver().solve(context, Duration.ofSeconds(5), null);
        assertEquals(6, maximum.best().slots().get("helmet").getFirst().level());
        var plan = new CpSatBuildOptimizationSolver.ObjectivePlan(Map.of(type, 7.0), List.of(type));
        var planned = solver().solve(context, Duration.ofSeconds(5), null, plan);
        assertEquals(CpSatBuildOptimizationSolver.Status.OPTIMAL, planned.status());
        assertEquals(70_000_000L, planned.objectiveValues().getFirst());
        assertEquals(List.of(1), solver().countsWithUpperBoundAbove(context, type, 6.99));
    }
}
