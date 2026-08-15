package pl.brokenranks.tool.broken_ranks_tool.equipment.service.calculator.processor;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import pl.brokenranks.tool.broken_ranks_tool.equipment.dto.EquipmentRequest;
import pl.brokenranks.tool.broken_ranks_tool.equipment.dto.EquipmentRequest.SlotData;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_BONUS_TYPE;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.DrifTemplate;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.ItemTemplate;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.calculator.CalculationState;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.provider.EquipmentDataProvider.CalculationContext;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.rules.EquipmentRulesRegistry;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.validator.EquipmentValidator;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;

/**
 * Przetwarza statystyki pochodzące z drifów, uwzględniając ich poziomy,
 * modyfikatory z przedmiotu oraz kary za powielanie tego samego typu bonusu.
 */
@Component
@RequiredArgsConstructor
public class DrifStatProcessor {

    private final EquipmentValidator validator;
    private final EquipmentRulesRegistry rules;

    public Map<DRIF_BONUS_TYPE, Integer> preCountDrifs(EquipmentRequest request, CalculationContext ctx) {
        Map<DRIF_BONUS_TYPE, Integer> counts = new HashMap<>();
        boolean elementalDamageAlreadyAssigned = false;

        for (Map.Entry<String, SlotData> entry : request.getSlots().entrySet()) {
            String slotKey = entry.getKey();
            SlotData slot = entry.getValue();

            if (slot.getItemId() == null || !ctx.items().containsKey(slot.getItemId())) continue;
            ItemTemplate item = ctx.items().get(slot.getItemId());
            if (!validator.isValidItem(item, slotKey)) continue;
            if (slot.getDrifIds() == null) continue;

            Set<DRIF_BONUS_TYPE> itemUniqueDrifs = new HashSet<>();
            for (Long drifId : slot.getDrifIds()) {
                if (drifId == null || !ctx.drifs().containsKey(drifId)) continue;
                DrifTemplate drif = ctx.drifs().get(drifId);

                if (!validator.isValidDrif(drif, slotKey)) continue;
                if (!validator.isElementalDrifPositionValid(drif, slotKey)) continue;

                if (validator.isElementalDamage(drif.getBonusType())) {
                    if (elementalDamageAlreadyAssigned) continue;
                    elementalDamageAlreadyAssigned = true;
                }

                if (!validator.isValidDrifSizeForTier(drif, item)) continue;
                if (itemUniqueDrifs.contains(drif.getBonusType())) continue;

                itemUniqueDrifs.add(drif.getBonusType());
                counts.merge(drif.getBonusType(), 1, Integer::sum);
            }
        }
        return counts;
    }

    public void process(String slotKey, SlotData slot, ItemTemplate item, double drifMod, CalculationState state) {
        if (slot.getDrifIds() == null) return;

        Set<DRIF_BONUS_TYPE> processedDrifsForItem = new HashSet<>();

        for (int i = 0; i < slot.getDrifIds().size(); i++) {
            Long drifId = slot.getDrifIds().get(i);
            if (drifId == null || !state.getContext().drifs().containsKey(drifId)) continue;
            DrifTemplate drif = state.getContext().drifs().get(drifId);

            if (!validator.isValidDrif(drif, slotKey)) continue;
            if (!validator.isElementalDrifPositionValid(drif, slotKey)) continue;
            if (!validator.isValidDrifSizeForTier(drif, item)) continue;

            if (processedDrifsForItem.contains(drif.getBonusType())) continue;
            processedDrifsForItem.add(drif.getBonusType());

            int requestedLvl = (slot.getDrifLevels() != null && slot.getDrifLevels().containsKey(String.valueOf(i)))
                    ? slot.getDrifLevels().get(String.valueOf(i)) : 1;

            int finalLvl = validator.sanitizeDrifLevel(requestedLvl, drif);

            int globalCountForThisDrif = state.getDrifCounts().getOrDefault(drif.getBonusType(), 1);
            double penaltyMultiplier = rules.getDrifPenalty(globalCountForThisDrif);

            String calculatedStatValue = calculateTotalDrifStat(drif.getBaseValue(), drif.getIncrement(), finalLvl);
            double finalMultiplier = (1.0 + drifMod) * penaltyMultiplier;

            state.getAccumulator().addRawValue(drif.getBonusType().name(), calculatedStatValue, finalMultiplier);
        }
    }

    private String calculateTotalDrifStat(String baseValueStr, String incrementStr, int level) {
        if (baseValueStr == null || incrementStr == null) return "0";
        boolean isPercentage = baseValueStr.contains("%") || incrementStr.contains("%");

        try {
            BigDecimal total = new BigDecimal(baseValueStr.replace(",", ".").replace("%", "").trim());
            BigDecimal increment = new BigDecimal(incrementStr.replace(",", ".").replace("%", "").trim());
            BigDecimal doubleIncrement = increment.multiply(new BigDecimal("2"));

            for (int currentLevel = 2; currentLevel <= level; currentLevel++) {
                if (currentLevel >= 19 && currentLevel <= 21) {
                    total = total.add(doubleIncrement);
                } else {
                    total = total.add(increment);
                }
            }

            String result = total.setScale(2, RoundingMode.HALF_UP)
                    .stripTrailingZeros()
                    .toPlainString();

            return isPercentage ? result + "%" : result;
        } catch (NumberFormatException e) {
            return "0";
        }
    }
}
