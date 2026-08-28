package pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model;

/** Ordered quality dimensions used to compare optimization states. */
public record Quality(
        int hardViolations,
        double forcedCapDeficit,
        double minimumMaximizedProgress,
        double maximizedUtility,
        double weightedUtility,
        double penaltyLoss,
        double forcedCapExcess,
        double capacityUtilization,
        int totalPower) {}
