package pl.brokenranks.tool.broken_ranks_tool.optimization.advisor;

import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.AdvisorOptions;

/** Validates advisor-specific settings before catalog data is loaded. */
final class AdvisorOptionsValidator {
    boolean valid(AdvisorOptions options) {
        if (options == null
                || options.getGoal() == null
                || options.getAllowedChanges() == null
                || options.getTimeBudgetMs() < 200
                || options.getTimeBudgetMs() > 5000
                || options.getMaxActions() < 1
                || options.getMaxActions() > 3
                || options.getTargetValue() != null && options.getTargetGain() != null)
            return false;
        if (invalid(options.getTargetValue()) || invalid(options.getTargetGain())) return false;
        return options.getProtectedModifiers() == null
                || options.getProtectedModifiers().entrySet().stream()
                        .allMatch(
                                e ->
                                        e.getKey() != null
                                                && e.getValue() != null
                                                && Double.isFinite(e.getValue().getLoss())
                                                && e.getValue().getLoss() >= 0);
    }

    private boolean invalid(Double target) {
        return target != null && (!Double.isFinite(target) || target < 0);
    }
}
