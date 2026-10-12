package pl.brokenranks.tool.broken_ranks_tool.optimization.engine.evaluation;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model.OptimizationEngineFixture.*;

import java.util.List;
import java.util.Map;
import java.util.Set;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_BONUS_TYPE;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.rules.EquipmentRulesRegistry;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model.*;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.result.OptimizationResultAssembler;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.search.evaluation.OptimizationStateEvaluation;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.search.maximization.OptimizationMaximizationStateComparator;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.search.neighborhood.OptimizationActualStateComparator;

class OptimizationQualityParityTests {
    @ParameterizedTest
    @CsvSource({
        "CRITICAL_CHANCE,60%,false,false",
        "MANA_USAGE_REDUCTION,-60%,false,false",
        "DAMAGE_MAGIC,2%,false,true",
        "CRITICAL_CHANCE,30%,true,false"
    })
    void approximateVerifiedAndMaximizationPathsAgreeAboutUsefulValuesAndSurplus(
            DRIF_BONUS_TYPE type, String base, boolean explicitTarget, boolean expectHigherLevel) {
        var stone = drif(1, type);
        stone.setBaseValue(base);
        stone.setIncrement(type == DRIF_BONUS_TYPE.MANA_USAGE_REDUCTION ? "-1%" : "1%");
        var request = request(type);
        request.setMaximizeBonuses(Set.of(type));
        if (explicitTarget) request.setForcedPercentageTargets(Map.of(type, 30.0));
        var context = context(request, slot("helmet", 12, 3, 0, false, Set.of(), stone));
        BuildState current = new BuildState(), candidate = new BuildState();
        put(current, "helmet", new Placement(stone, 1, false));
        put(candidate, "helmet", new Placement(stone, 6, false));
        var evaluator = new OptimizationStateEvaluator(new EquipmentRulesRegistry());
        var assembler = mock(OptimizationResultAssembler.class);
        when(assembler.actualValue(any(), any(), any()))
                .thenAnswer(
                        call ->
                                evaluator.calculatedValue(
                                        call.getArgument(0),
                                        call.getArgument(1),
                                        call.getArgument(2)));
        var verified = new OptimizationActualStateComparator(evaluator, assembler);
        var maximization =
                new OptimizationMaximizationStateComparator(
                        new OptimizationStateEvaluation(evaluator), evaluator, assembler);
        assertEquals(expectHigherLevel, evaluator.isBetterState(candidate, current, context));
        assertEquals(expectHigherLevel, verified.isBetter(candidate, current, context));
        assertEquals(
                expectHigherLevel,
                maximization.isBetter(candidate, current, context, List.of(type)));
    }
}
