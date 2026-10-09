package pl.brokenranks.tool.broken_ranks_tool.equipment.service.calculator.processor;

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

/** Calculates orb statistics using orb levels and item star modifiers. */
@Component
@RequiredArgsConstructor
public class OrbStatProcessor {

    private final EquipmentPlacementRules placementRules;
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

        List<OrbTemplate> orbsToProcess = new java.util.ArrayList<>();
        List<Integer> sourceIndexes = new java.util.ArrayList<>();
        boolean emptyPosition = false;
        for (int index = 0; index < slot.getOrbIds().size(); index++) {
            Long orbId = slot.getOrbIds().get(index);
            if (orbId == null) {
                emptyPosition = true;
                continue;
            }
            if (emptyPosition) {
                throw new IllegalArgumentException("Orby nie mogą zawierać pustej pozycji.");
            }
            OrbTemplate orb = state.getContext().orbs().get(orbId);
            if (orb == null) {
                throw new IllegalArgumentException("Nie znaleziono orba o ID " + orbId + ".");
            }
            orbsToProcess.add(orb);
            sourceIndexes.add(index);
        }

        securityValidator.validate(item, orbsToProcess);

        for (int i = 0; i < orbsToProcess.size(); i++) {
            OrbTemplate orb = orbsToProcess.get(i);
            boolean isSecondOrb = i > 0;

            if (!placementRules.isValidOrb(orb, slotKey, item, isSecondOrb)) {
                throw new IllegalArgumentException("Orb nie pasuje do slotu lub pozycji.");
            }
            if (!placementRules.isValidOrbSizeForTier(orb, item)) {
                throw new IllegalArgumentException("Rozmiar orba przekracza tier przedmiotu.");
            }

            if (state.getUsedOrbs().contains(orb.getBonusType())) {
                throw new IllegalArgumentException("Typ bonusu orba powtarza się w zestawie.");
            }

            int sourceIndex = sourceIndexes.get(i);
            Integer requestedLvl =
                    slot.getOrbLevels() != null && sourceIndex < slot.getOrbLevels().size()
                            ? slot.getOrbLevels().get(sourceIndex)
                            : 1;
            if (requestedLvl == null
                    || requestedLvl < 1
                    || requestedLvl > orb.getSize().getMaxLevel()) {
                throw new IllegalArgumentException("Poziom orba jest poza dozwolonym zakresem.");
            }
            int finalLvl = requestedLvl;

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
        if (slot.getOrbLevels() != null && slot.getOrbLevels().size() > slot.getOrbIds().size()) {
            throw new IllegalArgumentException("Podano poziom dla nieistniejącego orba.");
        }
    }
}
