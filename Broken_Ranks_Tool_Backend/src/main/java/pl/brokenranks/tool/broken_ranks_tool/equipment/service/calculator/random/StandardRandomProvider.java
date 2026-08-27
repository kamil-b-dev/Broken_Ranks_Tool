package pl.brokenranks.tool.broken_ranks_tool.equipment.service.calculator.random;

import java.util.Random;
import org.springframework.stereotype.Component;

/** Production {@link RandomProvider} backed by {@link java.util.Random}. */
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
