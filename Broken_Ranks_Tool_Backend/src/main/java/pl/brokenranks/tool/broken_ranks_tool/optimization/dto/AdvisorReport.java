package pl.brokenranks.tool.broken_ranks_tool.optimization.dto;

import java.util.List;
import java.util.Map;

/** Search coverage is reported separately from feasibility and improvement. */
public record AdvisorReport(
        int evaluatedStates,
        boolean timeLimitReached,
        boolean cancelled,
        boolean targetReached,
        double baselineValue,
        String goal,
        List<Plan> plans) {
    public record Plan(
            String kind,
            List<String> actions,
            int upgrades,
            boolean targetReached,
            Map<String, Integer> drifCounts) {}
}
