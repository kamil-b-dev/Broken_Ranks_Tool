package pl.brokenranks.tool.broken_ranks_tool.equipment.service.validator;

import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_BONUS_TYPE;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.ORB_BONUS_TYPE;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.ORB_CATEGORY;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.RARITY;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.STAT_TYPE;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.rules.EquipmentRulesRegistry;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.util.DrifPowerRules;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.util.RomanNumeralParser;
import pl.brokenranks.tool.broken_ranks_tool.equipment.dto.EquipmentRequest;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.DrifTemplate;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.ItemTemplate;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.OrbTemplate;

/** Validates equipment input against business and game rules. */
@Service
@Slf4j
@RequiredArgsConstructor
public class EquipmentValidator {

    private final EquipmentRulesRegistry rules;

    /**
     * Validates the request envelope before the calculation pipeline accesses it.
     * @param request Equipment calculation request.
     * @throws IllegalArgumentException If the request is missing required structures.
     */
    public void validateRequest(EquipmentRequest request) {
        if (request == null || request.getSlots() == null) {
            throw new IllegalArgumentException("Żądanie musi zawierać konfigurację slotów.");
        }
        request.getSlots()
                .forEach(
                        (slotKey, slotData) -> {
                            if (slotKey == null || slotKey.isBlank() || slotData == null) {
                                throw new IllegalArgumentException(
                                        "Konfiguracja zawiera nieprawidłowy slot.");
                            }
                        });
    }

    /**
     * Validates that requested character statistic names are supported.
     * @param characterStats Character statistics keyed by business name.
     * @throws IllegalArgumentException If a statistic name is unsupported.
     */
    public void validateCharacterStats(Map<String, Integer> characterStats) {
        if (characterStats != null) {
            for (Map.Entry<String, Integer> entry : characterStats.entrySet()) {
                if (!STAT_TYPE.isValid(entry.getKey()) || entry.getValue() == null) {
                    throw new IllegalArgumentException(
                            "Wykryto nieprawidłową statystykę postaci: " + entry.getKey());
                }
            }
        }
    }

    /**
     * Validates orb count, item rarity, and duplicate orb bonuses.
     * @param item Item receiving the orbs.
     * @param orbs Orb templates to validate.
     * @throws IllegalArgumentException If the orb configuration violates a game rule.
     */
    public void validateOrbsSecurity(ItemTemplate item, List<OrbTemplate> orbs) {
        if (orbs == null || orbs.isEmpty()) {
            return;
        }

        if (orbs.size() > 1 && item.getRarity() != RARITY.LEGENDARY) {
            throw new IllegalArgumentException(
                    "Tylko przedmioty legendarne mogą mieć więcej niż jeden orb.");
        }

        if (orbs.size() > 2) {
            throw new IllegalArgumentException("Przedmiot nie może mieć więcej niż dwóch orbów.");
        }

        Set<ORB_BONUS_TYPE> uniqueOrbBonuses =
                orbs.stream().map(OrbTemplate::getBonusType).collect(Collectors.toSet());
        if (uniqueOrbBonuses.size() < orbs.size()) {
            log.error("[SECURITY] Wykryto próbę użycia dwóch orbów z tym samym bonusem.");
            throw new IllegalArgumentException("Nie można użyć dwóch orbów z tym samym bonusem.");
        }
    }

    /**
     * Calculates an item's total drif capacity, including star bonuses.
     * @param item Item template.
     * @param itemStars Item upgrade level.
     * @return Total available drif capacity.
     */
    public int calculateItemCapacity(ItemTemplate item, int itemStars) {
        int baseCapacity = item.getCapacity() != null ? item.getCapacity() : 0;
        if (baseCapacity == 0) return 0;

        int normalizedStars = sanitizeItemStars(itemStars);
        int capacityBonus = 0;
        if (normalizedStars == 7) capacityBonus = 1;
        else if (normalizedStars == 8) capacityBonus = 2;
        else if (normalizedStars == 9) capacityBonus = 4;

        return baseCapacity + capacityBonus;
    }

    /**
     * Validates drif uniqueness, elemental placement, levels, and capacity limits.
     * @param slotKey Equipment slot identifier.
     * @param item Item receiving the drifs.
     * @param itemStars Item upgrade level.
     * @param drifs Drif templates to validate.
     * @param drifLevels Requested level for each drif position.
     * @throws IllegalArgumentException If the drif configuration violates a game rule.
     */
    public void validateDrifsSecurity(
            String slotKey,
            ItemTemplate item,
            int itemStars,
            List<DrifTemplate> drifs,
            List<Integer> drifLevels) {
        if (item == null || drifs == null || drifs.isEmpty()) {
            return;
        }

        Set<DRIF_BONUS_TYPE> uniqueBonuses = new HashSet<>();
        int currentPowerUsed = 0;

        boolean isEpicOrSet = item.getRarity() == RARITY.EPIC || item.getRarity() == RARITY.SET;

        String baseItemName =
                item.getName() != null ? item.getName().replaceAll("\\s+[IVX]+$", "").trim() : "";
        List<String> builtInTypes =
                isEpicOrSet
                        ? EquipmentRulesRegistry.EPIC_BUILTIN_DRIFS.getOrDefault(
                                baseItemName, List.of())
                        : List.of();

        for (int i = 0; i < drifs.size(); i++) {
            DrifTemplate drif = drifs.get(i);
            int requestedLevel =
                    i < drifLevels.size() && drifLevels.get(i) != null ? drifLevels.get(i) : 1;
            int level = sanitizeDrifLevel(requestedLevel, drif);

            if (!isElementalDrifPositionValid(drif, slotKey)) {
                throw new IllegalArgumentException(
                        "Drify żywiołowe mogą znajdować się wyłącznie w broni.");
            }

            if (!uniqueBonuses.add(drif.getBonusType())) {
                log.error(
                        "[SECURITY] Oszustwo API! Próba powielenia drifu: {}", drif.getBonusType());
                throw new IllegalArgumentException(
                        "Wykryto zduplikowany typ drifu w jednym przedmiocie: "
                                + drif.getBonusType().name());
            }

            if (isEpicOrSet && builtInTypes.contains(drif.getBonusType().name())) {
                continue;
            }

            int basePower = drif.getBonusType().getBasePower();
            currentPowerUsed += DrifPowerRules.power(basePower, level);
        }

        int totalItemCapacity = calculateItemCapacity(item, itemStars);
        if (totalItemCapacity > 0 && currentPowerUsed > totalItemCapacity) {
            log.error(
                    "[SECURITY] Oszustwo API! Przekroczono pojemność. Użyto: {}, Max: {}",
                    currentPowerUsed,
                    totalItemCapacity);
            throw new IllegalArgumentException(
                    "Przekroczono dopuszczalną pojemność drifów w przedmiocie!");
        }
    }

    /**
     * Returns whether an item is allowed in the requested slot.
     * @param item Item template to check.
     * @param slotKey Equipment slot identifier.
     * @return Whether the item is allowed.
     */
    public boolean isValidItem(ItemTemplate item, String slotKey) {
        if (item == null) return false;
        return rules.isItemAllowedInSlot(item.getCategory(), slotKey);
    }

    /**
     * Returns whether a drif is non-null and has a defined bonus type.
     * @param drif Drif template to check.
     * @param slotKey Equipment slot identifier retained for signature consistency.
     * @return Whether the drif can be processed.
     */
    public boolean isValidDrif(DrifTemplate drif, String slotKey) {
        return drif != null && drif.getBonusType() != null;
    }

    /**
     * Clamps a requested drif level to its supported maximum.
     * @param requestedLevel Requested drif level.
     * @param drif Drif template defining the maximum.
     * @return Sanitized drif level.
     */
    public int sanitizeDrifLevel(int requestedLevel, DrifTemplate drif) {
        if (drif.getSize() == null) return Math.max(1, requestedLevel);
        return Math.max(1, Math.min(requestedLevel, drif.getSize().getMaxLevel()));
    }

    /**
     * Returns whether an orb is valid for the requested slot.
     * @param orb Orb template to check.
     * @param slotKey Equipment slot identifier.
     * @param isSecondOrb Whether this is the second orb on a legendary item.
     * @return Whether the orb is valid.
     */
    public boolean isValidOrb(OrbTemplate orb, String slotKey, boolean isSecondOrb) {
        if (orb == null) return false;
        if (isSecondOrb) {
            return orb.getCategory() == ORB_CATEGORY.OFFENSIVE;
        } else {
            return rules.isOrbAllowedInSlot(orb.getCategory(), slotKey);
        }
    }

    /**
     * Clamps a requested orb level to its supported maximum.
     * @param requestedLevel Requested orb level.
     * @param orb Orb template defining the maximum.
     * @return Sanitized orb level.
     */
    public int sanitizeOrbLevel(int requestedLevel, OrbTemplate orb) {
        if (orb.getSize() == null) return Math.max(1, requestedLevel);
        return Math.max(1, Math.min(requestedLevel, orb.getSize().getMaxLevel()));
    }

    /**
     * Normalizes an item upgrade level to the supported game range.
     * @param requestedLevel Requested item upgrade level.
     * @return A value between 1 and 9.
     */
    public int sanitizeItemStars(int requestedLevel) {
        return Math.max(1, Math.min(requestedLevel, 9));
    }

    /**
     * Returns whether a drif bonus represents elemental damage.
     * @param type Drif bonus type.
     * @return Whether the bonus is elemental damage.
     */
    public boolean isElementalDamage(DRIF_BONUS_TYPE type) {
        return rules.isElementalDamage(type);
    }

    /**
     * Returns whether an elemental drif is placed in the weapon slot.
     * @param drif Drif template to check.
     * @param slotKey Equipment slot identifier.
     * @return Whether the elemental placement is valid.
     */
    public boolean isElementalDrifPositionValid(DrifTemplate drif, String slotKey) {
        if (drif == null || drif.getBonusType() == null) return false;
        if (rules.isElementalDamage(drif.getBonusType())) {
            return "weapon".equals(slotKey);
        }
        return true;
    }

    /**
     * Returns whether a drif size is allowed for the item's tier.
     * @param drif Drif template to check.
     * @param item Item template defining the tier.
     * @return Whether the drif size is allowed.
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
