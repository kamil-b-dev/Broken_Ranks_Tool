package pl.brokenranks.tool.broken_ranks_tool.optimization.advisor;

import static org.junit.jupiter.api.Assertions.*;

import java.util.*;
import java.util.function.Consumer;
import org.junit.jupiter.api.Test;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_BONUS_TYPE;
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.AdvisorOptions;

class AdvisorOptionsValidatorTests {
    private final AdvisorOptionsValidator validator = new AdvisorOptionsValidator();

    private AdvisorOptions options() {
        var options = new AdvisorOptions();
        options.setGoal(DRIF_BONUS_TYPE.CRITICAL_CHANCE);
        return options;
    }

    @Test
    void rejectsEveryMissingOrConflictingOptionIndependently() {
        assertFalse(validator.valid(null));
        List<Consumer<AdvisorOptions>> invalid =
                List.of(
                        o -> o.setGoal(null),
                        o -> o.setStrategy(null),
                        o -> o.setAllowedChanges(null),
                        o -> o.setProfession(null),
                        o -> o.setPurchaseScope(null),
                        o -> o.setMaxActions(0),
                        o -> o.setMaxActions(11),
                        o -> o.setTimeBudgetMs(4500),
                        o -> o.setRunId(UUID.randomUUID()),
                        o -> o.setCancellationToken(UUID.randomUUID()),
                        o -> {
                            o.setTargetGain(1.0);
                            o.setTargetValue(2.0);
                        });
        for (var change : invalid) {
            var options = options();
            change.accept(options);
            assertFalse(validator.valid(options));
        }
        for (double invalidTarget : new double[] {-0.1, Double.NaN, Double.POSITIVE_INFINITY}) {
            var value = options();
            value.setTargetValue(invalidTarget);
            assertFalse(validator.valid(value));
            var gain = options();
            gain.setTargetGain(invalidTarget);
            assertFalse(validator.valid(gain));
            var protection = new AdvisorOptions.Protection();
            protection.setLoss(invalidTarget);
            var guarded = options();
            guarded.setProtectedModifiers(Map.of(DRIF_BONUS_TYPE.CRITICAL_CHANCE, protection));
            assertFalse(validator.valid(guarded));
        }
        var options = options();
        var entries = new HashMap<DRIF_BONUS_TYPE, AdvisorOptions.Protection>();
        options.setProtectedModifiers(entries);
        entries.put(DRIF_BONUS_TYPE.CRITICAL_CHANCE, null);
        assertFalse(validator.valid(options));
        entries.clear();
        entries.put(null, new AdvisorOptions.Protection());
        assertFalse(validator.valid(options));
    }

    @Test
    void acceptsBoundaryBudgetsActionsAndZeroTargets() {
        for (int budget : new int[] {3000, 6000})
            for (int actions : new int[] {1, 10}) {
                var options = options();
                options.setTimeBudgetMs(budget);
                options.setMaxActions(actions);
                options.setTargetValue(0.0);
                options.setRunId(UUID.randomUUID());
                options.setCancellationToken(UUID.randomUUID());
                options.setProtectedModifiers(
                        Map.of(DRIF_BONUS_TYPE.CRITICAL_CHANCE, new AdvisorOptions.Protection()));
                assertTrue(validator.valid(options));
            }
    }
}
