package pl.brokenranks.tool.broken_ranks_tool.optimization.engine.search.neighborhood;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.util.ArrayList;
import java.util.EnumMap;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_BONUS_TYPE;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_SIZE;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.ITEM_CATEGORY;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.RARITY;
import pl.brokenranks.tool.broken_ranks_tool.equipment.dto.EquipmentRequest;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.DrifTemplate;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.ItemTemplate;
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.OptimizationRequest;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.evaluation.OptimizationStateEvaluator;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model.BuildState;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model.OptimizationContext;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model.Placement;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model.SearchBudget;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model.SlotContext;

class OptimizationRepairGeneratorTests {
    private OptimizationStateEvaluator evaluator;
    private OptimizationNeighborhoodSupport support;

    @BeforeEach
    void setUp() {
        evaluator = mock(OptimizationStateEvaluator.class);
        support = mock(OptimizationNeighborhoodSupport.class);
        when(support.isSlotLocked(any(), any())).thenReturn(false);
        when(support.containsBonusExcept(any(), any(), anyInt())).thenReturn(false);
        when(support.isMovable(any(), any(), anyInt())).thenReturn(true);
        when(support.fittingLevels(any(), any(), any(), anyInt())).thenReturn(List.of(6));
        when(evaluator.minimumsSatisfied(any(), any())).thenReturn(true);
    }

    @Test
    void restoresMissingMinimumInAnotherCompatibleSlot() {
        DrifTemplate missing = drif(1L, DRIF_BONUS_TYPE.CRITICAL_CHANCE);
        SlotContext source = slot("source", 10L, missing);
        SlotContext destination = slot("destination", 11L, missing);
        OptimizationContext context = context(List.of(source, destination), request(0, 12));
        BuildState state = state(source, destination);
        List<BuildState> candidates = new ArrayList<>();

        new OptimizationMinimumRepairGenerator(evaluator, support)
                .addCandidates(
                        state,
                        new Placement(missing, 6, false),
                        source.key(),
                        context,
                        new OptimizationNeighborhoodSearchControl(10),
                        candidates);

        assertEquals(1, candidates.size());
        Placement repaired = candidates.getFirst().slots().get(destination.key()).getFirst();
        assertEquals(missing.getId(), repaired.drif().getId());
        assertEquals(6, repaired.level());
    }

    @Test
    void restoresForcedTargetBelowMaximum() {
        DrifTemplate target = drif(2L, DRIF_BONUS_TYPE.DAMAGE_MAGIC);
        SlotContext destination = slot("helmet", 12L, target);
        OptimizationRequest request = request(0, 1);
        request.setForcedPercentageTargets(Map.of(DRIF_BONUS_TYPE.DAMAGE_MAGIC, 10.0));
        OptimizationContext context = context(List.of(destination), request);
        BuildState state = state(destination);
        when(evaluator.globalCount(state, DRIF_BONUS_TYPE.DAMAGE_MAGIC, context)).thenReturn(0);
        List<BuildState> candidates = new ArrayList<>();

        forcedGenerator()
                .addCandidates(
                        state,
                        DRIF_BONUS_TYPE.DAMAGE_MAGIC,
                        context,
                        new OptimizationNeighborhoodSearchControl(10),
                        candidates);

        assertEquals(
                target.getId(),
                candidates.getFirst().slots().get("helmet").getFirst().drif().getId());
    }

    @Test
    void doesNotRepairForcedTargetAlreadyAtMaximum() {
        DrifTemplate target = drif(3L, DRIF_BONUS_TYPE.DAMAGE_MAGIC);
        SlotContext destination = slot("helmet", 13L, target);
        OptimizationContext context = context(List.of(destination), request(0, 1));
        BuildState state = state(destination);
        when(evaluator.globalCount(state, DRIF_BONUS_TYPE.DAMAGE_MAGIC, context)).thenReturn(1);
        List<BuildState> candidates = new ArrayList<>();

        forcedGenerator()
                .addCandidates(
                        state,
                        DRIF_BONUS_TYPE.DAMAGE_MAGIC,
                        context,
                        new OptimizationNeighborhoodSearchControl(10),
                        candidates);

        assertTrue(candidates.isEmpty());
    }

    private OptimizationForcedTargetRepairGenerator forcedGenerator() {
        return new OptimizationForcedTargetRepairGenerator(
                evaluator, support, new OptimizationMinimumRepairGenerator(evaluator, support));
    }

    private OptimizationRequest request(int min, int max) {
        OptimizationRequest request = new OptimizationRequest();
        request.setPriorities(Map.of(DRIF_BONUS_TYPE.DAMAGE_MAGIC, 10));
        request.setTargetQuantities(
                Map.of(
                        DRIF_BONUS_TYPE.DAMAGE_MAGIC,
                        new OptimizationRequest.QuantityRange(min, max)));
        request.setForceCapBonuses(Set.of());
        request.setMaximizeBonuses(Set.of());
        request.setLockedSlots(Set.of());
        request.setLockedDrifs(Map.of());
        return request;
    }

    private OptimizationContext context(List<SlotContext> slots, OptimizationRequest request) {
        return new OptimizationContext(
                request,
                Map.of(),
                Map.of(),
                slots,
                Map.of(0.0, slots),
                request.getPriorities().entrySet().stream().toList(),
                request.getTargetQuantities().entrySet().stream().toList(),
                new SearchBudget(10),
                new SearchBudget(10),
                new SearchBudget(10),
                new EnumMap<>(DRIF_BONUS_TYPE.class),
                new EnumMap<>(DRIF_BONUS_TYPE.class),
                new HashMap<>(),
                new HashMap<>(),
                new HashMap<>());
    }

    private BuildState state(SlotContext... slots) {
        BuildState state = new BuildState();
        for (SlotContext slot : slots) {
            List<Placement> placements = new ArrayList<>();
            placements.add(null);
            state.slots().put(slot.key(), placements);
        }
        return state;
    }

    private SlotContext slot(String key, Long itemId, DrifTemplate candidate) {
        ItemTemplate item =
                ItemTemplate.builder()
                        .id(itemId)
                        .name(key)
                        .category(ITEM_CATEGORY.HELMET)
                        .tier("XII")
                        .rarity(RARITY.RARE)
                        .capacity(20)
                        .stats(Map.of())
                        .build();
        EquipmentRequest.SlotData original = new EquipmentRequest.SlotData();
        original.setItemId(itemId);
        original.setItemStars(1);
        original.setDrifIds(List.of());
        original.setDrifLevels(Map.of());
        return new SlotContext(
                key,
                original,
                item,
                20,
                1,
                0.0,
                new ArrayList<>(List.of(candidate)),
                Set.of(),
                false);
    }

    private DrifTemplate drif(Long id, DRIF_BONUS_TYPE type) {
        return DrifTemplate.builder()
                .id(id)
                .name(type.name())
                .size(DRIF_SIZE.ARCYDRIF)
                .bonusType(type)
                .baseValue("1%")
                .increment("1%")
                .build();
    }
}
