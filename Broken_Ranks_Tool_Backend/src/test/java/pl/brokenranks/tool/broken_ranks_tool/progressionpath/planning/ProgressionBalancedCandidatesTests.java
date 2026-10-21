package pl.brokenranks.tool.broken_ranks_tool.progressionpath.planning;

import static org.junit.jupiter.api.Assertions.*;

import java.util.*;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.function.Function;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.*;
import pl.brokenranks.tool.broken_ranks_tool.equipment.dto.EquipmentRequest;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.*;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.EquipmentStatsCalculatorService;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.calculator.NumericStats;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.calculator.input.EquipmentDataProvider.CalculationContext;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.validator.*;
import pl.brokenranks.tool.broken_ranks_tool.progressionpath.model.*;
import pl.brokenranks.tool.broken_ranks_tool.progressionpath.service.ProgressionDrifReplayService;

@SpringBootTest
class ProgressionBalancedCandidatesTests {
    @Autowired private EquipmentStatsCalculatorService calculator;
    @Autowired private EquipmentPlacementRules placement;
    @Autowired private UpgradeLevelPolicy levels;

    @Test
    void sharesScarcePowerBetweenReductionAndCriticalInsteadOfMaxingTheFirstStones() {
        var fixture = fixture(DRIF_BONUS_TYPE.DAMAGE_REDUCTION);
        var tokens = fixture.transitions().equipped(fixture.target());
        var standard =
                new ProgressionCandidates(
                                fixture.context(),
                                placement,
                                levels,
                                fixture.transitions(),
                                fixture.calculate())
                        .project(fixture.stage(), tokens, false, false, () -> {})
                        .equipment();
        var balanced = balanced(fixture);
        var attempts = new AtomicInteger();
        var result = balanced.project(fixture.stage(), tokens, attempts::incrementAndGet);
        var ordinary = fixture.calculate().apply(standard);
        var equalized = fixture.calculate().apply(result.equipment());
        var goal = fixture.calculate().apply(fixture.target());
        double redGoal = goal.values().get("DAMAGE_REDUCTION");
        double critGoal = goal.values().get("CRITICAL_CHANCE") - 2;
        double before =
                Math.abs(
                        ordinary.values().get("DAMAGE_REDUCTION") / redGoal
                                - (ordinary.values().get("CRITICAL_CHANCE") - 2) / critGoal);
        double after =
                Math.abs(
                        equalized.values().get("DAMAGE_REDUCTION") / redGoal
                                - (equalized.values().get("CRITICAL_CHANCE") - 2) / critGoal);
        assertTrue(after < before, ordinary + " -> " + equalized);
        assertTrue(
                equalized.values().get("CRITICAL_CHANCE")
                        > ordinary.values().get("CRITICAL_CHANCE"));
        assertEquals(6, result.ceilings().size());
        assertTrue(result.ceilings().stream().allMatch(token -> token.level() <= 11));
        assertEquals(
                result.equipment(),
                balanced.project(fixture.stage(), tokens, () -> {}).equipment());
        assertTrue(attempts.get() < 1000);
        assertTrue(
                fixture.stage().equipment().getSlots().values().stream()
                        .allMatch(slot -> slot.getDrifIds().isEmpty()));
    }

    @Test
    void negativeManaUsageIsProgressAndBudgetInterruptionDoesNotMutateInputs() {
        var fixture = fixture(DRIF_BONUS_TYPE.MANA_USAGE_REDUCTION);
        var tokens = fixture.transitions().equipped(fixture.target());
        var balanced = balanced(fixture);
        var result = balanced.project(fixture.stage(), tokens, () -> {});
        var stats = fixture.calculate().apply(result.equipment());
        assertTrue(stats.values().get("MANA_USAGE_REDUCTION") < 0);
        assertTrue(stats.values().get("CRITICAL_CHANCE") > 2);
        assertThrows(
                IllegalStateException.class,
                () ->
                        balanced.project(
                                fixture.stage(),
                                tokens,
                                () -> {
                                    throw new IllegalStateException("budget");
                                }));
        assertTrue(tokens.stream().allMatch(token -> token.level() == 11));
        assertTrue(
                fixture.stage().equipment().getSlots().values().stream()
                        .allMatch(slot -> slot.getDrifIds().isEmpty()));
    }

    private ProgressionBalancedCandidates balanced(Fixture fixture) {
        return new ProgressionBalancedCandidates(
                fixture.context(),
                placement,
                levels,
                fixture.transitions(),
                fixture.calculate(),
                fixture.target(),
                fixture.transitions().equipped(fixture.target()));
    }

    private Fixture fixture(DRIF_BONUS_TYPE first) {
        var items = new LinkedHashMap<Long, ItemTemplate>();
        var stage = new EquipmentRequest();
        stage.setSlots(new LinkedHashMap<>());
        stage.setCharacterStats(Map.of());
        var target = new EquipmentRequest();
        target.setSlots(new LinkedHashMap<>());
        target.setCharacterStats(Map.of());
        int index = 0;
        for (String key : List.of("armor", "boots", "helmet")) {
            for (boolean endgame : List.of(false, true)) {
                long id = ++index;
                var item =
                        ItemTemplate.builder()
                                .id(id)
                                .name(key + id)
                                .category(ITEM_CATEGORY.valueOf(key.toUpperCase(Locale.ROOT)))
                                .tier("IV")
                                .rarity(RARITY.RARE)
                                .reqLevel(1)
                                .capacity(endgame ? 16 : 8)
                                .stats(Map.of())
                                .classScope(ITEM_CLASS_SCOPE.UNIVERSAL)
                                .build();
                items.put(id, item);
                var slot = ProgressionEquipmentSequence.emptySlot();
                slot.setItemId(id);
                slot.setItemStars(1);
                if (endgame) {
                    slot.setDrifIds(List.of(101L, 102L));
                    slot.setDrifLevels(Map.of("0", 11, "1", 11));
                }
                (endgame ? target : stage).getSlots().put(key, slot);
            }
        }
        boolean negative = first == DRIF_BONUS_TYPE.MANA_USAGE_REDUCTION;
        var drifs =
                Map.of(
                        101L,
                        DrifTemplate.builder()
                                .id(101L)
                                .name("First")
                                .size(DRIF_SIZE.BIDRIF)
                                .bonusType(first)
                                .category(
                                        negative ? DRIF_CATEGORY.UTILITY : DRIF_CATEGORY.DEFENSIVE)
                                .baseValue(negative ? "-1%" : "1%")
                                .increment(negative ? "-1%" : "1%")
                                .build(),
                        102L,
                        DrifTemplate.builder()
                                .id(102L)
                                .name("Critical")
                                .size(DRIF_SIZE.BIDRIF)
                                .bonusType(DRIF_BONUS_TYPE.CRITICAL_CHANCE)
                                .category(DRIF_CATEGORY.OFFENSIVE)
                                .baseValue("1%")
                                .increment("1%")
                                .build());
        var context = new CalculationContext(items, Map.of(), drifs);
        return new Fixture(
                context,
                new ProgressionTransition(context, new ProgressionDrifReplayService(placement)),
                calculator.prepareNumericCalculation(items, Map.of(), drifs),
                new ProgressionStage("middle", 60, stage),
                target);
    }

    private record Fixture(
            CalculationContext context,
            ProgressionTransition transitions,
            Function<EquipmentRequest, NumericStats> calculate,
            ProgressionStage stage,
            EquipmentRequest target) {}
}
