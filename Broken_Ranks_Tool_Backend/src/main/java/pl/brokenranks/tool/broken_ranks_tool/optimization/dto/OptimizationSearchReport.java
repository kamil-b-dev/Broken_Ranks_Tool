package pl.brokenranks.tool.broken_ranks_tool.optimization.dto;

import java.util.Map;

/** Request-local measurements; state evaluations may include several focused variant objectives. */
public record OptimizationSearchReport(
        SearchStopReason stopReason,
        boolean proofComplete,
        Map<String, BudgetUsage> budgets,
        int generatedNeighborhoodStates,
        long evaluatedStates,
        long verifiedStates,
        long evaluationCacheHits,
        long calculatorCacheHits,
        int peakEvaluationCacheEntries,
        int peakCalculatorCacheEntries,
        int peakDrifCacheEntries,
        Map<String, Double> stageSeconds) {
    public record BudgetUsage(int initial, int consumed, int remaining, boolean exhausted) {}
}
