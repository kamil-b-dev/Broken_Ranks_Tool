package pl.brokenranks.tool.broken_ranks_tool.optimization.engine.context;

import static org.junit.jupiter.api.Assertions.*;

import java.util.*;
import org.junit.jupiter.api.Test;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.*;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.rules.EquipmentRulesRegistry;
import pl.brokenranks.tool.broken_ranks_tool.equipment.dto.EquipmentRequest;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.*;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.calculator.processor.ItemStatProcessor;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.validator.*;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model.OptimizationEngineFixture;

class OptimizationSlotContextFactoryTests {
    @Test
    void duplicateTemplatesChooseValueThenStableIdIndependentlyOfCatalogOrder() {
        var factory =
                new OptimizationSlotContextFactory(
                        new EquipmentPlacementRules(new EquipmentRulesRegistry()),
                        new UpgradeLevelPolicy(),
                        new ItemStatProcessor());
        var strong = OptimizationEngineFixture.drif(20, DRIF_BONUS_TYPE.CRITICAL_CHANCE);
        strong.setBaseValue("4%");
        var tie = OptimizationEngineFixture.drif(10, DRIF_BONUS_TYPE.CRITICAL_CHANCE);
        tie.setBaseValue("4%");
        var weak = OptimizationEngineFixture.drif(1, DRIF_BONUS_TYPE.CRITICAL_CHANCE);
        var item =
                ItemTemplate.builder()
                        .id(1L)
                        .category(ITEM_CATEGORY.HELMET)
                        .rarity(RARITY.RARE)
                        .tier("X")
                        .capacity(12)
                        .stats(Map.of())
                        .build();
        var slot = new EquipmentRequest.SlotData();
        slot.setItemId(1L);
        var request = OptimizationEngineFixture.request(DRIF_BONUS_TYPE.CRITICAL_CHANCE);
        request.setOriginalSlots(Map.of("helmet", slot));
        for (var order : List.of(List.of(weak, strong, tie), List.of(tie, strong, weak))) {
            var candidates = new LinkedHashMap<Long, DrifTemplate>();
            order.forEach(d -> candidates.put(d.getId(), d));
            var result = factory.createAll(request, Map.of(1L, item), candidates);
            assertEquals(
                    List.of(10L),
                    result.getFirst().candidates().stream().map(DrifTemplate::getId).toList());
            assertEquals(3, candidates.size());
        }
    }
}
