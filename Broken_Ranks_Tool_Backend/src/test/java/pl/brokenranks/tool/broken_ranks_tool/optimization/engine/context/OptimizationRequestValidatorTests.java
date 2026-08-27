package pl.brokenranks.tool.broken_ranks_tool.optimization.engine.context;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;

import java.util.Map;
import java.util.Set;
import org.junit.jupiter.api.Test;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_BONUS_TYPE;
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.OptimizationRequest;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.rules.OptimizationRequestConstraints;

class OptimizationRequestValidatorTests {

    @Test
    void usesFivePercentVariantLossWhenOlderRequestOmitsSetting() {
        OptimizationRequest request = new OptimizationRequest();

        assertEquals(0.05, OptimizationRequestConstraints.maxVariantRelativeLoss(request));
        assertNull(OptimizationRequestValidator.validateSettings(request));
    }

    @Test
    void convertsConfiguredVariantLossFromPercentToRatio() {
        OptimizationRequest request = new OptimizationRequest();
        request.setMaxVariantLossPercent(17);

        assertEquals(0.17, OptimizationRequestConstraints.maxVariantRelativeLoss(request));
    }

    @Test
    void rejectsVariantLossOutsideSupportedRange() {
        OptimizationRequest request = new OptimizationRequest();
        request.setMaxVariantLossPercent(101);

        assertNotNull(OptimizationRequestValidator.validateSettings(request));
    }

    @Test
    void rejectsPercentageTargetCombinedWithMaximization() {
        OptimizationRequest request = new OptimizationRequest();
        request.setForcedPercentageTargets(Map.of(DRIF_BONUS_TYPE.CRITICAL_CHANCE, 25.0));
        request.setMaximizeBonuses(Set.of(DRIF_BONUS_TYPE.CRITICAL_CHANCE));

        assertNotNull(OptimizationRequestValidator.validateSettings(request));
    }
}
