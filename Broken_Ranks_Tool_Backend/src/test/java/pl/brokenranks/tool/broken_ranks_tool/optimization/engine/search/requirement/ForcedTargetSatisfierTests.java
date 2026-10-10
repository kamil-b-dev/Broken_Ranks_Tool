package pl.brokenranks.tool.broken_ranks_tool.optimization.engine.search.requirement;

import static org.junit.jupiter.api.Assertions.*;
import static pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model.OptimizationEngineFixture.*;

import java.util.Map;
import java.util.Set;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_BONUS_TYPE;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.rules.EquipmentRulesRegistry;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.validator.EquipmentPlacementRules;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.evaluation.OptimizationStateEvaluator;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model.*;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.search.evaluation.OptimizationStateEvaluation;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.search.placement.OptimizationPlacementOperations;

class ForcedTargetSatisfierTests {
    @ParameterizedTest
    @CsvSource({"15,5,1,25", "2,3,0.2,6"})
    void choosesTargetDistanceIncludingIndependentBaseline(
            double baseline, double base, double increment, double target) {
        var type = DRIF_BONUS_TYPE.CRITICAL_CHANCE;
        var drif = drif(1, type);
        drif.setBaseValue(base + "%");
        drif.setIncrement(increment + "%");
        var low = slot("low", 4, 1, 0, false, Set.of(), drif);
        var high = slot("high", 4, 1, 0.2, false, Set.of(), drif);
        var request = request(type);
        request.setForcedPercentageTargets(Map.of(type, target));
        var context = context(request, high, low);
        context.calculatorBaseline().put(type, baseline);
        var state = new BuildState();
        put(state, "low", (Placement) null);
        put(state, "high", (Placement) null);
        var rules = new EquipmentRulesRegistry();
        var evaluator = new OptimizationStateEvaluator(rules);
        var operations =
                new OptimizationPlacementOperations(new EquipmentPlacementRules(rules), rules);
        new ForcedTargetSatisfier(
                        operations,
                        new OptimizationStateEvaluation(evaluator),
                        new OptimizationRequirementSupport(operations))
                .satisfy(state, context);
        assertNotNull(state.slots().get("low").getFirst());
        assertNull(state.slots().get("high").getFirst());
        assertEquals(target, evaluator.calculatedValue(state, type, context));
    }
}
