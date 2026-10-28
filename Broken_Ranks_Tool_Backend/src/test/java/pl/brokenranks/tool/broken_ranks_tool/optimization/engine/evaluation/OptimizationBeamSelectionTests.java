package pl.brokenranks.tool.broken_ranks_tool.optimization.engine.evaluation;

import static org.junit.jupiter.api.Assertions.*;
import static pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model.OptimizationEngineFixture.*;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.Set;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_BONUS_TYPE;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.rules.EquipmentRulesRegistry;
import pl.brokenranks.tool.broken_ranks_tool.optimization.cache.BoundedSearchCache;
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.OptimizationRequest;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model.*;

class OptimizationBeamSelectionTests {
    private final OptimizationStateEvaluator evaluator =
            new OptimizationStateEvaluator(new EquipmentRulesRegistry());

    @ParameterizedTest
    @ValueSource(ints = {1, 4, 24, 1000})
    void keepsTheExactOrderedPrefixWithoutChangingStatesOrConsumingSearchBudgets(int limit) {
        var states = candidates(700);
        var signatures = states.stream().map(BuildState::signature).toList();
        var expected =
                states.stream()
                        .sorted(evaluator.stateComparator(contextForSelection()))
                        .limit(limit)
                        .toList();
        var context = contextForSelection();
        assertEquals(expected, evaluator.bestStates(states, limit, context));
        assertEquals(signatures, states.stream().map(BuildState::signature).toList());
        assertEquals(0, context.beamSearchBudget().consumed());
        assertEquals(0, context.maximizationSearchBudget().consumed());
        assertEquals(0, context.refinementSearchBudget().consumed());
        var metrics = context.calculatorSession().metrics().report(context);
        assertEquals(states.size(), metrics.evaluatedStates());
        assertEquals(0, metrics.evaluationCacheHits());
    }

    @Test
    void usesSignatureForQualityTiesAndKeepsInputOrderForIdenticalSignatures() {
        var type = DRIF_BONUS_TYPE.CRITICAL_CHANCE;
        var stone = drif(1, type);
        var later = new BuildState();
        var earlier = new BuildState();
        put(later, "b", new Placement(stone, 1, false));
        put(earlier, "a", new Placement(stone, 1, false));
        var duplicate = earlier.copy();
        var context =
                context(
                        request(type),
                        slot("a", 10, 1, 0, false, Set.of(), stone),
                        slot("b", 10, 1, 0, false, Set.of(), stone));
        var selected = evaluator.bestStates(List.of(later, earlier, duplicate), 2, context);
        assertSame(earlier, selected.get(0));
        assertSame(duplicate, selected.get(1));
    }

    @Test
    void emptySelectionsDoNotEvaluateCandidates() {
        var context = contextForSelection();
        assertTrue(evaluator.bestStates(List.of(), 24, context).isEmpty());
        assertTrue(evaluator.bestStates(candidates(2), 0, context).isEmpty());
        assertEquals(0, context.calculatorSession().metrics().report(context).evaluatedStates());
    }

    static List<BuildState> candidates(int count) {
        var critical = drif(1, DRIF_BONUS_TYPE.CRITICAL_CHANCE);
        var magic = drif(2, DRIF_BONUS_TYPE.DAMAGE_MAGIC);
        var states = new ArrayList<BuildState>();
        for (int index = 0; index < count; index++) {
            var state = new BuildState();
            int encoded = index;
            for (int slot = 0; slot < 6; slot++) {
                int level = encoded % 7;
                encoded /= 7;
                put(
                        state,
                        "slot" + slot,
                        level == 0
                                ? null
                                : new Placement(slot % 2 == 0 ? critical : magic, level, false));
            }
            states.add(state);
        }
        Collections.shuffle(states, new Random(87239));
        return states;
    }

    static OptimizationContext contextForSelection() {
        var critical = drif(1, DRIF_BONUS_TYPE.CRITICAL_CHANCE);
        var magic = drif(2, DRIF_BONUS_TYPE.DAMAGE_MAGIC);
        var request = request(critical.getBonusType(), magic.getBonusType());
        request.setTargetQuantities(
                Map.of(critical.getBonusType(), new OptimizationRequest.QuantityRange(1, 3)));
        request.setForcedPercentageTargets(Map.of(critical.getBonusType(), 12.5));
        request.setMaximizeBonuses(Set.of(magic.getBonusType()));
        var slots = new SlotContext[6];
        for (int index = 0; index < slots.length; index++)
            slots[index] =
                    slot("slot" + index, 10, 1, index * 0.03, false, Set.of(), critical, magic);
        var source = context(request, slots);
        return new OptimizationContext(
                source.request(),
                source.items(),
                source.drifs(),
                source.slots(),
                source.slotsByDrifBonus(),
                source.sortedPriorities(),
                source.sortedQuantities(),
                source.beamSearchBudget(),
                source.maximizationSearchBudget(),
                source.refinementSearchBudget(),
                source.calculatorBaseline(),
                source.maximizationScaleCache(),
                source.calculatorCache(),
                new BoundedSearchCache<>(BoundedSearchCache.MAX_EVALUATIONS),
                source.drifValueCache(),
                source.calculatorSession());
    }
}
