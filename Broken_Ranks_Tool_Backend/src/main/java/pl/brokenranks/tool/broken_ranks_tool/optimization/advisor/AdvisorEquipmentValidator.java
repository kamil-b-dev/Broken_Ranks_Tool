package pl.brokenranks.tool.broken_ranks_tool.optimization.advisor;

import static pl.brokenranks.tool.broken_ranks_tool.optimization.advisor.AdvisorSlotData.*;

import java.util.*;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.*;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.rules.DrifPowerRules;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.rules.EquipmentRulesRegistry;
import pl.brokenranks.tool.broken_ranks_tool.equipment.dto.EquipmentRequest.SlotData;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.*;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.validator.UpgradeLevelPolicy;

/** Validates optimizer candidates against equipment and uniqueness rules. */
final class AdvisorEquipmentValidator {
    private final AdvisorEquipmentModel model;
    private final EquipmentRulesRegistry rules;
    private final UpgradeLevelPolicy levels;

    AdvisorEquipmentValidator(
            AdvisorEquipmentModel model, EquipmentRulesRegistry rules, UpgradeLevelPolicy levels) {
        this.model = model;
        this.rules = rules;
        this.levels = levels;
    }

    boolean valid(Map<String, SlotData> slots) {
        Set<ORB_BONUS_TYPE> used = new HashSet<>();
        for (var entry : slots.entrySet()) {
            if (!validSlot(entry.getKey(), entry.getValue())) return false;
            if (entry.getValue().getOrbIds() == null) continue;
            for (Long id : entry.getValue().getOrbIds()) {
                if (id != null && !used.add(model.templates.orbs().get(id).getBonusType()))
                    return false;
            }
        }
        return true;
    }

    boolean validSlot(String key, SlotData slot) {
        ItemTemplate item = model.item(slot);
        if (!model.placement.isValidItem(item, key) || stars(slot) < 1 || stars(slot) > 9)
            return false;
        Set<DRIF_BONUS_TYPE> types = new HashSet<>();
        int count = 0, power = 0, elements = 0;
        List<String> builtins =
                rules.EPIC_BUILTIN_DRIFS.getOrDefault(
                        Objects.toString(item.getName(), "").replaceFirst("\\s+[IVX]+$", ""),
                        List.of());
        if (model.special(slot)
                && (size(slot) != builtins.size()
                        || slot.getDrifIds() != null
                                && slot.getDrifIds().stream().anyMatch(Objects::isNull)))
            return false;
        if (!validDrifLevelKeys(slot)) return false;
        for (int i = 0; i < size(slot); i++) {
            if (id(slot, i) == null) continue;
            DrifTemplate drif = model.templates.drifs().get(id(slot, i));
            if (!model.placement.isValidDrif(drif)
                    || drif.getSize() == null
                    || !types.add(drif.getBonusType())
                    || level(slot, i) < 1
                    || level(slot, i) > drif.getSize().getMaxLevel()) return false;
            if (model.special(slot)) {
                if (drif.getSize() != DRIF_SIZE.MAGNIDRIF
                        || i >= builtins.size()
                        || !builtins.get(i).equals(drif.getBonusType().name())) return false;
            } else if (!model.placement.isValidDrifSizeForTier(drif, item)
                    || !model.placement.isElementalDrifPositionValid(drif, key)) return false;
            if (model.placement.isElementalDamage(drif.getBonusType())) elements++;
            count++;
            power += DrifPowerRules.power(drif.getBonusType().getBasePower(), level(slot, i));
            if (!model.special(slot) && i >= model.maxDrifs(slot)) return false;
        }
        if (!model.special(slot)
                && (count > model.maxDrifs(slot)
                        || elements > 1
                        || power > levels.calculateItemCapacity(item, stars(slot)))) return false;
        return validOrbs(key, slot, item);
    }

    private boolean validOrbs(String key, SlotData slot, ItemTemplate item) {
        List<Long> orbIds = slot.getOrbIds() == null ? List.of() : slot.getOrbIds();
        if (orbIds.size() > (item.getRarity() == RARITY.LEGENDARY ? 2 : 1)) return false;
        if (slot.getOrbLevels() != null && slot.getOrbLevels().size() > orbIds.size()) return false;
        Set<ORB_BONUS_TYPE> types = new HashSet<>();
        boolean gap = false;
        for (int i = 0; i < orbIds.size(); i++) {
            if (orbIds.get(i) == null) {
                if (slot.getOrbLevels() != null && i < slot.getOrbLevels().size()) return false;
                gap = true;
                continue;
            }
            OrbTemplate orb = model.templates.orbs().get(orbIds.get(i));
            if (slot.getOrbLevels() != null
                    && i < slot.getOrbLevels().size()
                    && slot.getOrbLevels().get(i) == null) return false;
            int level = orbLevel(slot, i);
            if (gap
                    || !model.placement.isValidOrb(orb, key, item, i > 0)
                    || !model.placement.isValidOrbSizeForTier(orb, item)
                    || orb.getSize() == null
                    || level < 1
                    || level > orb.getSize().getMaxLevel()
                    || !types.add(orb.getBonusType())) return false;
        }
        return true;
    }

    private boolean validDrifLevelKeys(SlotData slot) {
        if (slot.getDrifLevels() == null) return true;
        for (var entry : slot.getDrifLevels().entrySet()) {
            try {
                int index = Integer.parseInt(entry.getKey());
                if (String.valueOf(index).equals(entry.getKey())
                        && index >= 0
                        && index < size(slot)
                        && id(slot, index) != null
                        && entry.getValue() != null) continue;
            } catch (NumberFormatException ignored) {
                // Invalid keys are rejected below.
            }
            return false;
        }
        return true;
    }
}
