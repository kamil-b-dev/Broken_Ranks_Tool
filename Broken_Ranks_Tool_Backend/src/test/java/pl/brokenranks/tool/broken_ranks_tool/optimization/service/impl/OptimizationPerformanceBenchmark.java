package pl.brokenranks.tool.broken_ranks_tool.optimization.service.impl;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.util.ArrayList;
import java.util.Arrays;
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
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.validator.EquipmentValidator;
import pl.brokenranks.tool.broken_ranks_tool.optimization.constraints.OptimizationLockService;
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.OptimizationRequest;
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.OptimizationResponse;

/**
 * Repeatable optimizer microbenchmark. It is intentionally excluded from the default
 * Surefire naming patterns. Run it explicitly with:
 * {@code mvnw.cmd -Dtest=OptimizationPerformanceBenchmark test}.
 */
class OptimizationPerformanceBenchmark {

    private static final int WARMUP_RUNS = 1;
    private static final int MEASURED_RUNS = 5;
    private static final List<Map.Entry<String, ITEM_CATEGORY>> ALL_SLOTS =
            List.of(
                    Map.entry("helmet", ITEM_CATEGORY.HELMET),
                    Map.entry("armor", ITEM_CATEGORY.ARMOR),
                    Map.entry("cape", ITEM_CATEGORY.CAPE),
                    Map.entry("legs", ITEM_CATEGORY.LEGS),
                    Map.entry("boots", ITEM_CATEGORY.BOOTS),
                    Map.entry("gloves", ITEM_CATEGORY.GLOVES),
                    Map.entry("belt", ITEM_CATEGORY.BELT),
                    Map.entry("weapon", ITEM_CATEGORY.WEAPON_2H),
                    Map.entry("ring1", ITEM_CATEGORY.RING),
                    Map.entry("ring2", ITEM_CATEGORY.RING),
                    Map.entry("necklace", ITEM_CATEGORY.NECKLACE));
    private static final List<DRIF_BONUS_TYPE> ALL_TYPES =
            List.of(
                    DRIF_BONUS_TYPE.DAMAGE_MAGIC,
                    DRIF_BONUS_TYPE.HIT_CHANCE_RANGED,
                    DRIF_BONUS_TYPE.CRITICAL_CHANCE,
                    DRIF_BONUS_TYPE.DEFENSE_MENTAL,
                    DRIF_BONUS_TYPE.DEFENSE_RANGE,
                    DRIF_BONUS_TYPE.CC_PROTECTION,
                    DRIF_BONUS_TYPE.MANA_REGEN,
                    DRIF_BONUS_TYPE.STAMINA_REGEN,
                    DRIF_BONUS_TYPE.DOUBLE_ATTACK_CHANCE);

    @Test
    void benchmarkRepresentativeSearchSizes() {
        System.out.println(
                "OPTIMIZER_BENCHMARK scenario,slots,bonuses,variants,p50_ms,p95_ms,min_ms,max_ms");
        benchmark("small", 3, 4, false);
        benchmark("standard", 7, 6, false);
        benchmark("full", 11, 9, false);
        benchmark("full_with_variants", 11, 9, true);
    }

    private void benchmark(String name, int slotCount, int bonusCount, boolean variants) {
        Scenario scenario = scenario(slotCount, bonusCount, variants);
        for (int index = 0; index < WARMUP_RUNS; index++) {
            assertValid(scenario.service.optimize(scenario.request));
        }

        double[] samples = new double[MEASURED_RUNS];
        for (int index = 0; index < MEASURED_RUNS; index++) {
            long started = System.nanoTime();
            OptimizationResponse response = scenario.service.optimize(scenario.request);
            samples[index] = (System.nanoTime() - started) / 1_000_000.0;
            assertValid(response);
        }
        Arrays.sort(samples);
        double p50 = percentile(samples, 0.50);
        double p95 = percentile(samples, 0.95);
        System.out.printf(
                java.util.Locale.ROOT,
                "OPTIMIZER_BENCHMARK %s,%d,%d,%s,%.2f,%.2f,%.2f,%.2f%n",
                name,
                slotCount,
                bonusCount,
                variants,
                p50,
                p95,
                samples[0],
                samples[samples.length - 1]);
    }

    private Scenario scenario(int slotCount, int bonusCount, boolean variants) {
        List<ItemTemplate> items = new ArrayList<>();
        Map<String, EquipmentRequest.SlotData> slots = new LinkedHashMap<>();
        for (int index = 0; index < slotCount; index++) {
            Map.Entry<String, ITEM_CATEGORY> definition = ALL_SLOTS.get(index);
            ItemTemplate item =
                    ItemTemplate.builder()
                            .id((long) index + 1)
                            .name("Benchmark " + definition.getKey())
                            .category(definition.getValue())
                            .tier("XII")
                            .rarity(RARITY.RARE)
                            .capacity(24)
                            .stats(Map.of())
                            .build();
            items.add(item);
            slots.put(definition.getKey(), emptySlot(item.getId()));
        }
        List<DrifTemplate> drifs = new ArrayList<>();
        Map<DRIF_BONUS_TYPE, Integer> priorities = new LinkedHashMap<>();
        Map<DRIF_BONUS_TYPE, OptimizationRequest.QuantityRange> quantities = new LinkedHashMap<>();
        for (int index = 0; index < bonusCount; index++) {
            DRIF_BONUS_TYPE type = ALL_TYPES.get(index);
            drifs.add(
                    DrifTemplate.builder()
                            .id((long) index + 100)
                            .name(type.name())
                            .size(DRIF_SIZE.ARCYDRIF)
                            .bonusType(type)
                            .baseValue((2.0 + index * 0.1) + "%")
                            .increment("0.5%")
                            .build());
            priorities.put(type, 30 - index * 2);
            quantities.put(
                    type,
                    new OptimizationRequest.QuantityRange(
                            index < 2 ? 1 : 0, Math.min(4, slotCount)));
        }
        OptimizationRequest request = new OptimizationRequest();
        request.setOriginalSlots(slots);
        request.setPriorities(priorities);
        request.setTargetQuantities(quantities);
        request.setLockedSlots(Set.of());
        request.setLockedDrifs(Map.of());
        request.setForceCapBonuses(Set.of());
        request.setMaximizeBonuses(Set.of(ALL_TYPES.getFirst()));
        request.setGenerateVariants(variants);
        request.setMaxVariantLossPercent(5);

        DrifTemplateRepository drifRepository = mock(DrifTemplateRepository.class);
        ItemTemplateRepository itemRepository = mock(ItemTemplateRepository.class);
        ItemStatProcessor itemStatProcessor = mock(ItemStatProcessor.class);
        EquipmentStatsCalculatorService calculator = mock(EquipmentStatsCalculatorService.class);
        when(drifRepository.findAll()).thenReturn(drifs);
        when(itemRepository.findAllById(any())).thenReturn(items);
        when(itemStatProcessor.calculateFinalDrifMod(any(), anyInt())).thenReturn(0.0);
        when(calculator.calculateTotalStats(any())).thenReturn(Map.of());
        EquipmentRulesRegistry rules = new EquipmentRulesRegistry();
        CustomModsOptimizationServiceImpl service =
                new CustomModsOptimizationServiceImpl(
                        drifRepository,
                        itemRepository,
                        new EquipmentValidator(rules),
                        rules,
                        itemStatProcessor,
                        new OptimizationLockService(),
                        calculator);
        return new Scenario(service, request);
    }

    private EquipmentRequest.SlotData emptySlot(Long itemId) {
        EquipmentRequest.SlotData slot = new EquipmentRequest.SlotData();
        slot.setItemId(itemId);
        slot.setItemStars(1);
        slot.setDrifIds(List.of());
        slot.setDrifLevels(Map.of());
        return slot;
    }

    private double percentile(double[] sorted, double percentile) {
        int index = (int) Math.ceil(percentile * sorted.length) - 1;
        return sorted[Math.max(0, Math.min(index, sorted.length - 1))];
    }

    private void assertValid(OptimizationResponse response) {
        assertNotNull(response);
        assertNotNull(response.getOptimizedSetup());
        assertNotNull(response.getSummary());
    }

    private record Scenario(
            CustomModsOptimizationServiceImpl service, OptimizationRequest request) {}
}
