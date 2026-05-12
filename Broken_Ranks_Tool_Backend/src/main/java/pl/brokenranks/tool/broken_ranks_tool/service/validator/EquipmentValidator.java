package pl.brokenranks.tool.broken_ranks_tool.service.validator;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import pl.brokenranks.tool.broken_ranks_tool.dto.EquipmentRequest.SlotData;
import pl.brokenranks.tool.broken_ranks_tool.entity.enums.DRIF_BONUS_TYPE;
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

        if (drif.getBonusType() == null) {
            log.warn("[SECURITY] Odrzucono drif o ID {} - brak zdefiniowanego typu bonusu!", drif.getId());
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

    public boolean isElementalDamage(DRIF_BONUS_TYPE type) {
        return rules.isElementalDamage(type);
    }

    public boolean isElementalDrifPositionValid(DrifTemplate drif, String slotKey) {
        if (drif == null || drif.getBonusType() == null) return false;

        if (rules.isElementalDamage(drif.getBonusType())) {
            return "weapon".equals(slotKey);
        }

        return true;
    }

    public boolean isValidDrifSizeForTier(DrifTemplate drif, ItemTemplate item) {
        if (drif == null || drif.getSize() == null || item == null || item.getTier() == null) return false;

        int tierLvl = convertRomanToInteger(item.getTier());
        int allowedSizeIndex;

        if (tierLvl <= 3) allowedSizeIndex = 0;
        else if (tierLvl <= 6) allowedSizeIndex = 1;
        else if (tierLvl <= 9) allowedSizeIndex = 2;
        else allowedSizeIndex = 3;

        return drif.getSize().ordinal() <= allowedSizeIndex;
    }

    private int convertRomanToInteger(String roman) {
        return switch (roman.toUpperCase()) {
            case "I" -> 1; case "II" -> 2; case "III" -> 3;
            case "IV" -> 4; case "V" -> 5; case "VI" -> 6;
            case "VII" -> 7; case "VIII" -> 8; case "IX" -> 9;
            case "X" -> 10; case "XI" -> 11; case "XII" -> 12;
            default -> 0;
        };
    }
}