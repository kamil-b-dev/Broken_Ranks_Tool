package pl.brokenranks.tool.broken_ranks_tool.optimization.advisor;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;

import java.util.Map;
import java.util.Set;
import java.util.concurrent.atomic.AtomicBoolean;
import org.junit.jupiter.api.Test;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_BONUS_TYPE;
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.AdvisorOptions;

class AdvisorSearchControlTests {

    @Test
    void stopsAtDeadlineCancellationStateLimitAndThreadInterruption() {
        assertFalse(search(System.nanoTime() - 1, new AtomicBoolean()).running());
        assertTrue(search(System.nanoTime() - 1, new AtomicBoolean()).limited());

        AtomicBoolean cancelled = new AtomicBoolean(true);
        assertFalse(search(Long.MAX_VALUE, cancelled).running());

        AdvisorSearch exhausted = search(Long.MAX_VALUE, new AtomicBoolean());
        exhausted.control.exhaustForTest();
        assertFalse(exhausted.running());
        assertTrue(exhausted.limited());

        AdvisorSearch interrupted = search(Long.MAX_VALUE, new AtomicBoolean());
        Thread.currentThread().interrupt();
        try {
            assertFalse(interrupted.running());
        } finally {
            Thread.interrupted();
        }
    }

    @Test
    void ranksReachedTargetByCostAndUnreachedPlansByGain() {
        AdvisorOptions options = options();
        options.setTargetValue(10.0);
        AdvisorSearch search =
                new AdvisorSearch(
                        mock(AdvisorEquipmentModel.class),
                        options,
                        stats(0),
                        Long.MAX_VALUE,
                        new AtomicBoolean());
        AdvisorSearch.Node cheapReached = node(10, 0, 0, 1);
        AdvisorSearch.Node expensiveReached = node(20, 1, 4, 1);
        AdvisorSearch.Node unreached = node(9, 0, 0, 0);

        assertTrue(search.ranking().compare(cheapReached, expensiveReached) < 0);
        assertTrue(search.ranking().compare(expensiveReached, unreached) < 0);
    }

    @Test
    void registryRejectsDuplicateRunAndForgetsFinishedRun() {
        AdvisorRunRegistry registry = new AdvisorRunRegistry();
        AtomicBoolean flag = registry.start("run-1");

        assertThrows(IllegalArgumentException.class, () -> registry.start("run-1"));
        assertTrue(registry.cancel("run-1"));
        assertTrue(flag.get());
        registry.finish("run-1");
        assertFalse(registry.cancel("run-1"));
    }

    private AdvisorSearch search(long deadline, AtomicBoolean cancelled) {
        return new AdvisorSearch(
                mock(AdvisorEquipmentModel.class), options(), stats(0), deadline, cancelled);
    }

    private AdvisorOptions options() {
        AdvisorOptions options = new AdvisorOptions();
        options.setGoal(DRIF_BONUS_TYPE.CRITICAL_CHANCE);
        return options;
    }

    private AdvisorSearch.Node node(double value, int upgrades, int effort, int actions) {
        return new AdvisorSearch.Node(
                Map.of(),
                stats(value),
                java.util.Collections.nCopies(actions, "action"),
                Set.of(),
                upgrades,
                effort);
    }

    private double[] stats(double goalValue) {
        double[] stats = new double[DRIF_BONUS_TYPE.values().length];
        stats[DRIF_BONUS_TYPE.CRITICAL_CHANCE.ordinal()] = goalValue;
        return stats;
    }
}
