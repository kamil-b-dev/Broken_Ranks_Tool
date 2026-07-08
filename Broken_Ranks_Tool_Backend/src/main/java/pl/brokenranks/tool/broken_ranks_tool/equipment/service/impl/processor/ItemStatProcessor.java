package pl.brokenranks.tool.broken_ranks_tool.equipment.service.impl.processor;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import pl.brokenranks.tool.broken_ranks_tool.core.constants.StatConstants;
import pl.brokenranks.tool.broken_ranks_tool.core.enums.ITEM_STAR;
import pl.brokenranks.tool.broken_ranks_tool.core.utils.RandomProvider;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.ItemTemplate;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.calculator.CalculationState;

import java.util.HashMap;
import java.util.Map;

/**
 * Przetwarza statystyki bazowe przedmiotu, uwzględniając modyfikatory z gwiazdek
 * oraz losową dystrybucję dodatkowych punktów statystyk.
 */
@Component
@RequiredArgsConstructor
public class ItemStatProcessor {
    private final RandomProvider randomProvider;

    public double calculateFinalDrifMod(ItemTemplate item, int starLevel) {
        ITEM_STAR starMod = ITEM_STAR.fromLevel(starLevel);
        double baseStarDrifMod = starMod.getDrifMod();
        double itemDatabaseDrifBonus = 0.0;

        if (item.getStats() != null && item.getStats().containsKey(StatConstants.DRIF_BONUS_STAT_NAME)) {
            itemDatabaseDrifBonus = ((Number) item.getStats().get(StatConstants.DRIF_BONUS_STAT_NAME)).doubleValue() / 100.0;
        }

        return baseStarDrifMod + itemDatabaseDrifBonus;
    }

    public void process(ItemTemplate item, int starLevel, CalculationState state) {
        if (item.getStats() == null || item.getStats().isEmpty()) {
            return;
        }

        ITEM_STAR starMod = ITEM_STAR.fromLevel(starLevel);
        double statMod = starMod.getStatsMod();

        if (statMod == 0.0) {
            item.getStats().forEach((statName, statValue) ->
                    state.getAccumulator().addFlatValue(statName, ((Number) statValue).doubleValue()));
            return;
        }

        Map<String, Integer> baseStats = new HashMap<>();
        Map<String, Integer> baseResists = new HashMap<>();

        item.getStats().forEach((statName, statValue) -> {
            if (isSpecialStat(statName)) {
                state.getAccumulator().addFlatValue(statName, ((Number) statValue).doubleValue());
            } else if (isResistanceStat(statName)) {
                baseResists.put(statName, ((Number) statValue).intValue());
            } else {
                baseStats.put(statName, ((Number) statValue).intValue());
            }
        });

        state.getAccumulator().distributeRandomly(baseStats, statMod, randomProvider);
        state.getAccumulator().distributeRandomly(baseResists, statMod, randomProvider);
    }

    private boolean isSpecialStat(String statName) {
        String lowerCaseStatName = statName.toLowerCase();
        return StatConstants.SPECIAL_STAT_KEYWORDS.stream().anyMatch(lowerCaseStatName::contains);
    }

    private boolean isResistanceStat(String statName) {
        return statName.toLowerCase().contains(StatConstants.RESISTANCE_KEYWORD);
    }
}
