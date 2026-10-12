package pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model;

import static org.junit.jupiter.api.Assertions.*;
import static pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model.OptimizationEngineFixture.*;

import org.junit.jupiter.api.Test;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_BONUS_TYPE;
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.SearchStopReason;

class OptimizationSearchMetricsTests {
    @Test
    void recordsCacheHitsPeakSizeStageTimeAndNeverClaimsAnOptimum() {
        var context = context(request(DRIF_BONUS_TYPE.CRITICAL_CHANCE));
        var metrics = context.calculatorSession().metrics();
        metrics.evaluated(false);
        metrics.evaluated(true);
        metrics.verified(false);
        metrics.verified(true);
        metrics.beginNeighborhood(2);
        metrics.generated();
        context.calculatorCache().put("state", java.util.Map.of("stat", "1%"));
        metrics.recordStage("search", System.nanoTime(), context);
        var report = metrics.report(context);
        assertEquals(1, report.evaluatedStates());
        assertEquals(1, report.verifiedStates());
        assertEquals(1, report.generatedNeighborhoodStates());
        assertEquals(1, report.evaluationCacheHits());
        assertEquals(1, report.calculatorCacheHits());
        assertEquals(1, report.peakCalculatorCacheEntries());
        assertTrue(report.stageSeconds().get("search") >= 0);
        assertEquals(SearchStopReason.COMPLETED, report.stopReason());
        assertFalse(report.proofComplete());
        metrics.neighborhoodExhausted(true);
        assertEquals(SearchStopReason.OPERATION_LIMIT, metrics.report(context).stopReason());
        assertEquals(10000, report.budgets().get("beam").remaining());
    }
}
