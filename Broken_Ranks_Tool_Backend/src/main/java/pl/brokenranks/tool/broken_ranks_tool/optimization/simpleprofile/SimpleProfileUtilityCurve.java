package pl.brokenranks.tool.broken_ranks_tool.optimization.simpleprofile;

/** Normalizes unlike stats and applies diminishing returns around a useful early-build target. */
public final class SimpleProfileUtilityCurve {

    private SimpleProfileUtilityCurve() {}

    public static double utility(double value, double usefulTarget) {
        if (usefulTarget <= 0.0 || value <= 0.0) return 0.0;
        double progress = value / usefulTarget;
        if (progress <= 1.0) return Math.sqrt(progress);
        return 1.0 + 0.2 * (1.0 - Math.exp(-(progress - 1.0)));
    }
}
