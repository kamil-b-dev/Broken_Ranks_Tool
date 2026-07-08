package pl.brokenranks.tool.broken_ranks_tool.core.utils;

import org.springframework.stereotype.Component;
import java.util.Random;

/**
 * Domyślna, produkcyjna implementacja {@link RandomProvider},
 * która deleguje wywołania do standardowej klasy {@link java.util.Random}.
 */
@Component
public class StandardRandomProvider implements RandomProvider {
    private final Random random = new Random();

    @Override
    public int nextInt(int bound) {
        return random.nextInt(bound);
    }

    @Override
    public double nextDouble() {
        return random.nextDouble();
    }
}
