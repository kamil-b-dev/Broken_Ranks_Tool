package pl.brokenranks.tool.broken_ranks_tool.optimization.engine.search.maximization;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model.OptimizationEngineFixture.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.junit.jupiter.api.Test;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_BONUS_TYPE;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.rules.EquipmentRulesRegistry;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.validator.EquipmentPlacementRules;
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.OptimizationRequest;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.evaluation.OptimizationStateEvaluator;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model.*;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.result.OptimizationResultAssembler;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.search.evaluation.OptimizationStateEvaluation;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.search.placement.OptimizationPlacementOperations;

class OptimizationSelectedBonusMaximizerTests {
    @Test
    void retainsTheBestVerifiedCandidateWhenTheBudgetIsExhausted() {
        var type = DRIF_BONUS_TYPE.DAMAGE_MAGIC;
        var drif = drif(1, type);
        var slot = slot("helmet", 20, 1, 0, false, Set.of(), drif);
        var request = request(type);
        request.setMaximizeBonuses(Set.of(type));
        request.setTargetQuantities(Map.of(type, new OptimizationRequest.QuantityRange(0, 1)));
        var original = context(request, slot);
        var context =
                new OptimizationContext(
                        request,
                        original.items(),
                        original.drifs(),
                        original.slots(),
                        original.slotsByDrifBonus(),
                        original.sortedPriorities(),
                        original.sortedQuantities(),
                        new SearchBudget(10),
                        new SearchBudget(1),
                        new SearchBudget(10),
                        new HashMap<>(),
                        new HashMap<>(),
                        new HashMap<>(),
                        new HashMap<>(),
                        new HashMap<>());
        var rules = new EquipmentRulesRegistry();
        var evaluator = new OptimizationStateEvaluator(rules);
        var evaluation = new OptimizationStateEvaluation(evaluator);
        var assembler = mock(OptimizationResultAssembler.class);
        when(assembler.actualValue(any(), eq(type), eq(context)))
                .thenAnswer(
                        call -> {
                            BuildState state = call.getArgument(0);
                            return state.slots().get("helmet").getFirst() == null ? 0.0 : 7.0;
                        });
        var comparator =
                new OptimizationMaximizationStateComparator(evaluation, evaluator, assembler);
        var maximizer =
                new OptimizationSelectedBonusMaximizer(
                        new OptimizationPlacementOperations(
                                new EquipmentPlacementRules(rules), rules),
                        evaluation,
                        comparator);
        var state = new BuildState();
        put(state, "helmet", (Placement) null);
        var improved = state.copy();
        improved.setPlacement("helmet", 0, new Placement(drif, 6, false));
        if (!evaluation.minimumsSatisfied(improved, context)
                || !comparator.isBetter(improved, state, context, List.of(type)))
            throw new AssertionError("Fixture must contain a verified better valid candidate");
        var result = maximizer.maximize(state, context);
        assertTrue(context.maximizationSearchBudget().exhausted());
        assertNotNull(result.slots().get("helmet").getFirst());
        assertEquals(6, result.slots().get("helmet").getFirst().level());
    }
}
