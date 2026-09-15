package pl.brokenranks.tool.broken_ranks_tool.optimization.engine.result;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model.OptimizationEngineFixture.*;

import java.util.*;
import org.junit.jupiter.api.Test;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_BONUS_TYPE;
import pl.brokenranks.tool.broken_ranks_tool.equipment.dto.CalculationResultDto;
import pl.brokenranks.tool.broken_ranks_tool.equipment.dto.EquipmentRequest;
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.OptimizationRequest;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model.*;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.variant.GeneratedOptimizationVariant;

class OptimizationVariantSummaryFactoryTests {

    @Test
    void returnsOnlyTheMainVariantWhenAlternativesAreDisabled() {
        OptimizationCalculatorAdapter calculator = mock(OptimizationCalculatorAdapter.class);
        OptimizationSetupMapper mapper = mock(OptimizationSetupMapper.class);
        OptimizationVariantSummaryFactory factory =
                new OptimizationVariantSummaryFactory(calculator, mapper);
        OptimizationRequest request = request(DRIF_BONUS_TYPE.DAMAGE_MAGIC);
        request.setMaximizeBonuses(Set.of());
        OptimizationContext context = context(request);
        BuildState main = new BuildState();
        EquipmentRequest setup = new EquipmentRequest();
        CalculationResultDto calculation =
                new CalculationResultDto(Map.of("Siła", "100"), Map.of(), Set.of());
        when(mapper.toSetup(main, context)).thenReturn(setup);
        when(calculator.calculationResult(main, context)).thenReturn(calculation);

        var result = factory.create(main, List.of(), context);

        assertEquals(1, result.size());
        assertTrue(result.getFirst().main());
        assertSame(setup, result.getFirst().setup());
        assertSame(calculation, result.getFirst().calculationResult());
    }

    @Test
    void filtersDuplicateWeakAndOverlyComplexVariantsAndMapsARealTradeoff() {
        DRIF_BONUS_TYPE focus = DRIF_BONUS_TYPE.DAMAGE_MAGIC;
        DRIF_BONUS_TYPE protectedType = DRIF_BONUS_TYPE.CRITICAL_CHANCE;
        var magic = drif(10, focus);
        SlotContext helmet = slot("helmet", 100, 6, 0, false, Set.of(), magic);
        OptimizationRequest request = request(focus, protectedType);
        request.setMaximizeBonuses(Set.of(focus));
        request.setOriginalSlots(Map.of("helmet", helmet.original()));
        OptimizationContext context = context(request, helmet);
        BuildState main = new BuildState();
        put(main, "helmet");
        BuildState duplicate = new BuildState();
        put(duplicate, "helmet");
        BuildState weak = new BuildState();
        put(weak, "helmet", new Placement(magic, 1, false));
        BuildState useful = new BuildState();
        put(useful, "helmet", new Placement(magic, 6, false));
        BuildState complex = new BuildState();
        put(
                complex,
                "helmet",
                new Placement(magic, 1, false),
                new Placement(magic, 2, false),
                new Placement(magic, 3, false),
                new Placement(magic, 4, false),
                new Placement(magic, 5, false),
                new Placement(magic, 6, false));
        OptimizationCalculatorAdapter calculator = mock(OptimizationCalculatorAdapter.class);
        OptimizationSetupMapper mapper = mock(OptimizationSetupMapper.class);
        OptimizationVariantSummaryFactory factory =
                new OptimizationVariantSummaryFactory(calculator, mapper);
        when(calculator.actualValue(main, focus, context)).thenReturn(10.0);
        when(calculator.actualValue(weak, focus, context)).thenReturn(10.5);
        when(calculator.actualValue(useful, focus, context)).thenReturn(13.0);
        when(calculator.actualValue(complex, focus, context)).thenReturn(20.0);
        when(calculator.actualValue(main, protectedType, context)).thenReturn(8.0);
        when(calculator.actualValue(useful, protectedType, context)).thenReturn(6.5);
        when(calculator.actualStats(main, context)).thenReturn(Map.of(focus.name(), "10%"));
        when(calculator.actualStats(useful, context)).thenReturn(Map.of(focus.name(), "13%"));
        when(calculator.parseValue("10%")).thenReturn(10.0);
        when(calculator.parseValue("13%")).thenReturn(13.0);
        EquipmentRequest mainSetup = new EquipmentRequest();
        EquipmentRequest usefulSetup = new EquipmentRequest();
        when(mapper.toSetup(main, context)).thenReturn(mainSetup);
        when(mapper.toSetup(useful, context)).thenReturn(usefulSetup);

        var result =
                factory.create(
                        main,
                        List.of(
                                new GeneratedOptimizationVariant(focus, duplicate),
                                new GeneratedOptimizationVariant(focus, weak),
                                new GeneratedOptimizationVariant(focus, complex),
                                new GeneratedOptimizationVariant(focus, useful)),
                        context);

        assertEquals(2, result.size());
        var alternative = result.get(1);
        assertFalse(alternative.main());
        assertEquals(10.0, alternative.finalValue());
        assertEquals(13.0, alternative.variantValue());
        assertEquals(3.0, alternative.gain());
        assertEquals(1.5, alternative.totalLoss());
        assertEquals(1, alternative.changeCount());
        assertSame(usefulSetup, alternative.setup());
        assertEquals(
                List.of(
                        new pl.brokenranks.tool.broken_ranks_tool.optimization.dto
                                .OptimizationSummary.StatChange(focus.name(), "10%", "13%")),
                alternative.statChanges());
        verify(mapper, never()).toSetup(weak, context);
        verify(mapper, never()).toSetup(complex, context);
    }
}
