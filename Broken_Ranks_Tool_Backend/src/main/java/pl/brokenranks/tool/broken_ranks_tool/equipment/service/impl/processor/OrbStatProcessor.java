package pl.brokenranks.tool.broken_ranks_tool.equipment.service.impl.processor;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import pl.brokenranks.tool.broken_ranks_tool.equipment.dto.EquipmentRequest.SlotData;
import pl.brokenranks.tool.broken_ranks_tool.core.enums.ITEM_STAR;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.OrbTemplate;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.calculator.CalculationState;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.validator.EquipmentValidator;

@Component
@RequiredArgsConstructor
class OrbStatProcessor {

    private final EquipmentValidator validator;

    public void process(String slotKey, SlotData slot, int starLevel, CalculationState state) {
        if (slot.getOrbId() == null || !state.getContext().orbs().containsKey(slot.getOrbId())) return;

        OrbTemplate orb = state.getContext().orbs().get(slot.getOrbId());

        if (!validator.isValidOrb(orb, slotKey)) return;
        if (state.getUsedOrbs().contains(orb.getBonusType())) return;

        state.getUsedOrbs().add(orb.getBonusType());

        int finalLvl = validator.sanitizeOrbLevel((slot.getOrbLevel() != null) ? slot.getOrbLevel() : 1, orb);
        ITEM_STAR starMod = ITEM_STAR.fromLevel(starLevel);

        String bonusStr = switch (finalLvl) {
            case 1 -> orb.getBonusLvl1();
            case 2 -> orb.getBonusLvl2();
            case 3 -> orb.getBonusLvl3();
            default -> "0";
        };

        state.getAccumulator().addRawValue(orb.getBonusType().name(), bonusStr, 1.0 + starMod.getOrbMod());
    }
}