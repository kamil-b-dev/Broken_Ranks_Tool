package pl.brokenranks.tool.broken_ranks_tool.optimization.engine.result;

import static org.junit.jupiter.api.Assertions.*;
import static pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model.OptimizationEngineFixture.*;

import java.util.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_BONUS_TYPE;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.rules.EquipmentRulesRegistry;
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.OptimizationRequest;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.evaluation.OptimizationStateEvaluator;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model.*;

class OptimizationFinalResultValidatorTests {
    private final OptimizationFinalResultValidator validator =
            new OptimizationFinalResultValidator(
                    new OptimizationStateEvaluator(new EquipmentRulesRegistry()));
    private final DRIF_BONUS_TYPE type = DRIF_BONUS_TYPE.CRITICAL_CHANCE;

    @ParameterizedTest
    @CsvSource({"2,3", "0,0"})
    void rejectsCountsBelowMinimumOrAboveMaximum(int min, int max) {
        var drif = drif(1, type);
        var request = request(type);
        request.setTargetQuantities(Map.of(type, new OptimizationRequest.QuantityRange(min, max)));
        var context = context(request, slot("helmet", 20, 2, 0, false, Set.of(), drif));
        BuildState state = new BuildState();
        put(state, "helmet", new Placement(drif, 6, false));
        assertEquals(
                "Końcowy wynik nie spełnia limitów ilościowych.",
                validator.validate(state, context));
    }

    @Test
    void rejectsSocketOverflowEvenWithEnoughCapacity() {
        var first = drif(1, type);
        var second = drif(2, DRIF_BONUS_TYPE.DAMAGE_MAGIC);
        var context =
                context(request(type), slot("helmet", 100, 1, 0, false, Set.of(), first, second));
        BuildState state = new BuildState();
        put(state, "helmet", new Placement(first, 6, false), new Placement(second, 6, false));
        assertEquals(
                "Końcowy wynik przekracza limit drifów w slocie helmet.",
                validator.validate(state, context));
    }

    @Test
    void acceptsExactCapacityButRejectsOnePointOverflow() {
        var drif = drif(1, type);
        BuildState state = new BuildState();
        put(state, "helmet", null, new Placement(drif, 6, false));
        int power = type.getBasePower();
        assertNull(
                validator.validate(
                        state,
                        context(
                                request(type),
                                slot("helmet", power, 2, 0, false, Set.of(), drif))));
        assertEquals(
                "Końcowy wynik przekracza pojemność w slocie helmet.",
                validator.validate(
                        state,
                        context(
                                request(type),
                                slot("helmet", power - 1, 2, 0, false, Set.of(), drif))));
    }

    @Test
    void rejectsDuplicateBonusEvenWithDifferentTemplateIds() {
        var first = drif(1, type);
        var second = drif(2, type);
        BuildState state = new BuildState();
        put(state, "helmet", new Placement(first, 6, false), null, new Placement(second, 6, false));
        assertEquals(
                "Końcowy wynik zawiera zduplikowany mod w slocie helmet.",
                validator.validate(
                        state,
                        context(
                                request(type),
                                slot("helmet", 100, 3, 0, false, Set.of(), first, second))));
    }

    @Test
    void builtInsCountTowardQuantityButDoNotConsumeOrdinaryCapacity() {
        var drif = drif(1, type);
        var request = request(type);
        request.setTargetQuantities(Map.of(type, new OptimizationRequest.QuantityRange(1, 1)));
        BuildState state = new BuildState();
        put(state, "weapon", new Placement(drif, 6, true));
        assertNull(
                validator.validate(
                        state, context(request, slot("weapon", 0, 0, 0, true, Set.of(), drif))));
    }

    @Test
    void acceptsMissingAndEmptySlotsWithoutRequirements() {
        assertNull(
                validator.validate(
                        new BuildState(),
                        context(request(type), slot("helmet", 0, 1, 0, false, Set.of()))));
    }
}
