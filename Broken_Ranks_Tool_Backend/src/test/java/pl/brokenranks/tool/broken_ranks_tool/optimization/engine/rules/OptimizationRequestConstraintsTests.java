package pl.brokenranks.tool.broken_ranks_tool.optimization.engine.rules;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static pl.brokenranks.tool.broken_ranks_tool.optimization.engine.rules.OptimizationRequestConstraints.directedValue;
import static pl.brokenranks.tool.broken_ranks_tool.optimization.engine.rules.OptimizationRequestConstraints.maximizationProgress;

import java.util.Set;
import org.junit.jupiter.api.Test;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_BONUS_TYPE;
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.OptimizationRequest;

class OptimizationRequestConstraintsTests {

    @Test
    void cappedMaximizedModifierDoesNotGainProgressAboveItsNaturalCap() {
        var request = new OptimizationRequest();
        request.setMaximizeBonuses(Set.of(DRIF_BONUS_TYPE.DAMAGE_REDUCTION));

        assertEquals(
                1.0, maximizationProgress(DRIF_BONUS_TYPE.DAMAGE_REDUCTION, 63.08, 40.0, request));
    }

    @Test
    void uncappedMaximizedModifierKeepsProgressAboveEstimatedScale() {
        var request = new OptimizationRequest();
        request.setMaximizeBonuses(Set.of(DRIF_BONUS_TYPE.DAMAGE_MAGIC));

        assertEquals(1.5, maximizationProgress(DRIF_BONUS_TYPE.DAMAGE_MAGIC, 60.0, 40.0, request));
    }

    @Test
    void negativeReductionIsAlwaysComparedByItsBeneficialMagnitude() {
        var request = new OptimizationRequest();

        assertEquals(33.35, directedValue(DRIF_BONUS_TYPE.MANA_USAGE_REDUCTION, -33.35, request));
    }
}
