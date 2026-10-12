package pl.brokenranks.tool.broken_ranks_tool.optimization.engine.search.requirement;

import static org.junit.jupiter.api.Assertions.*;
import static pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model.OptimizationEngineFixture.*;

import java.util.*;
import org.junit.jupiter.api.Test;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_BONUS_TYPE;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.rules.EquipmentRulesRegistry;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.validator.EquipmentPlacementRules;
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.OptimizationRequest;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.evaluation.OptimizationStateEvaluator;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model.*;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.search.evaluation.OptimizationStateEvaluation;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.search.placement.OptimizationPlacementOperations;

class MinimumRequirementSatisfierTests {
    @Test
    void backtracksWhenTheHighestGainPlacementUsesCapacityNeededByOtherMinimums() {
        var a = drif(1, DRIF_BONUS_TYPE.CRITICAL_CHANCE);
        var b = drif(2, DRIF_BONUS_TYPE.DAMAGE_MAGIC);
        var c = drif(3, DRIF_BONUS_TYPE.MANA_REGEN);
        var tight = slot("helmet", 4, 2, 1, false, Set.of(), a, b, c);
        var large = slot("armor", 5, 1, 0, false, Set.of(), a, b, c);
        var request = request(a.getBonusType(), b.getBonusType(), c.getBonusType());
        request.setTargetQuantities(
                Map.of(
                        a.getBonusType(),
                        new OptimizationRequest.QuantityRange(1, 1),
                        b.getBonusType(),
                        new OptimizationRequest.QuantityRange(1, 1),
                        c.getBonusType(),
                        new OptimizationRequest.QuantityRange(1, 1)));
        var context = context(request, tight, large);
        var state = new BuildState();
        put(state, "helmet", null, null);
        put(state, "armor", (Placement) null);
        assertTrue(satisfier().satisfy(state, context));
        assertEquals(a.getId(), state.slots().get("armor").getFirst().drif().getId());
        assertEquals(
                Set.of(b.getId(), c.getId()),
                state.slots().get("helmet").stream()
                        .map(value -> value.drif().getId())
                        .collect(java.util.stream.Collectors.toSet()));
    }

    @Test
    void failedConstructionDoesNotOverwriteTheExistingState() {
        var a = drif(1, DRIF_BONUS_TYPE.CRITICAL_CHANCE);
        var b = drif(2, DRIF_BONUS_TYPE.DAMAGE_MAGIC);
        var slot = slot("helmet", 4, 2, 0, false, Set.of(), a, b);
        var request = request(a.getBonusType(), b.getBonusType());
        request.setTargetQuantities(
                Map.of(
                        a.getBonusType(),
                        new OptimizationRequest.QuantityRange(1, 1),
                        b.getBonusType(),
                        new OptimizationRequest.QuantityRange(1, 1)));
        var context = context(request, slot);
        var state = new BuildState();
        put(state, "helmet", null, null);
        String original = state.signature();
        assertFalse(satisfier().satisfy(state, context));
        assertEquals(original, state.signature());
    }

    private MinimumRequirementSatisfier satisfier() {
        var rules = new EquipmentRulesRegistry();
        var placements =
                new OptimizationPlacementOperations(new EquipmentPlacementRules(rules), rules);
        return new MinimumRequirementSatisfier(
                placements,
                new OptimizationStateEvaluation(new OptimizationStateEvaluator(rules)),
                new OptimizationRequirementSupport(placements));
    }
}
