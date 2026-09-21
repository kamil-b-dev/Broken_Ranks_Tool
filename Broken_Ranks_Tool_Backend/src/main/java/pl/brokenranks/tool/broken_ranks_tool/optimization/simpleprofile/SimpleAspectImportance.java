package pl.brokenranks.tool.broken_ranks_tool.optimization.simpleprofile;

/** Coarse importance scale that avoids exposing numeric optimizer weights. */
public enum SimpleAspectImportance {
    NORMAL(0.75),
    IMPORTANT(1.0),
    KEY(1.3);

    private final double multiplier;

    SimpleAspectImportance(double multiplier) {
        this.multiplier = multiplier;
    }

    public int weight(int baseWeight) {
        return Math.max(1, Math.min(30, (int) Math.round(baseWeight * multiplier)));
    }
}
