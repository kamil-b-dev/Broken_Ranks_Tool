package pl.brokenranks.tool.broken_ranks_tool.equipment.service.calculator.processor;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.util.Map;
import org.junit.jupiter.api.Test;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.ITEM_CATEGORY;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.RARITY;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.ItemTemplate;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.calculator.CalculationState;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.calculator.input.EquipmentDataProvider.CalculationContext;

class ItemStatProcessorTests {

    @Test
    void includesStarAndDatabaseDrifModifiers() {
        ItemStatProcessor processor = new ItemStatProcessor();
        ItemTemplate item = item(Map.of("Bonus drify", 20.0));

        assertEquals(0.28, processor.calculateFinalDrifMod(item, 8), 0.000001);
    }

    @Test
    void keepsSpecialStatsFlatAndAppliesStarBonusToBaseAndResistanceStats() {
        ItemStatProcessor processor = new ItemStatProcessor();
        ItemTemplate item =
                item(
                        Map.of(
                                "Bonus drify", 10.0,
                                "Siła", 10.0,
                                "Odporność ogień", 10.0));
        CalculationState state =
                new CalculationState(new CalculationContext(Map.of(), Map.of(), Map.of()));

        processor.process(item, 4, state);

        assertEquals(
                Map.of(
                        "Bonus drify", "10",
                        "Siła", "11",
                        "Odporność ogień", "11"),
                state.getAccumulator().getFormattedResults());
    }

    private ItemTemplate item(Map<String, Double> stats) {
        return ItemTemplate.builder()
                .id(1L)
                .name("Test XII")
                .category(ITEM_CATEGORY.HELMET)
                .rarity(RARITY.RARE)
                .tier("XII")
                .stats(stats)
                .build();
    }
}
