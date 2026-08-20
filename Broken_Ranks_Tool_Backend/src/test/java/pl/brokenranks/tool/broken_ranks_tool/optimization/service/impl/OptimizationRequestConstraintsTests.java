package pl.brokenranks.tool.broken_ranks_tool.optimization.service.impl;

import org.junit.jupiter.api.Test;
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.OptimizationRequest;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;

class OptimizationRequestConstraintsTests {

    @Test
    void usesFivePercentVariantLossWhenOlderRequestOmitsSetting() {
        OptimizationRequest request = new OptimizationRequest();

        assertEquals(0.05, OptimizationRequestConstraints.maxVariantRelativeLoss(request));
        assertNull(OptimizationRequestConstraints.validateQuantityRanges(request));
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

        assertNotNull(OptimizationRequestConstraints.validateQuantityRanges(request));
    }
}
