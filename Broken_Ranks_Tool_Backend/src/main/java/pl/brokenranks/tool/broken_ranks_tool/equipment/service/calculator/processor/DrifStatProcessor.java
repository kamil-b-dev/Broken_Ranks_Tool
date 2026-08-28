package pl.brokenranks.tool.broken_ranks_tool.equipment.service.calculator.processor;

import java.util.HashSet;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_BONUS_TYPE;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.rules.DrifValueCalculator;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.rules.EquipmentRulesRegistry;
import pl.brokenranks.tool.broken_ranks_tool.equipment.dto.EquipmentRequest.SlotData;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.DrifTemplate;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.ItemTemplate;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.calculator.CalculationState;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.validator.EquipmentPlacementRules;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.validator.UpgradeLevelPolicy;

/** Calculates drif statistics, item modifiers, and duplicate-bonus penalties. */
@Component
@RequiredArgsConstructor
public class DrifStatProcessor {

    private final EquipmentPlacementRules placementRules;
    private final UpgradeLevelPolicy levelPolicy;
    private final EquipmentRulesRegistry rules;
    private final DrifValueCalculator valueCalculator;

    public void process(
            String slotKey,
            SlotData slot,
            ItemTemplate item,
            double drifMod,
            CalculationState state) {
        if (slot.getDrifIds() == null) return;

        Set<DRIF_BONUS_TYPE> processedDrifsForItem = new HashSet<>();

        for (int i = 0; i < slot.getDrifIds().size(); i++) {
            Long drifId = slot.getDrifIds().get(i);
            if (drifId == null || !state.getContext().drifs().containsKey(drifId)) continue;
            DrifTemplate drif = state.getContext().drifs().get(drifId);

            if (!placementRules.isValidDrif(drif)) continue;
            if (!placementRules.isElementalDrifPositionValid(drif, slotKey)) continue;
            if (!placementRules.isValidDrifSizeForTier(drif, item)) continue;

            if (processedDrifsForItem.contains(drif.getBonusType())) continue;
            processedDrifsForItem.add(drif.getBonusType());

            int requestedLvl =
                    (slot.getDrifLevels() != null
                                    && slot.getDrifLevels().containsKey(String.valueOf(i)))
                            ? slot.getDrifLevels().get(String.valueOf(i))
                            : 1;

            int finalLvl = levelPolicy.sanitizeDrifLevel(requestedLvl, drif);

            int globalCountForThisDrif = state.getDrifCounts().getOrDefault(drif.getBonusType(), 1);
            double penaltyMultiplier = rules.getDrifPenalty(globalCountForThisDrif);

            String calculatedStatValue =
                    valueCalculator.calculate(drif.getBaseValue(), drif.getIncrement(), finalLvl);
            double finalMultiplier = (1.0 + drifMod) * penaltyMultiplier;

            state.getAccumulator()
                    .addRawValue(drif.getBonusType().name(), calculatedStatValue, finalMultiplier);
        }
    }
}
