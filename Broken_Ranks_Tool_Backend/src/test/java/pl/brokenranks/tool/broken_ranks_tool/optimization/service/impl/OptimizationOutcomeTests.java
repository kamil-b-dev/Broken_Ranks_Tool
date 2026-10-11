package pl.brokenranks.tool.broken_ranks_tool.optimization.service.impl;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static pl.brokenranks.tool.broken_ranks_tool.optimization.service.impl.OptimizationCalculatorFixture.*;

import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.*;
import pl.brokenranks.tool.broken_ranks_tool.optimization.config.OptimizationProperties;
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.*;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.context.OptimizationContextFactory;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model.OptimizationEngineFixture;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.result.OptimizationResultAssembler;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.search.pipeline.OptimizationSearchPipeline;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.validation.OptimizationInputValidator;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.variant.OptimizationVariantGenerator;

class OptimizationOutcomeTests {
    @Test
    void invalidInputAndAValidBuildWithUnmetSoftTargetsHaveDifferentOutcomes() {
        var fixture = create(List.of(item(1, ITEM_CATEGORY.HELMET, "X", 12)), List.of(), List.of());
        assertEquals(
                OptimizationOutcome.INVALID_INPUT,
                fixture.service().optimize(null).getSummary().getOutcome());
        var request =
                request(Map.of("helmet", slot(1)), Map.of(DRIF_BONUS_TYPE.CRITICAL_CHANCE, 15));
        request.setForceCapBonuses(java.util.Set.of(DRIF_BONUS_TYPE.CRITICAL_CHANCE));
        var result = fixture.service().optimize(request);
        assertEquals(
                OptimizationOutcome.VALID_BUILD_SOFT_TARGETS_UNMET,
                result.getSummary().getOutcome());
        assertNotNull(result.getCalculationResult());
        assertFalse(result.getSummary().isSuccess());
        assertFalse(result.getSummary().getSearchReport().proofComplete());
        assertTrue(result.getSummary().getSearchReport().verifiedStates() > 0);
        assertEquals(
                fixture.calculator().calculateTotalStats(result.getOptimizedSetup()),
                result.getCalculationResult().stats());
    }

    @Test
    void exhaustedSearchIsNotAnInputErrorOrAProofOfInfeasibility() {
        var type = DRIF_BONUS_TYPE.CRITICAL_CHANCE;
        var slot = OptimizationEngineFixture.slot("helmet", 12, 3, 0, false, java.util.Set.of());
        var request = request(Map.of("helmet", slot.original()), Map.of(type, 15));
        var context = OptimizationEngineFixture.context(request, slot);
        var contexts = mock(OptimizationContextFactory.class);
        when(contexts.create(any(), anyInt(), anyInt(), anyInt())).thenReturn(context);
        var service =
                new CustomModsOptimizationServiceImpl(
                        new OptimizationProperties(10, 10, 10, 1),
                        mock(OptimizationInputValidator.class),
                        contexts,
                        mock(OptimizationSearchPipeline.class),
                        mock(OptimizationResultAssembler.class),
                        mock(OptimizationVariantGenerator.class),
                        null);
        var result = service.optimize(request);
        assertEquals(OptimizationOutcome.NO_BUILD_FOUND, result.getSummary().getOutcome());
        assertFalse(result.getSummary().getSearchReport().proofComplete());
        assertNull(result.getCalculationResult());
    }
}
