package pl.brokenranks.tool.broken_ranks_tool.service.validator;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import pl.brokenranks.tool.broken_ranks_tool.dto.EquipmentRequest.SlotData;
import pl.brokenranks.tool.broken_ranks_tool.entity.templates.DrifTemplate;
import pl.brokenranks.tool.broken_ranks_tool.entity.templates.ItemTemplate;
import pl.brokenranks.tool.broken_ranks_tool.entity.templates.OrbTemplate;
import pl.brokenranks.tool.broken_ranks_tool.service.rules.EquipmentRulesRegistry;

@Service
@Slf4j
@RequiredArgsConstructor
public class EquipmentValidator {

    private final EquipmentRulesRegistry rules;

    public boolean isValidItem(ItemTemplate item, String slotKey) {
        if (item == null) return false;
        if (!rules.isItemAllowedInSlot(item.getCategory(), slotKey)) {
            log.warn("[SECURITY] Odrzucono przedmiot {} ze slotu {}", item.getCategory(), slotKey);
            return false;
        }
        return true;
    }

    public boolean isValidDrif(DrifTemplate drif, String slotKey) {
        if (drif == null) return false;
        if (!rules.isDrifAllowedInSlot(drif.getBonusType(), slotKey)) {
            log.warn("[SECURITY] Odrzucono drif {} ze slotu {}", drif.getBonusType(), slotKey);
            return false;
        }
        return true;
    }

    public int sanitizeDrifLevel(int requestedLevel, DrifTemplate drif) {
        if (drif.getSize() == null) return requestedLevel;
        return Math.min(requestedLevel, drif.getSize().getMaxLevel());
    }

    public boolean isValidOrb(OrbTemplate orb, String slotKey) {
        if (orb == null) return false;

        if (!rules.isOrbAllowedInSlot(orb.getCategory(), slotKey)) {
            log.warn("[SECURITY] Odrzucono Orb {} ze slotu {}", orb.getCategory(), slotKey);
            return false;
        }
        return true;
    }

    public int sanitizeOrbLevel(int requestedLevel, OrbTemplate orb) {
        if (orb.getSize() == null) return requestedLevel;
        return Math.min(requestedLevel, orb.getSize().getMaxLevel());
    }
}