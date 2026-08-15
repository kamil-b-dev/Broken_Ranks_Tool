package pl.brokenranks.tool.broken_ranks_tool.equipment.service.calculator.processor;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.ITEM_STAR;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.RESISTANCE_STAT_TYPE;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.SPECIAL_STAT_TYPE;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.calculator.random.RandomProvider;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.ItemTemplate;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.calculator.CalculationState;

import java.util.HashMap;
import java.util.Map;

/** Calculates item base statistics, star modifiers, and bonus-point distribution. */
@Component
@RequiredArgsConstructor
public class ItemStatProcessor {
    private final RandomProvider randomProvider;

    /** Calculates the final drif modifier from item stars and built-in bonuses. */
    public double calculateFinalDrifMod(ItemTemplate item, int starLevel) {
        ITEM_STAR starMod = ITEM_STAR.fromLevel(starLevel);
        double baseStarDrifMod = starMod.getDrifMod();
        double itemDatabaseDrifBonus = 0.0;

        if (item.getStats() != null && item.getStats().containsKey(SPECIAL_STAT_TYPE.DRIF_BONUS.getDescription())) {
            itemDatabaseDrifBonus = item.getStats().get(SPECIAL_STAT_TYPE.DRIF_BONUS.getDescription()) / 100.0;
        }

        return baseStarDrifMod + itemDatabaseDrifBonus;
    }

    /** Processes item statistics and distributes the bonus pool across base stats. */
    public void process(ItemTemplate item, int starLevel, CalculationState state) {
        if (item.getStats() == null || item.getStats().isEmpty()) {
            return;
        }

        ITEM_STAR starMod = ITEM_STAR.fromLevel(starLevel);
        double statMod = starMod.getStatsMod();

        if (statMod == 0.0) {
            item.getStats().forEach((statName, statValue) ->
                    state.getAccumulator().addFlatValue(statName, statValue));
            return;
        }

        Map<String, Integer> baseStats = new HashMap<>();
        Map<String, Integer> baseResists = new HashMap<>();

        item.getStats().forEach((statName, statValue) -> {
            if (SPECIAL_STAT_TYPE.fromDescription(statName).isPresent()) {
                state.getAccumulator().addFlatValue(statName, statValue);
            } else if (RESISTANCE_STAT_TYPE.fromDescription(statName).isPresent()) {
                baseResists.put(statName, statValue.intValue());
            } else {
                baseStats.put(statName, statValue.intValue());
            }
        });

        state.getAccumulator().distributeRandomly(baseStats, statMod, randomProvider);
        state.getAccumulator().distributeRandomly(baseResists, statMod, randomProvider);
    }
}
