package pl.brokenranks.tool.broken_ranks_tool.equipment.service.impl.processor;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import pl.brokenranks.tool.broken_ranks_tool.equipment.dto.EquipmentRequest.SlotData;
import pl.brokenranks.tool.broken_ranks_tool.core.enums.ITEM_STAR;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.OrbTemplate;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.calculator.CalculationState;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.validator.EquipmentValidator;

/**
 * Procesor odpowiedzialny za obliczanie i dodawanie statystyk pochodzących z orbów.
 * Obsługuje modyfikatory z gwiazdek przedmiotu oraz poziom ulepszenia samego orba.
 */
@Component
@RequiredArgsConstructor
public class OrbStatProcessor {

    private final EquipmentValidator validator;

    public void process(String slotKey, SlotData slot, int itemStars, CalculationState state) {
        if (slot.getOrbId() == null || !state.getContext().orbs().containsKey(slot.getOrbId())) {
            return;
        }

        OrbTemplate orb = state.getContext().orbs().get(slot.getOrbId());
        if (!validator.isValidOrb(orb, slotKey)) {
            return;
        }

        if (state.getUsedOrbs().contains(orb.getBonusType())) {
            return;
        }

        int requestedLvl = (slot.getOrbLevel() != null) ? slot.getOrbLevel() : 1;
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
