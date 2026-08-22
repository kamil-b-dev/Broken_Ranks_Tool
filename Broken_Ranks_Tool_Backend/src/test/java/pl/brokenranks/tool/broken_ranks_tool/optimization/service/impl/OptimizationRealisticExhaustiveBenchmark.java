package pl.brokenranks.tool.broken_ranks_tool.optimization.service.impl;

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
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.validator.EquipmentValidator;
import pl.brokenranks.tool.broken_ranks_tool.optimization.constraints.OptimizationLockService;
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.OptimizationRequest;
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.OptimizationResponse;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * Exact comparison on a multi-slot build. The class name intentionally excludes it
 * from normal Surefire discovery. Run with
 * {@code mvnw.cmd -Dtest=OptimizationRealisticExhaustiveBenchmark test}.
 */
class OptimizationRealisticExhaustiveBenchmark {

    private static final List<Map.Entry<String, ITEM_CATEGORY>> SLOT_DEFINITIONS = List.of(
            Map.entry("helmet", ITEM_CATEGORY.HELMET),
            Map.entry("armor", ITEM_CATEGORY.ARMOR),
            Map.entry("cape", ITEM_CATEGORY.CAPE),
            Map.entry("legs", ITEM_CATEGORY.LEGS),
            Map.entry("boots", ITEM_CATEGORY.BOOTS),
            Map.entry("gloves", ITEM_CATEGORY.GLOVES),
            Map.entry("belt", ITEM_CATEGORY.BELT));
    private static final List<DRIF_BONUS_TYPE> TYPES = List.of(
            DRIF_BONUS_TYPE.DAMAGE_MAGIC,
            DRIF_BONUS_TYPE.HIT_CHANCE_RANGED,
            DRIF_BONUS_TYPE.CRITICAL_CHANCE,
            DRIF_BONUS_TYPE.DEFENSE_MENTAL);
    private static final int CAPACITY_PER_SLOT = 8;
    private static final double COMPARISON_TOLERANCE = 0.000_001;

    @Test
    void comparesHeuristicWithMillionsOfExactConfigurations() {
        Scenario scenario = scenario();

        long heuristicStarted = System.nanoTime();
        OptimizationResponse response = scenario.service.optimize(scenario.request);
        double heuristicMs = elapsedMillis(heuristicStarted);
        assertNotNull(response.getOptimizedSetup());
        ExactProfile heuristic = profileOf(response.getOptimizedSetup(), scenario);

        long exactStarted = System.nanoTime();
        ExactSearch exactSearch = new ExactSearch(scenario);
        ExactProfile exact = exactSearch.findBest();
        double exactMs = elapsedMillis(exactStarted);

        System.out.printf(java.util.Locale.ROOT,
                "OPTIMIZER_EXACT configurations=%d heuristic_ms=%.2f exact_ms=%.2f "
                        + "heuristic_utility=%.6f exact_utility=%.6f%n",
                exactSearch.examined, heuristicMs, exactMs,
                heuristic.weightedUtility, exact.weightedUtility);
        assertEquals(0, compare(exact, heuristic),
                () -> "Heurystyka nie osiągnęła ścisłego optimum. heuristic="
                        + heuristic + ", exact=" + exact);
    }

    private Scenario scenario() {
        List<ItemTemplate> items = new ArrayList<>();
        Map<String, EquipmentRequest.SlotData> slots = new LinkedHashMap<>();
        double[] drifBonuses = {0.00, 0.05, 0.10, 0.15, 0.20, 0.25, 0.30};
        Map<Long, Double> bonusByItem = new LinkedHashMap<>();
        for (int index = 0; index < SLOT_DEFINITIONS.size(); index++) {
            Map.Entry<String, ITEM_CATEGORY> definition = SLOT_DEFINITIONS.get(index);
            ItemTemplate item = ItemTemplate.builder().id((long) index + 1)
                    .name("Exact " + definition.getKey()).category(definition.getValue())
                    .tier("XII").rarity(RARITY.RARE).capacity(CAPACITY_PER_SLOT)
                    .stats(Map.of()).build();
            items.add(item);
            slots.put(definition.getKey(), emptySlot(item.getId()));
            bonusByItem.put(item.getId(), drifBonuses[index]);
        }
        List<DrifTemplate> drifs = List.of(
                drif(100L, TYPES.get(0), 3.0, 0.55),
                drif(101L, TYPES.get(1), 2.5, 0.45),
                drif(102L, TYPES.get(2), 2.0, 0.40),
                drif(103L, TYPES.get(3), 3.5, 0.60));
        Map<DRIF_BONUS_TYPE, Integer> priorities = new LinkedHashMap<>();
        priorities.put(TYPES.get(0), 30);
        priorities.put(TYPES.get(1), 24);
        priorities.put(TYPES.get(2), 18);
        priorities.put(TYPES.get(3), 12);
        Map<DRIF_BONUS_TYPE, OptimizationRequest.QuantityRange> quantities = new LinkedHashMap<>();
        quantities.put(TYPES.get(0), new OptimizationRequest.QuantityRange(2, 4));
        quantities.put(TYPES.get(1), new OptimizationRequest.QuantityRange(2, 4));
        quantities.put(TYPES.get(2), new OptimizationRequest.QuantityRange(1, 3));
        quantities.put(TYPES.get(3), new OptimizationRequest.QuantityRange(1, 4));

        OptimizationRequest request = new OptimizationRequest();
        request.setOriginalSlots(slots);
        request.setPriorities(priorities);
        request.setTargetQuantities(quantities);
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
        when(itemStatProcessor.calculateFinalDrifMod(any(), anyInt())).thenAnswer(invocation ->
                bonusByItem.getOrDefault(((ItemTemplate) invocation.getArgument(0)).getId(), 0.0));
        when(calculator.calculateTotalStats(any())).thenReturn(Map.of());
        EquipmentRulesRegistry rules = new EquipmentRulesRegistry();
        CustomModsOptimizationServiceImpl service = new CustomModsOptimizationServiceImpl(
                drifRepository, itemRepository, new EquipmentValidator(rules), rules,
                itemStatProcessor, new OptimizationLockService(), calculator);
        double[] values = drifs.stream()
                .mapToDouble(drif -> DrifOptimizationMath.calculateDrifValue(drif, 6)).toArray();
        int[] powers = drifs.stream().mapToInt(drif -> drif.getBonusType().getBasePower()).toArray();
        int[] weights = TYPES.stream().mapToInt(priorities::get).toArray();
        int[] minimums = TYPES.stream().mapToInt(type -> quantities.get(type).getMin()).toArray();
        int[] maximums = TYPES.stream().mapToInt(type -> quantities.get(type).getMax()).toArray();
        return new Scenario(service, request, rules, drifs, drifBonuses,
                values, powers, weights, minimums, maximums);
    }

    private ExactProfile profileOf(EquipmentRequest setup, Scenario scenario) {
        int[] counts = new int[TYPES.size()];
        double[] rawValues = new double[TYPES.size()];
        int totalPower = 0;
        for (int slotIndex = 0; slotIndex < SLOT_DEFINITIONS.size(); slotIndex++) {
            EquipmentRequest.SlotData slot = setup.getSlots().get(SLOT_DEFINITIONS.get(slotIndex).getKey());
            if (slot.getDrifIds() == null) continue;
            for (Long id : slot.getDrifIds()) {
                if (id == null) continue;
                int typeIndex = indexOfDrif(id, scenario.drifs);
                counts[typeIndex]++;
                rawValues[typeIndex] += scenario.values[typeIndex]
                        * (1.0 + scenario.drifBonuses[slotIndex]);
                totalPower += scenario.powers[typeIndex];
            }
        }
        return quality(counts, rawValues, totalPower, scenario);
    }

    private int indexOfDrif(Long id, List<DrifTemplate> drifs) {
        for (int index = 0; index < drifs.size(); index++) {
            if (drifs.get(index).getId().equals(id)) return index;
        }
        throw new IllegalArgumentException("Unknown drif " + id);
    }

    private ExactProfile quality(int[] counts, double[] rawValues, int totalPower,
                                 Scenario scenario) {
        double utility = 0.0;
        double penaltyLoss = 0.0;
        for (int type = 0; type < TYPES.size(); type++) {
            double penalty = scenario.rules.getDrifPenalty(counts[type]);
            utility += rawValues[type] * penalty * scenario.weights[type];
            penaltyLoss += Math.abs(rawValues[type]) * (1.0 - penalty);
        }
        return new ExactProfile(utility, penaltyLoss, totalPower,
                Arrays.copyOf(counts, counts.length));
    }

    private int compare(ExactProfile left, ExactProfile right) {
        int comparison = compareDouble(left.weightedUtility, right.weightedUtility);
        if (comparison != 0) return comparison;
        comparison = compareDouble(right.penaltyLoss, left.penaltyLoss);
        if (comparison != 0) return comparison;
        return Integer.compare(left.totalPower, right.totalPower);
    }

    private int compareDouble(double left, double right) {
        if (left > right + COMPARISON_TOLERANCE) return 1;
        if (left < right - COMPARISON_TOLERANCE) return -1;
        return 0;
    }

    private DrifTemplate drif(Long id, DRIF_BONUS_TYPE type, double base, double increment) {
        return DrifTemplate.builder().id(id).name(type.name()).size(DRIF_SIZE.SUBDRIF)
                .bonusType(type).baseValue(base + "%").increment(increment + "%").build();
    }

    private EquipmentRequest.SlotData emptySlot(Long itemId) {
        EquipmentRequest.SlotData slot = new EquipmentRequest.SlotData();
        slot.setItemId(itemId);
        slot.setItemStars(1);
        slot.setDrifIds(List.of());
        slot.setDrifLevels(Map.of());
        return slot;
    }

    private double elapsedMillis(long started) {
        return (System.nanoTime() - started) / 1_000_000.0;
    }

    private final class ExactSearch {
        private final Scenario scenario;
        private final List<Integer> validMasks;
        private final int[] counts = new int[TYPES.size()];
        private final double[] rawValues = new double[TYPES.size()];
        private int totalPower;
        private long examined;
        private ExactProfile best;

        private ExactSearch(Scenario scenario) {
            this.scenario = scenario;
            this.validMasks = validMasks(scenario.powers);
        }

        private ExactProfile findBest() {
            search(0);
            return best;
        }

        private void search(int slotIndex) {
            if (slotIndex == SLOT_DEFINITIONS.size()) {
                examined++;
                for (int type = 0; type < TYPES.size(); type++) {
                    if (counts[type] < scenario.minimums[type]
                            || counts[type] > scenario.maximums[type]) return;
                }
                ExactProfile candidate = quality(counts, rawValues, totalPower, scenario);
                if (best == null || compare(candidate, best) > 0) best = candidate;
                return;
            }
            for (int mask : validMasks) {
                apply(mask, slotIndex, 1);
                search(slotIndex + 1);
                apply(mask, slotIndex, -1);
            }
        }

        private void apply(int mask, int slotIndex, int direction) {
            for (int type = 0; type < TYPES.size(); type++) {
                if ((mask & (1 << type)) == 0) continue;
                counts[type] += direction;
                rawValues[type] += direction * scenario.values[type]
                        * (1.0 + scenario.drifBonuses[slotIndex]);
                totalPower += direction * scenario.powers[type];
            }
        }

        private List<Integer> validMasks(int[] powers) {
            List<Integer> result = new ArrayList<>();
            for (int mask = 0; mask < (1 << TYPES.size()); mask++) {
                if (Integer.bitCount(mask) > 3) continue;
                int power = 0;
                for (int type = 0; type < TYPES.size(); type++) {
                    if ((mask & (1 << type)) != 0) power += powers[type];
                }
                if (power <= CAPACITY_PER_SLOT) result.add(mask);
            }
            return result;
        }
    }

    private record Scenario(CustomModsOptimizationServiceImpl service,
                            OptimizationRequest request,
                            EquipmentRulesRegistry rules,
                            List<DrifTemplate> drifs,
                            double[] drifBonuses,
                            double[] values,
                            int[] powers,
                            int[] weights,
                            int[] minimums,
                            int[] maximums) { }

    private record ExactProfile(double weightedUtility, double penaltyLoss,
                                int totalPower, int[] counts) {
        @Override
        public String toString() {
            return "ExactProfile[weightedUtility=" + weightedUtility
                    + ", penaltyLoss=" + penaltyLoss + ", totalPower=" + totalPower
                    + ", counts=" + Arrays.toString(counts) + "]";
        }
    }
}
