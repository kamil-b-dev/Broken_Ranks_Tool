package pl.brokenranks.tool.broken_ranks_tool.core.utils;

/**
 * Definiuje abstrakcję dla dostawcy liczb losowych, aby umożliwić
 * wstrzykiwanie zależności i mockowanie losowości w testach.
 */
public interface RandomProvider {
    /**
     * @param bound Górna granica.
     * @return Losowa liczba całkowita.
     */
    int nextInt(int bound);

    /**
     * @return Losowa liczba zmiennoprzecinkowa między 0.0 a 1.0.
     */
    double nextDouble();
}
