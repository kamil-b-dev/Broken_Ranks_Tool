package pl.brokenranks.tool.broken_ranks_tool.equipment.service.calculator.processor;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.ITEM_STAR;
import pl.brokenranks.tool.broken_ranks_tool.equipment.dto.EquipmentRequest.SlotData;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.ItemTemplate;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.OrbTemplate;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.calculator.CalculationState;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.validator.EquipmentValidator;

import java.util.ArrayList;
import java.util.List;

/**
 * Przetwarza statystyki pochodzące z orbów, uwzględniając ich poziom
 * oraz modyfikatory z gwiazdek przedmiotu.
 */
@Component
@RequiredArgsConstructor
public class OrbStatProcessor {

    private final EquipmentValidator validator;

    /**
     * Przetwarza orby dla danego slotu, waliduje je i dodaje ich statystyki do akumulatora.
     * @param slotKey Klucz identyfikujący slot ekwipunku (np. "helmet").
     * @param slot Dane o slocie z żądania.
     * @param item Szablon przedmiotu osadzonego w slocie.
     * @param itemStars Poziom ulepszenia przedmiotu.
     * @param state Aktualny stan obliczeń.
     */
    public void process(String slotKey, SlotData slot, ItemTemplate item, int itemStars, CalculationState state) {
        if (slot.getOrbIds() == null || slot.getOrbIds().isEmpty()) {
            return;
        }

        List<OrbTemplate> orbsToProcess = new ArrayList<>();
        for (Long orbId : slot.getOrbIds()) {
            if (orbId != null && state.getContext().orbs().containsKey(orbId)) {
                orbsToProcess.add(state.getContext().orbs().get(orbId));
            }
        }

        validator.validateOrbsSecurity(item, orbsToProcess);

        for (int i = 0; i < orbsToProcess.size(); i++) {
            OrbTemplate orb = orbsToProcess.get(i);
            boolean isSecondOrb = i > 0;

            if (!validator.isValidOrb(orb, slotKey, isSecondOrb)) {
                continue;
            }

            if (state.getUsedOrbs().contains(orb.getBonusType())) {
                continue;
            }

            int requestedLvl = (slot.getOrbLevels() != null && i < slot.getOrbLevels().size()) ? slot.getOrbLevels().get(i) : 1;
            int finalLvl = validator.sanitizeOrbLevel(requestedLvl, orb);

            String statValue = switch (finalLvl) {
                case 2 -> orb.getBonusLvl2();
                case 3 -> orb.getBonusLvl3();
                default -> orb.getBonusLvl1();
            };

            if (statValue != null) {
                ITEM_STAR starMod = ITEM_STAR.fromLevel(itemStars);
                state.getAccumulator().addRawValue(orb.getBonusType().name(), statValue, 1.0 + starMod.getOrbMod());
                state.getUsedOrbs().add(orb.getBonusType());
            }
        }
    }
}
