package pl.brokenranks.tool.broken_ranks_tool.optimization.service.impl;

import static org.junit.jupiter.api.Assertions.*;
import static pl.brokenranks.tool.broken_ranks_tool.optimization.service.impl.OptimizationCalculatorFixture.*;

import java.util.*;
import org.junit.jupiter.api.Test;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.*;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.rules.EquipmentRulesRegistry;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.validator.EquipmentPlacementRules;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.evaluation.OptimizationStateEvaluator;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model.*;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.result.*;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.variant.*;
import pl.brokenranks.tool.broken_ranks_tool.optimization.locking.OptimizationLockService;

class OptimizationVariantUtilityIntegrationTests {

    @Test
    void percentageLossUsesTheActualUsefulValueEvenBelowOnePoint() {
        var f = fixture("45%", "1%");
        var magic = f.context.drifs().get(11L);
        magic.setBaseValue("0.46%");
        magic.setIncrement("0.04%");
        f.main.setPlacement("armor", 0, f.main.slots().get("armor").getFirst().withLevel(2));
        f.context.request().setMaximizeBonuses(Set.of());
        f.context.request().setMaxVariantLossPercent(5);
        assertTrue(f.generator.generate(f.main, f.context, List.of(f.state(2, 1))).isEmpty());
        f.context.request().setMaxVariantLossPercent(10);
        assertEquals(1, f.generator.generate(f.main, f.context, List.of(f.state(2, 1))).size());
    }

    @Test
    void achievedSoftGoalCanBeTradedWithinTheConfiguredLoss() {
        var f = fixture("37%", "1%");
        f.main.setPlacement("helmet", 0, f.main.slots().get("helmet").getFirst().withLevel(2));
        f.context.request().setMaximizeBonuses(Set.of());
        f.context.request().setMaxVariantLossPercent(5);
        f.context
                .request()
                .setForcedPercentageTargets(Map.of(DRIF_BONUS_TYPE.CRITICAL_CHANCE, 40.0));
        var variants = f.generator.generate(f.main, f.context, List.of(f.state(1, 8)));
        assertEquals(1, variants.size());
        var summary = f.assembler.createSummary(f.main, f.context, 0, List.of(), variants);
        assertEquals(1, summary.getNextVariants().get(1).totalLoss());
        assertEquals(
                "39%",
                summary.getNextVariants()
                        .get(1)
                        .calculationResult()
                        .stats()
                        .get("CRITICAL_CHANCE"));
    }

    @Test
    void zeroLossDoesNotAllowAnExtraHalfPointOutsideTheConfiguredLimit() {
        var f = fixture("43%", "0.4%");
        f.main.setPlacement("helmet", 0, f.main.slots().get("helmet").getFirst().withLevel(2));
        f.context.request().setMaximizeBonuses(Set.of());
        f.context.request().setMaxVariantLossPercent(0);
        assertTrue(f.generator.generate(f.main, f.context, List.of(f.state(1, 8))).isEmpty());
        f.context.request().setMaxVariantLossPercent(5);
        assertEquals(1, f.generator.generate(f.main, f.context, List.of(f.state(1, 8))).size());
    }

    @Test
    void doesNotRewardSurplusButKeepsAnImprovementOfAnotherSelectedModifier() {
        var f = fixture("60%", "8%");
        assertTrue(f.generator.generate(f.main, f.context, List.of(f.state(2, 6))).isEmpty());
        var variants = f.generator.generate(f.main, f.context, List.of(f.state(2, 8)));
        assertEquals(1, variants.size());
        assertEquals(DRIF_BONUS_TYPE.DAMAGE_MAGIC, variants.getFirst().focus());
        var summary = f.assembler.createSummary(f.main, f.context, 0, List.of(), variants);
        var alternative = summary.getNextVariants().get(1);
        assertEquals(2, alternative.gain());
        assertEquals(0, alternative.totalLoss());
        assertEquals("70%", alternative.calculationResult().stats().get("CRITICAL_CHANCE"));
    }

    @Test
    void explicitPercentageAlsoStopsRewardingSurplus() {
        var f = fixture("43%", "2%");
        f.context.request().setMaximizeBonuses(Set.of());
        f.context
                .request()
                .setForcedPercentageTargets(Map.of(DRIF_BONUS_TYPE.CRITICAL_CHANCE, 40.0));
        assertTrue(f.generator.generate(f.main, f.context, List.of(f.state(2, 6))).isEmpty());
        assertEquals(1, f.generator.generate(f.main, f.context, List.of(f.state(2, 8))).size());
    }

    @Test
    void unmetSoftGoalDoesNotHideAnOtherwiseUsefulVariant() {
        var f = fixture("28%", "0%");
        f.context.request().setMaximizeBonuses(Set.of());
        f.context
                .request()
                .setForcedPercentageTargets(Map.of(DRIF_BONUS_TYPE.CRITICAL_CHANCE, 50.0));
        var variants = f.generator.generate(f.main, f.context, List.of(f.state(1, 8)));
        assertEquals(1, variants.size());
        var warnings = f.assembler.forcedCapWarnings(f.main, f.context);
        assertFalse(warnings.isEmpty());
        assertEquals(
                2,
                f.assembler
                        .createSummary(f.main, f.context, 0, warnings, variants)
                        .getNextVariants()
                        .size());
    }

    @Test
    void clampedGoalProducesWarningWithoutClaimingItWasMissed() {
        var f = fixture("60%", "8%");
        f.context.request().setMaximizeBonuses(Set.of());
        f.context
                .request()
                .setForcedPercentageTargets(Map.of(DRIF_BONUS_TYPE.CRITICAL_CHANCE, 80.0));
        var summary =
                f.assembler.createSummary(
                        f.main,
                        f.context,
                        0,
                        f.assembler.forcedCapWarnings(f.main, f.context),
                        List.of());
        assertTrue(summary.isSuccess());
        assertTrue(
                summary.getWarnings().stream()
                        .anyMatch(warning -> warning.contains("ograniczony")));
        var goal =
                summary.getGoalResults().stream()
                        .filter(value -> value.statKey().equals("CRITICAL_CHANCE"))
                        .findFirst()
                        .orElseThrow();
        assertEquals("60.00%", goal.targetLabel());
        assertTrue(goal.targetSatisfied());
    }

    private Fixture fixture(String criticalBase, String criticalIncrement) {
        var helmet = item(1, ITEM_CATEGORY.HELMET, "XII", 16);
        var armor = item(2, ITEM_CATEGORY.ARMOR, "XII", 16);
        var critical =
                drif(
                        10,
                        DRIF_BONUS_TYPE.CRITICAL_CHANCE,
                        DRIF_SIZE.ARCYDRIF,
                        criticalBase,
                        criticalIncrement);
        var magic = drif(11, DRIF_BONUS_TYPE.DAMAGE_MAGIC, DRIF_SIZE.ARCYDRIF, "5%", "1%");
        var calculation = create(List.of(helmet, armor), List.of(critical, magic), List.of());
        var request =
                request(
                        Map.of("helmet", slot(1), "armor", slot(2)),
                        Map.of(
                                DRIF_BONUS_TYPE.CRITICAL_CHANCE,
                                30,
                                DRIF_BONUS_TYPE.DAMAGE_MAGIC,
                                20));
        request.setMaximizeBonuses(Set.of(DRIF_BONUS_TYPE.CRITICAL_CHANCE));
        var first =
                new SlotContext(
                        "helmet",
                        request.getOriginalSlots().get("helmet"),
                        helmet,
                        16,
                        3,
                        0,
                        List.of(critical),
                        Set.of(),
                        false);
        var second =
                new SlotContext(
                        "armor",
                        request.getOriginalSlots().get("armor"),
                        armor,
                        16,
                        3,
                        0,
                        List.of(magic),
                        Set.of(),
                        false);
        var context =
                new OptimizationContext(
                        request,
                        Map.of(1L, helmet, 2L, armor),
                        Map.of(10L, critical, 11L, magic),
                        List.of(first, second),
                        Map.of(0.0, List.of(first, second)),
                        request.getPriorities().entrySet().stream().toList(),
                        List.of(),
                        new SearchBudget(100),
                        new SearchBudget(100),
                        new SearchBudget(100),
                        new HashMap<>(),
                        new HashMap<>(),
                        new HashMap<>(),
                        new HashMap<>(),
                        new HashMap<>());
        var rules = new EquipmentRulesRegistry();
        var evaluator = new OptimizationStateEvaluator(rules);
        var assembler =
                OptimizationResultFactory.create(
                        new OptimizationLockService(),
                        calculation.calculator(),
                        evaluator,
                        new EquipmentPlacementRules(rules));
        var search =
                pl.brokenranks.tool.broken_ranks_tool.optimization.engine.search.neighborhood
                        .OptimizationNeighborhoodFactory.create(rules, evaluator, assembler);
        var generator = new OptimizationVariantGenerator(search, evaluator, assembler);
        var state = new BuildState();
        state.putSlot("helmet", List.of(new Placement(critical, 1, false)));
        state.putSlot("armor", List.of(new Placement(magic, 6, false)));
        return new Fixture(generator, assembler, context, state);
    }

    private record Fixture(
            OptimizationVariantGenerator generator,
            OptimizationResultAssembler assembler,
            OptimizationContext context,
            BuildState main) {
        BuildState state(int criticalLevel, int magicLevel) {
            var result = main.copy();
            result.setPlacement(
                    "helmet", 0, result.slots().get("helmet").getFirst().withLevel(criticalLevel));
            result.setPlacement(
                    "armor", 0, result.slots().get("armor").getFirst().withLevel(magicLevel));
            return result;
        }
    }
}
