package pl.brokenranks.tool.broken_ranks_tool.equipment.service.impl.processor;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import pl.brokenranks.tool.broken_ranks_tool.core.enums.ITEM_STAR;
import pl.brokenranks.tool.broken_ranks_tool.core.utils.RandomProvider;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.ItemTemplate;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.calculator.CalculationState;

import java.util.HashMap;
import java.util.Map;

@Component
@RequiredArgsConstructor
public class ItemStatProcessor {

    private final RandomProvider randomProvider;

    public double calculateFinalDrifMod(ItemTemplate item, int starLevel) {
        ITEM_STAR starMod = ITEM_STAR.fromLevel(starLevel);
        double baseStarDrifMod = starMod.getDrifMod();
        double itemDatabaseDrifBonus = 0.0;

        if (item.getStats() != null && item.getStats().containsKey("Bonus drify")) {
            itemDatabaseDrifBonus = ((Number) item.getStats().get("Bonus drify")).doubleValue() / 100.0;
        }

        return baseStarDrifMod + itemDatabaseDrifBonus;
    }

    public void process(ItemTemplate item, int starLevel, CalculationState state) {
        if (item.getStats() == null || item.getStats().isEmpty()) return;

        ITEM_STAR starMod = ITEM_STAR.fromLevel(starLevel);
        double statMod = starMod.getStatsMod();

        if (statMod == 0.0) {
            item.getStats().forEach((stat, val) -> state.getAccumulator().addFlatValue(stat, ((Number) val).doubleValue()));
            return;
        }

        Map<String, Integer> baseStats = new HashMap<>();
        Map<String, Integer> baseResists = new HashMap<>();

        item.getStats().forEach((k, v) -> {
            String keyLower = k.toLowerCase();
            if (keyLower.contains("bonus") || keyLower.contains("drif") || keyLower.contains("orb") || keyLower.contains("pojemność")) {
                state.getAccumulator().addFlatValue(k, ((Number) v).doubleValue());
            } else {
                if (keyLower.contains("odp")) baseResists.put(k, ((Number) v).intValue());
                else baseStats.put(k, ((Number) v).intValue());
            }
        });

        state.getAccumulator().distributeRandomly(baseStats, statMod, randomProvider);
        state.getAccumulator().distributeRandomly(baseResists, statMod, randomProvider);
    }
}