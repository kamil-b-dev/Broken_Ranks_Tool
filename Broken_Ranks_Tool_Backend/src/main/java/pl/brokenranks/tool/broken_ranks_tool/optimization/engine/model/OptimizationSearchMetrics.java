package pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model;

import java.util.LinkedHashMap;
import java.util.Map;
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.*;

/** Mutable measurements owned by one calculator session, including its focused variants. */
public final class OptimizationSearchMetrics {
    private long evaluations, verifications, evaluationHits, calculatorHits;
    private int generated, evaluationPeak, calculatorPeak, drifPeak;
    private boolean neighborhoodExhausted;
    private int neighborhoodInitial;
    private Map<String, StateEvaluation> mainEvaluationCache;
    private final Map<String, Double> seconds = new LinkedHashMap<>();

    public void evaluated(boolean cached) {
        if (cached) evaluationHits++;
        else evaluations++;
    }

    public void verified(boolean cached) {
        if (cached) calculatorHits++;
        else verifications++;
    }

    public void generated() {
        generated++;
    }

    public void beginNeighborhood(int limit) {
        neighborhoodInitial += Math.max(1, limit);
    }

    public void neighborhoodExhausted(boolean exhausted) {
        neighborhoodExhausted |= exhausted;
    }

    public void recordStage(String name, long started, OptimizationContext context) {
        seconds.merge(name, (System.nanoTime() - started) / 1_000_000_000.0, Double::sum);
        if (mainEvaluationCache == null) mainEvaluationCache = context.evaluationCache();
        int liveEvaluationEntries =
                mainEvaluationCache.size()
                        + (mainEvaluationCache == context.evaluationCache()
                                ? 0
                                : context.evaluationCache().size());
        evaluationPeak = Math.max(evaluationPeak, liveEvaluationEntries);
        calculatorPeak =
                Math.max(
                        calculatorPeak,
                        context.calculatorCache().size()
                                + context.calculatorSession().numericCache().size());
        drifPeak = Math.max(drifPeak, context.drifValueCache().size());
    }

    public OptimizationSearchReport report(OptimizationContext context) {
        Map<String, OptimizationSearchReport.BudgetUsage> budgets = new LinkedHashMap<>();
        budgets.put("beam", usage(context.beamSearchBudget()));
        budgets.put("maximization", usage(context.maximizationSearchBudget()));
        budgets.put("refinement", usage(context.refinementSearchBudget()));
        budgets.put(
                "neighborhood",
                new OptimizationSearchReport.BudgetUsage(
                        neighborhoodInitial,
                        generated,
                        Math.max(0, neighborhoodInitial - generated),
                        neighborhoodExhausted));
        boolean exhausted =
                neighborhoodExhausted
                        || budgets.values().stream()
                                .anyMatch(OptimizationSearchReport.BudgetUsage::exhausted);
        return new OptimizationSearchReport(
                exhausted ? SearchStopReason.OPERATION_LIMIT : SearchStopReason.COMPLETED,
                false,
                Map.copyOf(budgets),
                generated,
                evaluations,
                verifications,
                evaluationHits,
                calculatorHits,
                evaluationPeak,
                calculatorPeak,
                drifPeak,
                Map.copyOf(seconds));
    }

    private OptimizationSearchReport.BudgetUsage usage(SearchBudget budget) {
        return new OptimizationSearchReport.BudgetUsage(
                budget.initial(), budget.consumed(), budget.remaining(), budget.exhausted());
    }
}
