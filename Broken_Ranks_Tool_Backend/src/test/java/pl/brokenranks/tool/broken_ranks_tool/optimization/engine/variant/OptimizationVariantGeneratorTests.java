package pl.brokenranks.tool.broken_ranks_tool.optimization.engine.variant;

import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.evaluation.OptimizationStateEvaluator;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.result.OptimizationResultAssembler;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.search.neighborhood.OptimizationLargeNeighborhoodSearch;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model.GeneratedOptimizationVariant;

import org.junit.jupiter.api.Test;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_BONUS_TYPE;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_SIZE;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.ITEM_CATEGORY;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.RARITY;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.rules.EquipmentRulesRegistry;
import pl.brokenranks.tool.broken_ranks_tool.equipment.dto.EquipmentRequest;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.DrifTemplate;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.ItemTemplate;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.EquipmentStatsCalculatorService;
import pl.brokenranks.tool.broken_ranks_tool.optimization.constraints.OptimizationLockService;
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.OptimizationRequest;

import java.util.ArrayList;
import java.util.EnumMap;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model.OptimizationSearchModel.*;

class OptimizationVariantGeneratorTests {

    @Test
    void selectsImprovementWithinConfiguredLossAndRejectsLargerLoss() {
        Fixture fixture = fixture(10);

        List<GeneratedOptimizationVariant> variants = fixture.generator.generate(
                fixture.main, fixture.context, List.of(fixture.main, fixture.acceptable));

        assertEquals(1, variants.size());
        assertEquals(DRIF_BONUS_TYPE.DAMAGE_MAGIC, variants.getFirst().focus());
        assertEquals(fixture.acceptable.signature(), variants.getFirst().state().signature());

        Fixture strict = fixture(0);
        List<GeneratedOptimizationVariant> strictVariants = strict.generator.generate(
                strict.main, strict.context, List.of(strict.main, strict.acceptable));
        assertTrue(strictVariants.isEmpty());
    }

    @Test
    void excludesStatesThatViolateQuantityMinimums() {
        Fixture fixture = fixture(100);
        BuildState invalid = fixture.acceptable.copy();
        invalid.setPlacement("defense", 0, null);

        List<GeneratedOptimizationVariant> variants = fixture.generator.generate(
                fixture.main, fixture.context, List.of(fixture.main, invalid));

        assertTrue(variants.stream().noneMatch(variant ->
                variant.state().signature().equals(invalid.signature())));
        assertTrue(variants.stream().allMatch(variant ->
                fixture.context.request().getTargetQuantities().entrySet().stream()
                        .allMatch(entry -> fixture.generatorStateCount(
                                variant.state(), entry.getKey()) >= entry.getValue().getMin())));
    }

    private Fixture fixture(int maxLossPercent) {
        EquipmentRulesRegistry rules = new EquipmentRulesRegistry();
        OptimizationStateEvaluator evaluator = new OptimizationStateEvaluator(rules);
        DrifTemplate magic = drif(1L, DRIF_BONUS_TYPE.DAMAGE_MAGIC);
        DrifTemplate defense = drif(2L, DRIF_BONUS_TYPE.DEFENSE_MENTAL);
        ItemTemplate magicItem = item(1L, ITEM_CATEGORY.HELMET);
        ItemTemplate defenseItem = item(2L, ITEM_CATEGORY.ARMOR);
        EquipmentRequest.SlotData magicOriginal = slot(magicItem.getId());
        EquipmentRequest.SlotData defenseOriginal = slot(defenseItem.getId());

        OptimizationRequest request = new OptimizationRequest();
        request.setOriginalSlots(Map.of("magic", magicOriginal, "defense", defenseOriginal));
        request.setPriorities(Map.of(
                DRIF_BONUS_TYPE.DAMAGE_MAGIC, 30,
                DRIF_BONUS_TYPE.DEFENSE_MENTAL, 10));
        request.setTargetQuantities(Map.of(
                DRIF_BONUS_TYPE.DAMAGE_MAGIC, new OptimizationRequest.QuantityRange(1, 1),
                DRIF_BONUS_TYPE.DEFENSE_MENTAL, new OptimizationRequest.QuantityRange(1, 1)));
        request.setMaximizeBonuses(Set.of(DRIF_BONUS_TYPE.DAMAGE_MAGIC));
        request.setForceCapBonuses(Set.of());
        request.setLockedSlots(Set.of());
        request.setLockedDrifs(Map.of());
        request.setMaxVariantLossPercent(maxLossPercent);

        SlotContext magicSlot = new SlotContext("magic", magicOriginal, magicItem, 24, 1, 0.0,
                new ArrayList<>(List.of(magic)), Set.of(), false);
        SlotContext defenseSlot = new SlotContext("defense", defenseOriginal, defenseItem, 24, 1, 0.0,
                new ArrayList<>(List.of(defense)), Set.of(), false);
        OptimizationContext context = new OptimizationContext(request,
                Map.of(magicItem.getId(), magicItem, defenseItem.getId(), defenseItem),
                Map.of(magic.getId(), magic, defense.getId(), defense),
                List.of(magicSlot, defenseSlot), Map.of(0.0, List.of(magicSlot, defenseSlot)),
                request.getPriorities().entrySet().stream().toList(),
                request.getTargetQuantities().entrySet().stream().toList(),
                new SearchBudget(10), new SearchBudget(10), new SearchBudget(10),
                new EnumMap<>(DRIF_BONUS_TYPE.class), new EnumMap<>(DRIF_BONUS_TYPE.class),
                new HashMap<>(), new HashMap<>(), new HashMap<>());

        BuildState main = state(magic, 6, defense, 21);
        BuildState acceptable = state(magic, 11, defense, 16);
        EquipmentStatsCalculatorService calculator = mock(EquipmentStatsCalculatorService.class);
        when(calculator.calculateTotalStats(any())).thenAnswer(invocation -> {
            EquipmentRequest setup = invocation.getArgument(0);
            int magicLevel = setup.getSlots().get("magic").getDrifLevels().get("0");
            return magicLevel == 6
                    ? Map.of(DRIF_BONUS_TYPE.DAMAGE_MAGIC.name(), "10%",
                    DRIF_BONUS_TYPE.DEFENSE_MENTAL.name(), "100%")
                    : Map.of(DRIF_BONUS_TYPE.DAMAGE_MAGIC.name(), "20%",
                    DRIF_BONUS_TYPE.DEFENSE_MENTAL.name(), "95%");
        });
        OptimizationResultAssembler assembler = new OptimizationResultAssembler(
                new OptimizationLockService(), calculator, evaluator);
        OptimizationLargeNeighborhoodSearch search = new OptimizationLargeNeighborhoodSearch(
                rules, evaluator, assembler);
        return new Fixture(new OptimizationVariantGenerator(search, evaluator, assembler),
                context, main, acceptable);
    }

    private BuildState state(DrifTemplate magic, int magicLevel,
                             DrifTemplate defense, int defenseLevel) {
        BuildState state = new BuildState();
        state.slots().put("magic", new ArrayList<>(List.of(new Placement(magic, magicLevel, false))));
        state.slots().put("defense", new ArrayList<>(List.of(new Placement(defense, defenseLevel, false))));
        return state;
    }

    private DrifTemplate drif(Long id, DRIF_BONUS_TYPE type) {
        return DrifTemplate.builder().id(id).name(type.name()).size(DRIF_SIZE.ARCYDRIF)
                .bonusType(type).baseValue("2%").increment("0.5%").build();
    }

    private ItemTemplate item(Long id, ITEM_CATEGORY category) {
        return ItemTemplate.builder().id(id).name(category.name()).category(category).tier("XII")
                .rarity(RARITY.RARE).capacity(24).stats(Map.of()).build();
    }

    private EquipmentRequest.SlotData slot(Long itemId) {
        EquipmentRequest.SlotData slot = new EquipmentRequest.SlotData();
        slot.setItemId(itemId);
        slot.setItemStars(1);
        slot.setDrifIds(List.of());
        slot.setDrifLevels(Map.of());
        return slot;
    }

    private record Fixture(OptimizationVariantGenerator generator, OptimizationContext context,
                           BuildState main, BuildState acceptable) {

        private int generatorStateCount(BuildState state, DRIF_BONUS_TYPE type) {
            return (int) state.slots().values().stream().flatMap(List::stream)
                    .filter(java.util.Objects::nonNull)
                    .filter(placement -> placement.drif().getBonusType() == type)
                    .count();
        }
    }
}
