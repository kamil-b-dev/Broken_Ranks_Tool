package pl.brokenranks.tool.broken_ranks_tool.equipment.service.calculator.processor;

import java.util.ArrayList;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.ITEM_STAR;
import pl.brokenranks.tool.broken_ranks_tool.equipment.dto.EquipmentRequest.SlotData;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.ItemTemplate;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.OrbTemplate;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.calculator.CalculationState;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.validator.EquipmentPlacementRules;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.validator.OrbSecurityValidator;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.validator.UpgradeLevelPolicy;

/** Calculates orb statistics using orb levels and item star modifiers. */
@Component
@RequiredArgsConstructor
public class OrbStatProcessor {

    private final EquipmentPlacementRules placementRules;
    private final UpgradeLevelPolicy levelPolicy;
    private final OrbSecurityValidator securityValidator;

    /** Validates the slot's orbs and adds their statistics to the accumulator. */
    public void process(
            String slotKey,
            SlotData slot,
            ItemTemplate item,
            int itemStars,
            CalculationState state) {
        if (slot.getOrbIds() == null || slot.getOrbIds().isEmpty()) {
            return;
        }

        List<OrbTemplate> orbsToProcess = new ArrayList<>();
        for (Long orbId : slot.getOrbIds()) {
            if (orbId != null && state.getContext().orbs().containsKey(orbId)) {
                orbsToProcess.add(state.getContext().orbs().get(orbId));
            }
        }

        securityValidator.validate(item, orbsToProcess);

        for (int i = 0; i < orbsToProcess.size(); i++) {
            OrbTemplate orb = orbsToProcess.get(i);
            boolean isSecondOrb = i > 0;

            if (!placementRules.isValidOrb(orb, slotKey, isSecondOrb)) {
                continue;
            }

            if (state.getUsedOrbs().contains(orb.getBonusType())) {
                continue;
            }

            int requestedLvl =
                    (slot.getOrbLevels() != null && i < slot.getOrbLevels().size())
                            ? slot.getOrbLevels().get(i)
                            : 1;
            int finalLvl = levelPolicy.sanitizeOrbLevel(requestedLvl, orb);

            String statValue =
                    switch (finalLvl) {
                        case 2 -> orb.getBonusLvl2();
                        case 3 -> orb.getBonusLvl3();
                        default -> orb.getBonusLvl1();
                    };

            if (statValue != null) {
                ITEM_STAR starMod = ITEM_STAR.fromLevel(itemStars);
                state.getAccumulator()
                        .addRawValue(
                                orb.getBonusType().name(), statValue, 1.0 + starMod.getOrbMod());
                state.getUsedOrbs().add(orb.getBonusType());
            }
        }
    }
}
