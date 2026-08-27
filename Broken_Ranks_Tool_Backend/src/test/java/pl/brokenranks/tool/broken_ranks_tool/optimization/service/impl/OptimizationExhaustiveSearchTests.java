package pl.brokenranks.tool.broken_ranks_tool.optimization.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model.OptimizationSearchModel.*;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.junit.jupiter.api.Test;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_BONUS_TYPE;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_SIZE;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.ITEM_CATEGORY;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.RARITY;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.rules.EquipmentRulesRegistry;
import pl.brokenranks.tool.broken_ranks_tool.equipment.dto.EquipmentRequest;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.DrifTemplate;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.ItemTemplate;
import pl.brokenranks.tool.broken_ranks_tool.equipment.persistence.repository.DrifTemplateRepository;
import pl.brokenranks.tool.broken_ranks_tool.equipment.persistence.repository.ItemTemplateRepository;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.EquipmentStatsCalculatorService;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.calculator.processor.ItemStatProcessor;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.validator.EquipmentPlacementRules;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.validator.UpgradeLevelPolicy;
import pl.brokenranks.tool.broken_ranks_tool.optimization.constraints.OptimizationLockService;
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.OptimizationRequest;
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.OptimizationResponse;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.context.OptimizationContextFactory;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.evaluation.OptimizationStateEvaluator;

/** Compares the production heuristic with an exact oracle on small search spaces. */
class OptimizationExhaustiveSearchTests {

    @Test
    void matchesExhaustiveOptimumAcrossSmallPriorityAndQuantityProfiles() {
        for (ScenarioDefinition definition :
                List.of(
                        new ScenarioDefinition(30, 10, 0, 3, 0, 3),
                        new ScenarioDefinition(10, 30, 0, 3, 0, 3),
                        new ScenarioDefinition(30, 20, 1, 2, 1, 2),
                        new ScenarioDefinition(20, 20, 1, 1, 0, 2))) {
            Scenario scenario = scenario(definition);

            OptimizationResponse response = scenario.service.optimize(scenario.request);
            BuildState heuristic = toState(response.getOptimizedSetup(), scenario.context);
            BuildState exact = exhaustiveBest(scenario.context, scenario.evaluator);

            assertFalse(
                    scenario.evaluator.isBetterState(exact, heuristic, scenario.context),
                    () ->
                            "Heurystyka przegrała z optimum: "
                                    + definition
                                    + ", heuristic="
                                    + heuristic.signature()
                                    + ", exact="
                                    + exact.signature());
            assertEquals(
                    scenario.evaluator.score(exact, scenario.context),
                    scenario.evaluator.score(heuristic, scenario.context),
                    0.0001,
                    () -> "Inna wartość funkcji celu dla " + definition);
        }
    }

    private BuildState exhaustiveBest(
            OptimizationContext context, OptimizationStateEvaluator evaluator) {
        List<BuildState> states = new ArrayList<>();
        enumerate(context, 0, new BuildState(), states);
        return states.stream()
                .filter(state -> evaluator.minimumsSatisfied(state, context))
                .min(evaluator.stateComparator(context))
                .orElseThrow();
    }

    private void enumerate(
            OptimizationContext context,
            int slotIndex,
            BuildState partial,
            List<BuildState> states) {
        if (slotIndex == context.slots().size()) {
            states.add(partial.copy());
            return;
        }
        SlotContext slot = context.slots().get(slotIndex);
        List<Placement> empty = new ArrayList<>();
        empty.add(null);
        partial.slots().put(slot.key(), empty);
        enumerate(context, slotIndex + 1, partial, states);
        for (DrifTemplate candidate : slot.candidates()) {
            partial.slots()
                    .put(
                            slot.key(),
                            new ArrayList<>(
                                    List.of(
                                            new Placement(
                                                    candidate,
                                                    candidate.getSize().getMaxLevel(),
                                                    false))));
            enumerate(context, slotIndex + 1, partial, states);
        }
        partial.slots().remove(slot.key());
    }

    private BuildState toState(EquipmentRequest setup, OptimizationContext context) {
        BuildState state = new BuildState();
        for (SlotContext slot : context.slots()) {
            EquipmentRequest.SlotData result = setup.getSlots().get(slot.key());
            List<Placement> placements = new ArrayList<>();
            for (int index = 0; index < slot.maxDrifs(); index++) {
                Long id =
                        result.getDrifIds() != null && index < result.getDrifIds().size()
                                ? result.getDrifIds().get(index)
                                : null;
                DrifTemplate drif = id != null ? context.drifs().get(id) : null;
                int level =
                        result.getDrifLevels() != null
                                ? result.getDrifLevels().getOrDefault(String.valueOf(index), 1)
                                : 1;
                placements.add(drif != null ? new Placement(drif, level, false) : null);
            }
            state.slots().put(slot.key(), placements);
        }
        return state;
    }

    private Scenario scenario(ScenarioDefinition definition) {
        List<Map.Entry<String, ITEM_CATEGORY>> slotDefinitions =
                List.of(
                        Map.entry("helmet", ITEM_CATEGORY.HELMET),
                        Map.entry("armor", ITEM_CATEGORY.ARMOR),
                        Map.entry("boots", ITEM_CATEGORY.BOOTS));
        List<ItemTemplate> items = new ArrayList<>();
        Map<String, EquipmentRequest.SlotData> originalSlots = new LinkedHashMap<>();
        for (int index = 0; index < slotDefinitions.size(); index++) {
            Map.Entry<String, ITEM_CATEGORY> slotDefinition = slotDefinitions.get(index);
            ItemTemplate item =
                    ItemTemplate.builder()
                            .id((long) index + 1)
                            .name(slotDefinition.getKey())
                            .category(slotDefinition.getValue())
                            .tier("I")
                            .rarity(RARITY.RARE)
                            .capacity(4)
                            .stats(Map.of())
                            .build();
            items.add(item);
            originalSlots.put(slotDefinition.getKey(), emptySlot(item.getId()));
        }
        DrifTemplate magic = drif(10L, DRIF_BONUS_TYPE.DAMAGE_MAGIC, "3%", "0.5%");
        DrifTemplate defense = drif(11L, DRIF_BONUS_TYPE.DEFENSE_MENTAL, "2%", "0.4%");
        List<DrifTemplate> drifs = List.of(magic, defense);

        OptimizationRequest request = new OptimizationRequest();
        request.setOriginalSlots(originalSlots);
        request.setPriorities(
                new LinkedHashMap<>(
                        Map.of(
                                DRIF_BONUS_TYPE.DAMAGE_MAGIC, definition.magicPriority,
                                DRIF_BONUS_TYPE.DEFENSE_MENTAL, definition.defensePriority)));
        request.setTargetQuantities(
                Map.of(
                        DRIF_BONUS_TYPE.DAMAGE_MAGIC,
                        new OptimizationRequest.QuantityRange(
                                definition.magicMin, definition.magicMax),
                        DRIF_BONUS_TYPE.DEFENSE_MENTAL,
                        new OptimizationRequest.QuantityRange(
                                definition.defenseMin, definition.defenseMax)));
        request.setLockedSlots(Set.of());
        request.setLockedDrifs(Map.of());
        request.setForceCapBonuses(Set.of());
        request.setMaximizeBonuses(Set.of());

        DrifTemplateRepository drifRepository = mock(DrifTemplateRepository.class);
        ItemTemplateRepository itemRepository = mock(ItemTemplateRepository.class);
        ItemStatProcessor itemStatProcessor = mock(ItemStatProcessor.class);
        EquipmentStatsCalculatorService calculator = mock(EquipmentStatsCalculatorService.class);
        when(drifRepository.findAll()).thenReturn(drifs);
        when(itemRepository.findAllById(any())).thenReturn(items);
        when(itemStatProcessor.calculateFinalDrifMod(any(), anyInt())).thenReturn(0.0);
        when(calculator.calculateTotalStats(any())).thenReturn(Map.of());
        EquipmentRulesRegistry rules = new EquipmentRulesRegistry();
        EquipmentPlacementRules placementRules = new EquipmentPlacementRules(rules);
        UpgradeLevelPolicy levelPolicy = new UpgradeLevelPolicy();
        OptimizationContextFactory contextFactory =
                new OptimizationContextFactory(
                        drifRepository,
                        itemRepository,
                        placementRules,
                        levelPolicy,
                        itemStatProcessor);
        OptimizationContext context = contextFactory.create(request, 55_000, 20_000, 25_000);
        CustomModsOptimizationServiceImpl service =
                new CustomModsOptimizationServiceImpl(
                        drifRepository,
                        itemRepository,
                        placementRules,
                        levelPolicy,
                        rules,
                        itemStatProcessor,
                        new OptimizationLockService(),
                        calculator);
        return new Scenario(service, request, context, new OptimizationStateEvaluator(rules));
    }

    private DrifTemplate drif(Long id, DRIF_BONUS_TYPE type, String base, String increment) {
        return DrifTemplate.builder()
                .id(id)
                .name(type.name())
                .size(DRIF_SIZE.SUBDRIF)
                .bonusType(type)
                .baseValue(base)
                .increment(increment)
                .build();
    }

    private EquipmentRequest.SlotData emptySlot(Long itemId) {
        EquipmentRequest.SlotData slot = new EquipmentRequest.SlotData();
        slot.setItemId(itemId);
        slot.setItemStars(1);
        slot.setDrifIds(List.of());
        slot.setDrifLevels(new HashMap<>());
        return slot;
    }

    private record Scenario(
            CustomModsOptimizationServiceImpl service,
            OptimizationRequest request,
            OptimizationContext context,
            OptimizationStateEvaluator evaluator) {}

    private record ScenarioDefinition(
            int magicPriority,
            int defensePriority,
            int magicMin,
            int magicMax,
            int defenseMin,
            int defenseMax) {}
}
