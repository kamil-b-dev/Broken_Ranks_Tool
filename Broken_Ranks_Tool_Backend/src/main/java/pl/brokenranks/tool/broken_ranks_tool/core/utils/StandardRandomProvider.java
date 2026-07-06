package pl.brokenranks.tool.broken_ranks_tool.core.utils;

import org.springframework.stereotype.Component;
import java.util.Random;

/**
 * Standardowa implementacja interfejsu {@link RandomProvider}.
 * Używa wbudowanej w Javę klasy {@link java.util.Random}.
 * Jest komponentem Springa, aby można go było łatwo wstrzykiwać.
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
