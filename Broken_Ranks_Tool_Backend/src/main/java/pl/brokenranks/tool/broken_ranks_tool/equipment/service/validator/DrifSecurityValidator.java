package pl.brokenranks.tool.broken_ranks_tool.equipment.service.validator;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_BONUS_TYPE;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_SIZE;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.RARITY;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.rules.DrifPowerRules;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.rules.EquipmentRulesRegistry;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.DrifTemplate;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.ItemTemplate;

/** Rejects drif combinations that violate slot, uniqueness, or capacity constraints. */
@Component
@Slf4j
@RequiredArgsConstructor
public class DrifSecurityValidator {
    private final EquipmentPlacementRules placementRules;
    private final UpgradeLevelPolicy levels;

    public void validate(
            String slot,
            ItemTemplate item,
            int stars,
            List<DrifTemplate> drifs,
            List<Integer> requestedLevels) {
        if (item == null) return;
        if (drifs == null) drifs = List.of();
        Set<DRIF_BONUS_TYPE> unique = new HashSet<>();
        int usedPower = 0;
        int elemental = 0;
        boolean builtInItem = item.getRarity() == RARITY.EPIC || item.getRarity() == RARITY.SET;
        String baseName =
                item.getName() == null ? "" : item.getName().replaceAll("\\s+[IVX]+$", "").trim();
        List<String> builtIn =
                builtInItem
                        ? EquipmentRulesRegistry.EPIC_BUILTIN_DRIFS.getOrDefault(
                                baseName, List.of())
                        : List.of();
        if (builtInItem) {
            if (drifs.size() != builtIn.size()) {
                throw new IllegalArgumentException(
                        "Konfiguracja wbudowanych drifów nie pasuje do przedmiotu.");
            }
            for (int index = 0; index < drifs.size(); index++) {
                DrifTemplate drif = drifs.get(index);
                if (drif == null
                        || drif.getSize() != DRIF_SIZE.MAGNIDRIF
                        || drif.getBonusType() == null
                        || !builtIn.get(index).equals(drif.getBonusType().name())) {
                    throw new IllegalArgumentException(
                            "Konfiguracja wbudowanych drifów nie pasuje do przedmiotu.");
                }
            }
        } else if (drifs.size() > placementRules.maxDrifs(item, stars)) {
            throw new IllegalArgumentException("Przekroczono liczbę gniazd drifów w przedmiocie.");
        }
        for (int index = 0; index < drifs.size(); index++) {
            DrifTemplate drif = drifs.get(index);
            int requested =
                    index < requestedLevels.size() && requestedLevels.get(index) != null
                            ? requestedLevels.get(index)
                            : 1;
            int level = levels.sanitizeDrifLevel(requested, drif);
            if (requested < 1
                    || drif.getSize() == null
                    || requested > drif.getSize().getMaxLevel()) {
                throw new IllegalArgumentException("Poziom drifa jest poza dozwolonym zakresem.");
            }
            if (!placementRules.isValidDrifSizeForTier(drif, item)) {
                throw new IllegalArgumentException("Rozmiar drifa przekracza tier przedmiotu.");
            }
            if (!placementRules.isElementalDrifPositionValid(drif, slot)) {
                throw new IllegalArgumentException(
                        "Drify żywiołowe mogą znajdować się wyłącznie w broni.");
            }
            if (placementRules.isElementalDamage(drif.getBonusType()) && ++elemental > 1) {
                throw new IllegalArgumentException(
                        "Broń może zawierać tylko jeden drif żywiołowy.");
            }
            if (!unique.add(drif.getBonusType())) {
                log.error(
                        "[SECURITY] Oszustwo API! Próba powielenia drifu: {}", drif.getBonusType());
                throw new IllegalArgumentException(
                        "Wykryto zduplikowany typ drifu w jednym przedmiocie: "
                                + drif.getBonusType().name());
            }
            if (!builtInItem || !builtIn.contains(drif.getBonusType().name())) {
                usedPower += DrifPowerRules.power(drif.getBonusType().getBasePower(), level);
            }
        }
        int capacity = levels.calculateItemCapacity(item, stars);
        if (usedPower > capacity) {
            log.error(
                    "[SECURITY] Oszustwo API! Przekroczono pojemność. Użyto: {}, Max: {}",
                    usedPower,
                    capacity);
            throw new IllegalArgumentException(
                    "Przekroczono dopuszczalną pojemność drifów w przedmiocie!");
        }
    }
}
