package pl.brokenranks.tool.broken_ranks_tool.equipment.service.impl.processor;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import pl.brokenranks.tool.broken_ranks_tool.core.enums.ITEM_STAR;
import pl.brokenranks.tool.broken_ranks_tool.core.enums.RESISTANCE_STAT_TYPE;
import pl.brokenranks.tool.broken_ranks_tool.core.enums.SPECIAL_STAT_TYPE;
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

    /**
     * Oblicza finalny modyfikator dla drifów, sumując bonus z gwiazdek i ewentualny
     * bonus wbudowany w przedmiot.
     * @param item Szablon przedmiotu.
     * @param starLevel Poziom ulepszenia przedmiotu.
     * @return Finalny modyfikator procentowy dla drifów.
     */
    public double calculateFinalDrifMod(ItemTemplate item, int starLevel) {
        ITEM_STAR starMod = ITEM_STAR.fromLevel(starLevel);
        double baseStarDrifMod = starMod.getDrifMod();
        double itemDatabaseDrifBonus = 0.0;

        if (item.getStats() != null && item.getStats().containsKey(SPECIAL_STAT_TYPE.DRIF_BONUS.getDescription())) {
            itemDatabaseDrifBonus = item.getStats().get(SPECIAL_STAT_TYPE.DRIF_BONUS.getDescription()) / 100.0;
        }

        return baseStarDrifMod + itemDatabaseDrifBonus;
    }

    /**
     * Przetwarza statystyki przedmiotu, rozdzielając je na specjalne, odporności i bazowe,
     * a następnie losowo dystrybuuje pulę bonusową.
     * @param item Szablon przedmiotu.
     * @param starLevel Poziom ulepszenia przedmiotu.
     * @param state Aktualny stan obliczeń.
     */
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
