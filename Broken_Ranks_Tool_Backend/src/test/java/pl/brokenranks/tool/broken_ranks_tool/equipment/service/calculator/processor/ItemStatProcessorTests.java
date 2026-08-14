package pl.brokenranks.tool.broken_ranks_tool.equipment.service.calculator.processor;

import org.junit.jupiter.api.Test;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.ITEM_CATEGORY;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.RARITY;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.ItemTemplate;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.calculator.CalculationState;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.calculator.random.RandomProvider;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.provider.EquipmentDataProvider.CalculationContext;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;

class ItemStatProcessorTests {

    private final RandomProvider firstKeyProvider = new RandomProvider() {
        @Override
        public int nextInt(int bound) {
            return 0;
        }

        @Override
        public double nextDouble() {
            return 0.0;
        }
    };

    @Test
    void includesStarAndDatabaseDrifModifiers() {
        ItemStatProcessor processor = new ItemStatProcessor(firstKeyProvider);
        ItemTemplate item = item(Map.of("Bonus drify", 20.0));

        assertEquals(0.28, processor.calculateFinalDrifMod(item, 8), 0.000001);
    }

    @Test
    void keepsSpecialStatsFlatAndAppliesStarBonusToBaseAndResistanceStats() {
        ItemStatProcessor processor = new ItemStatProcessor(firstKeyProvider);
        ItemTemplate item = item(Map.of(
                "Bonus drify", 10.0,
                "Siła", 10.0,
                "Odporność ogień", 10.0
        ));
        CalculationState state = new CalculationState(new CalculationContext(Map.of(), Map.of(), Map.of()));

        processor.process(item, 4, state);

        assertEquals(Map.of(
                "Bonus drify", "10",
                "Siła", "11",
                "Odporność ogień", "11"
        ), state.getAccumulator().getFormattedResults());
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
