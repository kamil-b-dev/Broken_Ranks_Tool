package pl.brokenranks.tool.broken_ranks_tool.core.utils;

/**
 * Interfejs abstrakcyjny dla dostawcy liczb losowych.
 * Stworzony w celu umożliwienia łatwego mockowania losowości w testach jednostkowych
 * oraz potencjalnej podmiany implementacji w przyszłości (np. na ThreadLocalRandom).
 */
public interface RandomProvider {
    int nextInt(int bound);
    double nextDouble();
}
