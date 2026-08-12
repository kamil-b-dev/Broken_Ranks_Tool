package pl.brokenranks.tool.broken_ranks_tool.equipment.service.validator;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_BONUS_TYPE;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.ORB_CATEGORY;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.RARITY;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.STAT_TYPE;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.util.RomanNumeralParser;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.DrifTemplate;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.ItemTemplate;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.OrbTemplate;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.rules.EquipmentRulesRegistry;

import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Serwis odpowiedzialny za walidację logiki biznesowej i reguł gry
 * związanych z ekwipunkiem. Zapewnia, że dane wejściowe i operacje
 * są zgodne z zasadami (np. pojemność drifów, dozwolone sloty).
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class EquipmentValidator {

    private final EquipmentRulesRegistry rules;

    /**
     * Waliduje, czy nazwy statystyk postaci podane w żądaniu są dozwolone.
     * @param characterStats Mapa statystyk postaci do walidacji.
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
     * Sprawdza liczbę orbów, rzadkość przedmiotu oraz unikalność kategorii orbów.
     * @param item Szablon przedmiotu, do którego orby są przypisane.
     * @param orbs Lista szablonów orbów do walidacji.
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
     * Oblicza całkowitą pojemność drifów dla przedmiotu, uwzględniając bonusy z gwiazdek.
     * @param item Szablon przedmiotu.
     * @param itemStars Poziom ulepszenia przedmiotu.
     * @return Całkowita pojemność drifów.
     */
    public int calculateItemCapacity(ItemTemplate item, int itemStars) {
        int baseCapacity = item.getCapacity() != null ? item.getCapacity() : 0;
        if (baseCapacity == 0) return 0;

        int capacityBonus = 0;
        if (itemStars >= 7 && itemStars < 8) capacityBonus = 1;
        else if (itemStars >= 8 && itemStars < 9) capacityBonus = 2;
        else if (itemStars >= 9) capacityBonus = 4;

        return baseCapacity + capacityBonus;
    }


    /**
     * Waliduje, czy podana konfiguracja drifów jest zgodna z regułami dla danego przedmiotu.
     * Sprawdza m.in. unikalność bonusów i limit pojemności.
     *
     * @param item Szablon przedmiotu, do którego drify są przypisane.
     * @param itemStars Poziom ulepszenia przedmiotu.
     * @param drifs Lista szablonów drifów do walidacji.
     * @param drifLevels Lista poziomów dla każdego drifu.
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
                log.error("[SECURITY] Oszustwo API! Próba powielenia drifu: {}", drif.getBonusType());
                throw new IllegalArgumentException("Wykryto zduplikowany typ drifu w jednym przedmiocie: " + drif.getBonusType().name());
            }

            if (isEpicOrSet && builtInTypes.contains(drif.getBonusType().name())) {
                continue;
            }

            int basePower = drif.getBonusType().getBasePower();
            int multiplier = getEffectiveMultiplier(level);
            currentPowerUsed += (basePower * multiplier);
        }

        int totalItemCapacity = calculateItemCapacity(item, itemStars);
        if (totalItemCapacity > 0 && currentPowerUsed > totalItemCapacity) {
            log.error("[SECURITY] Oszustwo API! Przekroczono pojemność. Użyto: {}, Max: {}", currentPowerUsed, totalItemCapacity);
            throw new IllegalArgumentException("Przekroczono dopuszczalną pojemność drifów w przedmiocie!");
        }
    }

    /**
     * Zwraca efektywny mnożnik mocy drifu na podstawie jego poziomu.
     * @param level Poziom drifu.
     * @return Mnożnik mocy.
     */
    private int getEffectiveMultiplier(int level) {
        if (level <= 6) return 1;
        if (level <= 11) return 2;
        if (level <= 16) return 3;
        return 4;
    }

    /**
     * Sprawdza, czy przedmiot może być umieszczony w danym slocie.
     * @param item Szablon przedmiotu.
     * @param slotKey Klucz identyfikujący slot.
     * @return {@code true}, jeśli przedmiot jest dozwolony w slocie.
     */
    public boolean isValidItem(ItemTemplate item, String slotKey) {
        if (item == null) return false;
        return rules.isItemAllowedInSlot(item.getCategory(), slotKey);
    }

    /**
     * Sprawdza, czy drif jest poprawny (nie jest nullem i ma zdefiniowany typ bonusu).
     * @param drif Szablon drifu.
     * @param slotKey Klucz identyfikujący slot (nieużywany w tej metodzie, ale zachowany dla spójności sygnatury).
     * @return {@code true}, jeśli drif jest poprawny.
     */
    public boolean isValidDrif(DrifTemplate drif, String slotKey) {
        return drif != null && drif.getBonusType() != null;
    }

    /**
     * Ogranicza żądany poziom drifu do jego maksymalnej dozwolonej wartości.
     * @param requestedLevel Żądany poziom drifu.
     * @param drif Szablon drifu.
     * @return Zsanityzowany poziom drifu.
     */
    public int sanitizeDrifLevel(int requestedLevel, DrifTemplate drif) {
        if (drif.getSize() == null) return requestedLevel;
        return Math.min(requestedLevel, drif.getSize().getMaxLevel());
    }

    /**
     * Sprawdza, czy orb jest prawidłowy dla danego slotu.
     * @param orb Szablon orba.
     * @param slotKey Klucz identyfikujący slot.
     * @param isSecondOrb Czy jest to drugi orb w przedmiocie (dla legendarnych).
     * @return {@code true}, jeśli orb jest prawidłowy.
     */
    public boolean isValidOrb(OrbTemplate orb, String slotKey, boolean isSecondOrb) {
        if (orb == null) return false;
        if (isSecondOrb) {
            return orb.getCategory() == ORB_CATEGORY.OFENSIVE;
        } else {
            return rules.isOrbAllowedInSlot(orb.getCategory(), slotKey);
        }
    }

    /**
     * Ogranicza żądany poziom orba do jego maksymalnej dozwolonej wartości.
     * @param requestedLevel Żądany poziom orba.
     * @param orb Szablon orba.
     * @return Zsanityzowany poziom orba.
     */
    public int sanitizeOrbLevel(int requestedLevel, OrbTemplate orb) {
        if (orb.getSize() == null) return requestedLevel;
        return Math.min(requestedLevel, orb.getSize().getMaxLevel());
    }

    /**
     * Sprawdza, czy typ bonusu drifu jest klasyfikowany jako obrażenia od żywiołów.
     * @param type Typ bonusu drifu.
     * @return {@code true}, jeśli bonus jest od żywiołów.
     */
    public boolean isElementalDamage(DRIF_BONUS_TYPE type) {
        return rules.isElementalDamage(type);
    }

    /**
     * Sprawdza, czy pozycja drifu z obrażeniami od żywiołów jest prawidłowa (tylko w broni).
     * @param drif Szablon drifu.
     * @param slotKey Klucz identyfikujący slot.
     * @return {@code true}, jeśli drif żywiołowy jest w prawidłowym slocie.
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
     * @param drif Szablon drifu.
     * @param item Szablon przedmiotu.
     * @return {@code true}, jeśli rozmiar drifu jest dozwolony.
     */
    public boolean isValidDrifSizeForTier(DrifTemplate drif, ItemTemplate item) {
        if (drif == null || drif.getSize() == null || item == null) return false;

        if (item.getRarity() == RARITY.EPIC || item.getRarity() == RARITY.SET) {
            return true;
        }

        int tierLvl = 1;
        if (item.getTier() != null) {
            tierLvl = RomanNumeralParser.convertRomanToInteger(item.getTier());
        }

        int allowedSizeIndex;
        if (tierLvl >= 10) allowedSizeIndex = 3;
        else if (tierLvl >= 7) allowedSizeIndex = 2;
        else if (tierLvl >= 4) allowedSizeIndex = 1;
        else allowedSizeIndex = 0;

        return drif.getSize().ordinal() <= allowedSizeIndex;
    }
}
