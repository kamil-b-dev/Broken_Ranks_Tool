package pl.brokenranks.tool.broken_ranks_tool.optimization.engine.evaluation;

import static org.junit.jupiter.api.Assertions.*;
import static pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model.OptimizationEngineFixture.*;

import java.util.Set;
import org.junit.jupiter.api.Test;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_BONUS_TYPE;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.rules.EquipmentRulesRegistry;
import pl.brokenranks.tool.broken_ranks_tool.optimization.cache.BoundedSearchCache;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model.*;

class OptimizationCacheEvictionTests {
    @Test
    void evictionRecomputesIdenticalMetricsQualityAndRankingWithoutConsumingBudget() {
        var type = DRIF_BONUS_TYPE.CRITICAL_CHANCE;
        var stone = drif(1, type);
        var request = request(type);
        request.setMaximizeBonuses(Set.of(type));
        var source = context(request, slot("helmet", 10, 2, 0, false, Set.of(), stone));
        var context =
                new OptimizationContext(
                        source.request(),
                        source.items(),
                        source.drifs(),
                        source.slots(),
                        source.slotsByDrifBonus(),
                        source.sortedPriorities(),
                        source.sortedQuantities(),
                        source.beamSearchBudget(),
                        source.maximizationSearchBudget(),
                        source.refinementSearchBudget(),
                        source.calculatorBaseline(),
                        source.maximizationScaleCache(),
                        source.calculatorCache(),
                        new BoundedSearchCache<>(1),
                        source.drifValueCache(),
                        source.calculatorSession());
        var evaluator = new OptimizationStateEvaluator(new EquipmentRulesRegistry());
        var first = new BuildState();
        var second = new BuildState();
        put(first, "helmet", new Placement(stone, 1, false));
        put(second, "helmet", new Placement(stone, 6, false));
        var expectedMetrics = evaluator.metrics(first, context);
        var expectedQuality = evaluator.quality(first, context);
        var expectedScore = evaluator.score(first, context);

        assertTrue(evaluator.isBetterState(second, first, context));
        evaluator.metrics(second, context);
        assertFalse(context.evaluationCache().containsKey(first.signature()));
        assertEquals(expectedMetrics, evaluator.metrics(first, context));
        assertEquals(expectedQuality, evaluator.quality(first, context));
        assertEquals(expectedScore, evaluator.score(first, context));
        assertTrue(evaluator.isBetterState(second, first, context));
        assertEquals(1, context.evaluationCache().size());
        assertEquals(0, context.beamSearchBudget().consumed());
        assertEquals(0, context.maximizationSearchBudget().consumed());
        assertEquals(0, context.refinementSearchBudget().consumed());
    }
}
