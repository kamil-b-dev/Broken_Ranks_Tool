package pl.brokenranks.tool.broken_ranks_tool.optimization.engine.evaluation;

import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model.Quality;

/** Defines the deterministic business ordering of optimization quality values. */
final class OptimizationQualityComparator {
    int compare(Quality left, Quality right) {
        int comparison = Integer.compare(right.hardViolations(), left.hardViolations());
        if (comparison != 0) return comparison;
        comparison = Double.compare(right.forcedCapDeficit(), left.forcedCapDeficit());
        if (comparison != 0) return comparison;
        comparison = Double.compare(left.weightedUtility(), right.weightedUtility());
        if (comparison != 0) return comparison;
        comparison = Double.compare(right.penaltyLoss(), left.penaltyLoss());
        if (comparison != 0) return comparison;
        comparison = Double.compare(right.forcedCapExcess(), left.forcedCapExcess());
        if (comparison != 0) return comparison;
        comparison = Double.compare(left.capacityUtilization(), right.capacityUtilization());
        if (comparison != 0) return comparison;
        return Integer.compare(left.totalPower(), right.totalPower());
    }
}
