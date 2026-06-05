package pl.brokenranks.tool.broken_ranks_tool.equipment.service.validator;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import pl.brokenranks.tool.broken_ranks_tool.core.enums.DRIF_BONUS_TYPE;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.DrifTemplate;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.ItemTemplate;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.OrbTemplate;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.rules.EquipmentRulesRegistry;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
@Slf4j
@RequiredArgsConstructor
public class EquipmentValidator {

    private final EquipmentRulesRegistry rules;


    public void validateDrifsSecurity(ItemTemplate item, int itemStars, List<DrifTemplate> drifs, List<Integer> drifLevels) {
        if (item == null || drifs == null || drifs.isEmpty()) return;

        Set<DRIF_BONUS_TYPE> uniqueBonuses = new HashSet<>();
        int currentPowerUsed = 0;

        boolean isEpicOrSet = item.getRarity() != null &&
                ("EPIC".equalsIgnoreCase(item.getRarity().name()) || "SET".equalsIgnoreCase(item.getRarity().name()));

        String baseItemName = item.getName() != null ? item.getName().replaceAll("\\s+[IVX]+$", "").trim() : "";
        List<String> builtInTypes = isEpicOrSet ? EquipmentRulesRegistry.EPIC_BUILTIN_DRIFS.getOrDefault(baseItemName, List.of()) : List.of();

        for (int i = 0; i < drifs.size(); i++) {
            DrifTemplate drif = drifs.get(i);
            int level = i < drifLevels.size() ? drifLevels.get(i) : 1;

            if (!uniqueBonuses.add(drif.getBonusType())) {
                log.error("[SECURITY] Oszustwo! Próba powielenia drifu: {}", drif.getBonusType());
                throw new IllegalArgumentException("Wykryto zduplikowany typ drifu w jednym przedmiocie: " + drif.getBonusType().name());
            }

            if (isEpicOrSet && builtInTypes.contains(drif.getBonusType().name())) {
                continue;
            }

            int basePower = drif.getBonusType().getBasePower();
            int multiplier = getEffectiveMultiplier(level);
            currentPowerUsed += (basePower * multiplier);
        }

        int baseCapacity = item.getCapacity() != null ? item.getCapacity() : 0;
        if (baseCapacity > 0) {
            int capacityBonus = 0;
            if (itemStars >= 7 && itemStars < 8) capacityBonus = 1;
            else if (itemStars >= 8 && itemStars < 9) capacityBonus = 2;
            else if (itemStars >= 9) capacityBonus = 4;

            int totalItemCapacity = baseCapacity + capacityBonus;

            if (currentPowerUsed > totalItemCapacity) {
                log.error("[SECURITY] Oszustwo! Przekroczono pojemność. Użyto: {}, Max: {}", currentPowerUsed, totalItemCapacity);
                throw new IllegalArgumentException("Przekroczono dopuszczalną pojemność drifów w przedmiocie!");
            }
        }
    }

    private int getEffectiveMultiplier(int level) {
        if (level <= 6) return 1;
        if (level <= 11) return 2;
        if (level <= 16) return 3;
        return 4;
    }


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

        if (item.getRarity() != null &&
                ("EPIC".equalsIgnoreCase(item.getRarity().name()) || "SET".equalsIgnoreCase(item.getRarity().name()))) {
            return true;
        }

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