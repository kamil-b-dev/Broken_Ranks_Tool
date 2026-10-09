package pl.brokenranks.tool.broken_ranks_tool.optimization.engine.search.neighborhood;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model.OptimizationEngineFixture.*;

import java.util.Map;
import java.util.Set;
import org.junit.jupiter.api.Test;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_BONUS_TYPE;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.rules.EquipmentRulesRegistry;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.evaluation.OptimizationStateEvaluator;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model.*;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.result.OptimizationResultAssembler;

class OptimizationActualStateComparatorTests {
    @Test
    void doesNotTradeUsefulDamageForCriticalChanceAboveTheNaturalCap() {
        var critical = DRIF_BONUS_TYPE.CRITICAL_CHANCE;
        var damage = DRIF_BONUS_TYPE.DAMAGE_MAGIC;
        var request = request(critical, damage);
        request.setPriorities(Map.of(critical, 30, damage, 1));
        request.setMaximizeBonuses(Set.of());
        var context = context(request);
        var current = new BuildState();
        put(current, "helmet", new Placement(drif(1, critical), 1, false));
        var candidate = current.copy();
        candidate.setPlacement("helmet", 0, new Placement(drif(1, critical), 6, false));
        var assembler = mock(OptimizationResultAssembler.class);
        when(assembler.actualValue(eq(current), eq(critical), eq(context))).thenReturn(62.0);
        when(assembler.actualValue(eq(candidate), eq(critical), eq(context))).thenReturn(64.0);
        when(assembler.actualValue(eq(current), eq(damage), eq(context))).thenReturn(10.0);
        when(assembler.actualValue(eq(candidate), eq(damage), eq(context))).thenReturn(9.0);
        var comparator =
                new OptimizationActualStateComparator(
                        new OptimizationStateEvaluator(new EquipmentRulesRegistry()), assembler);
        assertFalse(comparator.isBetter(candidate, current, context));
        assertTrue(comparator.isBetter(current, candidate, context));
    }
}
