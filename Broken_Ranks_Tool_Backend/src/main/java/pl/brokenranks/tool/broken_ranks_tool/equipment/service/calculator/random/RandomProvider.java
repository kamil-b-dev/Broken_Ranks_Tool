package pl.brokenranks.tool.broken_ranks_tool.equipment.service.calculator.random;

/** Abstracts random number generation for dependency injection and testing. */
public interface RandomProvider {
    /**
     * @param bound Exclusive upper bound.
     * @return A random integer below the supplied bound.
     */
    int nextInt(int bound);

    /** @return A random floating-point value between 0.0 and 1.0. */
    double nextDouble();
}
