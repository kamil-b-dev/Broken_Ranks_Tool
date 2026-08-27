package pl.brokenranks.tool.broken_ranks_tool.equipment.service.validator;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_BONUS_TYPE;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.ORB_BONUS_TYPE;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.RARITY;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.rules.EquipmentRulesRegistry;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.util.DrifPowerRules;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.DrifTemplate;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.ItemTemplate;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.OrbTemplate;

/** Rejects modifier combinations that violate equipment integrity constraints. */
@Component
@Slf4j
@RequiredArgsConstructor
public class ModifierSecurityValidator {
    private final EquipmentPlacementRules placementRules;
    private final UpgradeLevelPolicy levels;

    public void validateOrbs(ItemTemplate item, List<OrbTemplate> orbs) {
        if (orbs == null || orbs.isEmpty()) return;
        if (orbs.size() > 1 && item.getRarity() != RARITY.LEGENDARY) {
            throw new IllegalArgumentException(
                    "Tylko przedmioty legendarne mogą mieć więcej niż jeden orb.");
        }
        if (orbs.size() > 2)
            throw new IllegalArgumentException("Przedmiot nie może mieć więcej niż dwóch orbów.");
        Set<ORB_BONUS_TYPE> bonuses =
                orbs.stream().map(OrbTemplate::getBonusType).collect(Collectors.toSet());
        if (bonuses.size() < orbs.size()) {
            log.error("[SECURITY] Wykryto próbę użycia dwóch orbów z tym samym bonusem.");
            throw new IllegalArgumentException("Nie można użyć dwóch orbów z tym samym bonusem.");
        }
    }

    public void validateDrifs(
            String slot,
            ItemTemplate item,
            int stars,
            List<DrifTemplate> drifs,
            List<Integer> requestedLevels) {
        if (item == null || drifs == null || drifs.isEmpty()) return;
        Set<DRIF_BONUS_TYPE> unique = new HashSet<>();
        int usedPower = 0;
        boolean builtInItem = item.getRarity() == RARITY.EPIC || item.getRarity() == RARITY.SET;
        String baseName =
                item.getName() == null ? "" : item.getName().replaceAll("\\s+[IVX]+$", "").trim();
        List<String> builtIn =
                builtInItem
                        ? EquipmentRulesRegistry.EPIC_BUILTIN_DRIFS.getOrDefault(
                                baseName, List.of())
                        : List.of();
        for (int index = 0; index < drifs.size(); index++) {
            DrifTemplate drif = drifs.get(index);
            int requested =
                    index < requestedLevels.size() && requestedLevels.get(index) != null
                            ? requestedLevels.get(index)
                            : 1;
            int level = levels.sanitizeDrifLevel(requested, drif);
            if (!placementRules.isElementalDrifPositionValid(drif, slot)) {
                throw new IllegalArgumentException(
                        "Drify żywiołowe mogą znajdować się wyłącznie w broni.");
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
        if (capacity > 0 && usedPower > capacity) {
            log.error(
                    "[SECURITY] Oszustwo API! Przekroczono pojemność. Użyto: {}, Max: {}",
                    usedPower,
                    capacity);
            throw new IllegalArgumentException(
                    "Przekroczono dopuszczalną pojemność drifów w przedmiocie!");
        }
    }
}
