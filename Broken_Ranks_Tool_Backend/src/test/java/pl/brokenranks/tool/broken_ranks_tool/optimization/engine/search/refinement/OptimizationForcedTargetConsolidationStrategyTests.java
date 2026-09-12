package pl.brokenranks.tool.broken_ranks_tool.optimization.engine.search.refinement;

import static org.junit.jupiter.api.Assertions.*;
import static pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model.OptimizationEngineFixture.*;

import java.util.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_BONUS_TYPE;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_SIZE;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.rules.EquipmentRulesRegistry;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.validator.EquipmentPlacementRules;
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.OptimizationRequest;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.evaluation.OptimizationStateEvaluator;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model.*;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.search.evaluation.OptimizationStateEvaluation;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.search.level.OptimizationLevelAllocator;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.search.placement.OptimizationPlacementOperations;

class OptimizationForcedTargetConsolidationStrategyTests {
    private final DRIF_BONUS_TYPE a = DRIF_BONUS_TYPE.CRITICAL_CHANCE;
    private final DRIF_BONUS_TYPE b = DRIF_BONUS_TYPE.DAMAGE_MAGIC;
    private final EquipmentRulesRegistry rules = new EquipmentRulesRegistry();
    private final OptimizationStateEvaluator evaluator = new OptimizationStateEvaluator(rules);
    private final OptimizationStateEvaluation evaluation =
            new OptimizationStateEvaluation(evaluator);
    private final OptimizationPlacementOperations placements =
            new OptimizationPlacementOperations(new EquipmentPlacementRules(rules), rules);
    private final OptimizationForcedTargetConsolidationStrategy strategy =
            new OptimizationForcedTargetConsolidationStrategy(
                    placements, evaluation, new OptimizationLevelAllocator(placements, evaluation));

    @Test
    void swapsOntoStrongerItemAndRemovesRedundantDrifWithoutLosingMinimums() {
        var fixture = fixture("none");
        String original = fixture.state.signature();
        BuildState result = strategy.refine(fixture.state, fixture.context);
        assertEquals(a, result.slots().get("armor").getFirst().drif().getBonusType());
        var remaining =
                java.util.stream.Stream.of("helmet", "boots")
                        .map(key -> result.slots().get(key).getFirst())
                        .filter(Objects::nonNull)
                        .toList();
        assertEquals(1, remaining.size());
        assertEquals(b, remaining.getFirst().drif().getBonusType());
        assertEquals(21, evaluator.calculatedValue(result, a, fixture.context), 1e-9);
        assertTrue(evaluator.minimumsSatisfied(result, fixture.context));
        assertEquals(
                original,
                fixture.state.signature(),
                "Exploring a candidate must not mutate its parent");
    }

    @ParameterizedTest
    @ValueSource(
            strings = {
                "sourceSlot",
                "destinationSlot",
                "sourceIndex",
                "destinationIndex",
                "sourcePlacement",
                "destinationPlacement",
                "sparePlacement",
                "minimum",
                "unreachable",
                "capacity",
                "specialSource",
                "specialDestination",
                "tier",
                "element",
                "noTarget"
            })
    void refusesConsolidationThatCannotPreserveConstraints(String constraint) {
        var fixture = fixture(constraint);
        String original = fixture.state.signature();
        BuildState result = strategy.refine(fixture.state, fixture.context);
        assertEquals(original, result.signature(), constraint);
        assertEquals(original, fixture.state.signature());
    }

    private Fixture fixture(String constraint) {
        var first = drif(1, a);
        var second = drif(2, constraint.equals("element") ? DRIF_BONUS_TYPE.DAMAGE_FIRE : b);
        if (constraint.equals("tier")) first.setSize(DRIF_SIZE.ARCYDRIF);
        var source =
                slot(
                        "helmet",
                        20,
                        1,
                        0,
                        constraint.equals("specialSource"),
                        constraint.equals("sourceIndex") ? Set.of(0) : Set.of(),
                        first,
                        second);
        var destination =
                slot(
                        constraint.equals("element") ? "weapon" : "armor",
                        constraint.equals("capacity") ? 1 : 20,
                        1,
                        2,
                        constraint.equals("specialDestination"),
                        constraint.equals("destinationIndex") ? Set.of(0) : Set.of(),
                        first,
                        second);
        if (constraint.equals("tier")) destination.item().setTier("I");
        var spare = slot("boots", 20, 1, 0, false, Set.of(), first);
        var request = request(a, second.getBonusType());
        request.setPriorities(Map.of(a, 30, second.getBonusType(), 1));
        request.setTargetQuantities(
                Map.of(
                        a,
                        new OptimizationRequest.QuantityRange(
                                constraint.equals("minimum") ? 2 : 1, 2),
                        second.getBonusType(),
                        new OptimizationRequest.QuantityRange(1, 1)));
        if (!constraint.equals("noTarget"))
            request.setForcedPercentageTargets(
                    Map.of(a, constraint.equals("unreachable") ? 100.0 : 20.0));
        if (constraint.equals("sourceSlot")) request.setLockedSlots(Set.of("helmet", "boots"));
        if (constraint.equals("destinationSlot")) request.setLockedSlots(Set.of("armor"));
        BuildState state = new BuildState();
        put(state, "helmet", new Placement(first, 6, constraint.equals("sourcePlacement")));
        put(
                state,
                destination.key(),
                new Placement(second, 6, constraint.equals("destinationPlacement")));
        put(
                state,
                "boots",
                new Placement(
                        first,
                        1,
                        constraint.equals("sparePlacement")
                                || constraint.equals("sourcePlacement")
                                || constraint.equals("sourceIndex")
                                || constraint.equals("specialSource")));
        return new Fixture(state, context(request, source, destination, spare));
    }

    private record Fixture(BuildState state, OptimizationContext context) {}
}
