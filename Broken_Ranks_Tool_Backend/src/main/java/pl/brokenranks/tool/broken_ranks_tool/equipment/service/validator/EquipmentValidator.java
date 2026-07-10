package pl.brokenranks.tool.broken_ranks_tool.equipment.service.validator;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import pl.brokenranks.tool.broken_ranks_tool.core.enums.DRIF_BONUS_TYPE;
import pl.brokenranks.tool.broken_ranks_tool.core.enums.ORB_CATEGORY;
import pl.brokenranks.tool.broken_ranks_tool.core.enums.RARITY;
import pl.brokenranks.tool.broken_ranks_tool.core.enums.STAT_TYPE;
import pl.brokenranks.tool.broken_ranks_tool.core.utils.StringUtils;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.DrifTemplate;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.ItemTemplate;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.OrbTemplate;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.rules.EquipmentRulesRegistry;

import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Odpowiada za walidację logiki biznesowej i reguł gry.
 * Celem tej klasy jest zapewnienie, że dane wejściowe i operacje
 * są zgodne z zasadami (np. pojemność drifów, dozwolone sloty).
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class EquipmentValidator {

    private final EquipmentRulesRegistry rules;

    /**
     * Waliduje, czy nazwy statystyk postaci podane w żądaniu są dozwolone.
     * @throws IllegalArgumentException w przypadku wykrycia nieprawidłowej nazwy.
     */
    public void validateCharacterStats(Map<String, Integer> characterStats) {
        if (characterStats != null) {
            for (String statName : characterStats.keySet()) {
                if (!STAT_TYPE.isValid(statName)) {
                    throw new IllegalArgumentException("Wykryto nieprawidłową nazwę statystyki postaci: " + statName);
                }
            }
        }
    }

    /**
     * Waliduje, czy podana konfiguracja orbów jest zgodna z regułami dla danego przedmiotu.
     * @throws IllegalArgumentException w przypadku wykrycia naruszenia reguł.
     */
    public void validateOrbsSecurity(ItemTemplate item, List<OrbTemplate> orbs) {
        if (orbs == null || orbs.isEmpty()) {
            return;
        }

        if (orbs.size() > 1 && item.getRarity() != RARITY.LEGENDARY) {
            throw new IllegalArgumentException("Tylko przedmioty legendarne mogą mieć więcej niż jeden orb.");
        }

        if (orbs.size() > 2) {
            throw new IllegalArgumentException("Przedmiot nie może mieć więcej niż dwóch orbów.");
        }

        Set<ORB_CATEGORY> uniqueOrbCategories = orbs.stream().map(OrbTemplate::getCategory).collect(Collectors.toSet());
        if (uniqueOrbCategories.size() < orbs.size()) {
            log.warn("[SECURITY] Wykryto próbę użycia dwóch takich samych orbów w jednym przedmiocie.");
        }
    }


    /**
     * Waliduje, czy podana konfiguracja drifów jest zgodna z regułami dla danego przedmiotu.
     * Sprawdza m.in. unikalność bonusów i limit pojemności.
     *
     * @throws IllegalArgumentException w przypadku wykrycia naruszenia reguł.
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
     * @return {@code true}, jeśli przedmiot może być umieszczony w danym slocie.
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
     * @return {@code true}, jeśli drif jest poprawny.
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
     * @return Poziom ulepszenia drifu, ograniczony do jego maksymalnej dozwolonej wartości.
     */
    public int sanitizeDrifLevel(int requestedLevel, DrifTemplate drif) {
        if (drif.getSize() == null) return requestedLevel;
        return Math.min(requestedLevel, drif.getSize().getMaxLevel());
    }

    /**
     * @return {@code true}, jeśli orb jest prawidłowy dla danego slotu.
     */
    public boolean isValidOrb(OrbTemplate orb, String slotKey, boolean isSecondOrb) {
        if (orb == null) return false;

        // Dla drugiego orba (w legendarnym itemie) dozwolone są tylko orby ofensywne
        if (isSecondOrb) {
            if (orb.getCategory() != ORB_CATEGORY.OFENSIVE) {
                log.warn("[SECURITY] Odrzucono drugi Orb {} - nie jest ofensywny", orb.getCategory());
                return false;
            }
        } else {
            if (!rules.isOrbAllowedInSlot(orb.getCategory(), slotKey)) {
                log.warn("[SECURITY] Odrzucono Orb {} ze slotu {}", orb.getCategory(), slotKey);
                return false;
            }
        }
        return true;
    }


    /**
     * @return Poziom ulepszenia orba, ograniczony do jego maksymalnej dozwolonej wartości.
     */
    public int sanitizeOrbLevel(int requestedLevel, OrbTemplate orb) {
        if (orb.getSize() == null) return requestedLevel;
        return Math.min(requestedLevel, orb.getSize().getMaxLevel());
    }

    /**
     * @return {@code true}, jeśli bonus drifu jest typu "obrażenia od żywiołów".
     */
    public boolean isElementalDamage(DRIF_BONUS_TYPE type) {
        return rules.isElementalDamage(type);
    }

    /**
     * @return {@code true}, jeśli pozycja drifu z obrażeniami od żywiołów jest prawidłowa.
     */
    public boolean isElementalDrifPositionValid(DrifTemplate drif, String slotKey) {
        if (drif == null || drif.getBonusType() == null) return false;
        if (rules.isElementalDamage(drif.getBonusType())) {
            return "weapon".equals(slotKey);
        }
        return true;
    }

    /**
     * @return {@code true}, jeśli rozmiar drifu jest dozwolony dla danego tieru przedmiotu.
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
