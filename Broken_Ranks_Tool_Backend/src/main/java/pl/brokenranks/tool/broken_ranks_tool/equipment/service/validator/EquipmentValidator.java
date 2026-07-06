package pl.brokenranks.tool.broken_ranks_tool.equipment.service.validator;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import pl.brokenranks.tool.broken_ranks_tool.core.enums.DRIF_BONUS_TYPE;
import pl.brokenranks.tool.broken_ranks_tool.core.enums.RARITY;
import pl.brokenranks.tool.broken_ranks_tool.core.utils.StringUtils;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.DrifTemplate;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.ItemTemplate;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.OrbTemplate;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.rules.EquipmentRulesRegistry;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * Serwis odpowiedzialny za walidację reguł i zabezpieczeń związanych z ekwipunkiem.
 * Sprawdza, czy operacje wykonywane przez użytkownika są zgodne z zasadami tworzenia ekwipunku.
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class EquipmentValidator {

    private final EquipmentRulesRegistry rules;

    /**
     * Waliduje bezpieczeństwo i poprawność drifów osadzonych w przedmiocie.
     * Sprawdza unikalność bonusów, pojemność przedmiotu oraz inne ograniczenia.
     * Rzuca {@link IllegalArgumentException} w przypadku wykrycia naruszenia.
     *
     * @param item       Szablon przedmiotu, w którym osadzane są drify.
     * @param itemStars  Poziom ulepszenia przedmiotu (gwiazdki).
     * @param drifs      Lista szablonów drifów do osadzenia.
     * @param drifLevels Lista poziomów ulepszenia dla każdego drifu.
     */
    public void validateDrifsSecurity(ItemTemplate item, int itemStars, List<DrifTemplate> drifs, List<Integer> drifLevels) {
        if (item == null || drifs == null || drifs.isEmpty()) {
            return;
        }

        Set<DRIF_BONUS_TYPE> uniqueBonuses = new HashSet<>();
        int currentPowerUsed = 0;

        boolean isEpicOrSet = item.getRarity() == RARITY.EPIC || item.getRarity() == RARITY.SET;

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

    /**
     * Sprawdza, czy przedmiot może być umieszczony w danym slocie.
     * @return true, jeśli przedmiot jest prawidłowy dla slotu.
     */
    public boolean isValidItem(ItemTemplate item, String slotKey) {
        if (item == null) return false;
        if (!rules.isItemAllowedInSlot(item.getCategory(), slotKey)) {
            log.warn("[SECURITY] Odrzucono przedmiot {} ze slotu {}", item.getCategory(), slotKey);
            return false;
        }
        return true;
    }

    /**
     * Sprawdza podstawową poprawność drifu.
     * @return true, jeśli drif jest prawidłowy.
     */
    public boolean isValidDrif(DrifTemplate drif, String slotKey) {
        if (drif == null) return false;
        if (drif.getBonusType() == null) {
            log.warn("[SECURITY] Odrzucono drif o ID {} - brak zdefiniowanego typu bonusu!", drif.getId());
            return false;
        }
        return true;
    }

    /**
     * Ogranicza poziom ulepszenia drifu do jego maksymalnej dozwolonej wartości.
     * @return Poprawny poziom ulepszenia.
     */
    public int sanitizeDrifLevel(int requestedLevel, DrifTemplate drif) {
        if (drif.getSize() == null) return requestedLevel;
        return Math.min(requestedLevel, drif.getSize().getMaxLevel());
    }

    /**
     * Sprawdza, czy orb może być umieszczony w danym slocie.
     * @return true, jeśli orb jest prawidłowy dla slotu.
     */
    public boolean isValidOrb(OrbTemplate orb, String slotKey) {
        if (orb == null) return false;
        if (!rules.isOrbAllowedInSlot(orb.getCategory(), slotKey)) {
            log.warn("[SECURITY] Odrzucono Orb {} ze slotu {}", orb.getCategory(), slotKey);
            return false;
        }
        return true;
    }

    /**
     * Ogranicza poziom ulepszenia orba do jego maksymalnej dozwolonej wartości.
     * @return Poprawny poziom ulepszenia.
     */
    public int sanitizeOrbLevel(int requestedLevel, OrbTemplate orb) {
        if (orb.getSize() == null) return requestedLevel;
        return Math.min(requestedLevel, orb.getSize().getMaxLevel());
    }

    /**
     * Sprawdza, czy bonus drifu jest typu "obrażenia od żywiołów".
     * @return true, jeśli bonus jest od żywiołów.
     */
    public boolean isElementalDamage(DRIF_BONUS_TYPE type) {
        return rules.isElementalDamage(type);
    }

    /**
     * Sprawdza, czy drif z obrażeniami od żywiołów jest w dozwolonym slocie (tylko broń).
     * @return true, jeśli pozycja drifu jest prawidłowa.
     */
    public boolean isElementalDrifPositionValid(DrifTemplate drif, String slotKey) {
        if (drif == null || drif.getBonusType() == null) return false;
        if (rules.isElementalDamage(drif.getBonusType())) {
            return "weapon".equals(slotKey);
        }
        return true;
    }

    /**
     * Sprawdza, czy rozmiar drifu jest dozwolony dla danego tieru przedmiotu.
     * @return true, jeśli rozmiar drifu jest prawidłowy.
     */
    public boolean isValidDrifSizeForTier(DrifTemplate drif, ItemTemplate item) {
        if (drif == null || drif.getSize() == null || item == null || item.getTier() == null) {
            return false;
        }

        if (item.getRarity() == RARITY.EPIC || item.getRarity() == RARITY.SET) {
            return true;
        }

        int tierLvl = StringUtils.convertRomanToInteger(item.getTier());
        int allowedSizeIndex;

        if (tierLvl >= 10) allowedSizeIndex = 3;
        else if (tierLvl >= 7) allowedSizeIndex = 2;
        else if (tierLvl >= 4) allowedSizeIndex = 1;
        else allowedSizeIndex = 0;

        return drif.getSize().ordinal() <= allowedSizeIndex;
    }
}
