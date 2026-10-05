package pl.brokenranks.tool.broken_ranks_tool.optimization.engine.validation;

import static pl.brokenranks.tool.broken_ranks_tool.optimization.engine.validation.OptimizationPreservedDrifs.preservedIndexes;
import static pl.brokenranks.tool.broken_ranks_tool.optimization.engine.validation.OptimizationPreservedDrifs.requestedLevel;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_BONUS_TYPE;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.ORB_BONUS_TYPE;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.RARITY;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.rules.DrifPowerRules;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.rules.EquipmentRulesRegistry;
import pl.brokenranks.tool.broken_ranks_tool.equipment.dto.EquipmentRequest;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.DrifTemplate;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.ItemTemplate;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.OrbTemplate;
import pl.brokenranks.tool.broken_ranks_tool.equipment.persistence.repository.OrbTemplateRepository;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.validator.EquipmentPlacementRules;
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.OptimizationRequest;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model.OptimizationContext;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model.SlotContext;

/** Validates catalog-backed optimizer input before any invalid slot can be silently omitted. */
@Component
@RequiredArgsConstructor
public final class OptimizationInputValidator {

    private final EquipmentPlacementRules placementRules;
    private final EquipmentRulesRegistry rules;
    private final OrbTemplateRepository orbRepository;

    public String validate(OptimizationContext context) {
        OptimizationRequest request = context.request();
        String catalogError = validateSelectedDrifCatalog(context);
        if (catalogError != null) return catalogError;
        Map<String, SlotContext> validSlots =
                context.slots().stream()
                        .collect(java.util.stream.Collectors.toMap(SlotContext::key, slot -> slot));

        String lockError = validateLockKeys(request, validSlots);
        if (lockError != null) return lockError;
        if (request.getOriginalSlots().keySet().stream().anyMatch(java.util.Objects::isNull)) {
            return "Konfiguracja zawiera pustą nazwę slotu.";
        }

        Map<Long, OrbTemplate> orbs = loadOrbs(request);
        Set<ORB_BONUS_TYPE> usedOrbBonuses = new HashSet<>();

        for (Map.Entry<String, EquipmentRequest.SlotData> entry :
                request.getOriginalSlots().entrySet().stream()
                        .sorted(Map.Entry.comparingByKey())
                        .toList()) {
            String error =
                    validateSlot(
                            entry.getKey(),
                            entry.getValue(),
                            context,
                            validSlots,
                            orbs,
                            usedOrbBonuses);
            if (error != null) return error;
        }
        return OptimizationFeasibilityValidator.validate(context);
    }

    private String validateSelectedDrifCatalog(OptimizationContext context) {
        for (DrifTemplate drif : context.drifs().values()) {
            if (drif == null
                    || drif.getBonusType() == null
                    || !context.request().getPriorities().containsKey(drif.getBonusType())) {
                continue;
            }
            if (!placementRules.isValidDrif(drif)) {
                return "Katalog zawiera niepoprawny drif o ID " + drif.getId() + ".";
            }
        }
        return null;
    }

    private String validateSlot(
            String key,
            EquipmentRequest.SlotData data,
            OptimizationContext context,
            Map<String, SlotContext> validSlots,
            Map<Long, OrbTemplate> orbs,
            Set<ORB_BONUS_TYPE> usedOrbBonuses) {
        if (!rules.getSlotItemRules().containsKey(key))
            return "Nieznany slot ekwipunku: " + key + ".";
        if (data == null) return "Slot " + key + ": konfiguracja slotu jest pusta.";
        if (data.getItemId() == null) {
            return hasStones(data)
                    ? "Slot " + key + ": pusty slot nie może zawierać kamieni."
                    : null;
        }
        ItemTemplate item = context.items().get(data.getItemId());
        if (item == null) {
            return "Slot " + key + ": nie znaleziono przedmiotu o ID " + data.getItemId() + ".";
        }
        if (!placementRules.isValidItem(item, key)) {
            return "Slot " + key + ": przedmiot " + item.getName() + " nie pasuje do tego slotu.";
        }
        Integer stars = data.getItemStars();
        if (stars != null && (stars < 1 || stars > 9)) {
            return "Slot " + key + ": liczba gwiazdek musi mieścić się w zakresie 1–9.";
        }

        SlotContext slot = validSlots.get(key);
        if (slot == null) return "Slot " + key + ": nie można przygotować go do optymalizacji.";
        String orbError = validateOrbs(key, data, item, orbs, usedOrbBonuses);
        if (orbError != null) return orbError;
        Set<Integer> preserved = preservedIndexes(key, data, slot, context.request());
        String drifError = validatePreservedDrifs(key, data, slot, context, preserved);
        if (drifError != null) return drifError;
        return slot.special() ? validateBuiltInDrifs(key, data, item, context) : null;
    }

    private Map<Long, OrbTemplate> loadOrbs(OptimizationRequest request) {
        List<Long> ids =
                request.getOriginalSlots().values().stream()
                        .filter(java.util.Objects::nonNull)
                        .map(EquipmentRequest.SlotData::getOrbIds)
                        .filter(java.util.Objects::nonNull)
                        .flatMap(List::stream)
                        .filter(java.util.Objects::nonNull)
                        .distinct()
                        .toList();
        return orbRepository.findAllById(ids).stream()
                .collect(Collectors.toMap(OrbTemplate::getId, Function.identity()));
    }

    private boolean hasStones(EquipmentRequest.SlotData data) {
        return data.getDrifIds() != null
                        && data.getDrifIds().stream().anyMatch(java.util.Objects::nonNull)
                || data.getOrbIds() != null
                        && data.getOrbIds().stream().anyMatch(java.util.Objects::nonNull)
                || data.getDrifLevels() != null && !data.getDrifLevels().isEmpty();
    }

    private String validateOrbs(
            String key,
            EquipmentRequest.SlotData data,
            ItemTemplate item,
            Map<Long, OrbTemplate> orbs,
            Set<ORB_BONUS_TYPE> usedBonuses) {
        List<Long> ids = data.getOrbIds() != null ? data.getOrbIds() : List.of();
        int limit = item.getRarity() == RARITY.LEGENDARY ? 2 : 1;
        if (ids.size() > limit) return "Slot " + key + ": przekroczono liczbę orbów.";
        boolean gap = false;
        Set<ORB_BONUS_TYPE> local = new HashSet<>();
        for (int index = 0; index < ids.size(); index++) {
            Long id = ids.get(index);
            if (id == null) {
                if (data.getOrbLevels() != null && index < data.getOrbLevels().size()) {
                    return "Slot " + key + ": podano poziom dla nieistniejącego orba.";
                }
                gap = true;
                continue;
            }
            if (gap) return "Slot " + key + ": orby nie mogą zawierać pustej pozycji.";
            OrbTemplate orb = orbs.get(id);
            if (orb == null || orb.getBonusType() == null || orb.getSize() == null) {
                return "Slot " + key + ": nie znaleziono poprawnego orba o ID " + id + ".";
            }
            if (!placementRules.isValidOrb(orb, key, item, index > 0)) {
                return "Slot " + key + ": orb nie pasuje do tego slotu lub pozycji.";
            }
            if (!placementRules.isValidOrbSizeForTier(orb, item)) {
                return "Slot " + key + ": rozmiar orba przekracza tier przedmiotu.";
            }
            Integer level =
                    data.getOrbLevels() != null && index < data.getOrbLevels().size()
                            ? data.getOrbLevels().get(index)
                            : 1;
            if (level == null || level < 1 || level > orb.getSize().getMaxLevel()) {
                return "Slot " + key + ": poziom orba jest poza dozwolonym zakresem.";
            }
            if (!local.add(orb.getBonusType())) {
                return "Slot " + key + ": orby powtarzają ten sam typ bonusu.";
            }
            if (!usedBonuses.add(orb.getBonusType())) {
                return "Bonus orba " + orb.getBonusType().name() + " powtarza się w zestawie.";
            }
        }
        if (data.getOrbLevels() != null && data.getOrbLevels().size() > ids.size()) {
            return "Slot " + key + ": podano poziom dla nieistniejącego orba.";
        }
        return null;
    }

    private String validateBuiltInDrifs(
            String key,
            EquipmentRequest.SlotData data,
            ItemTemplate item,
            OptimizationContext context) {
        String baseName =
                java.util.Objects.toString(item.getName(), "")
                        .replaceFirst("\\s+[IVX]+$", "")
                        .trim();
        List<String> expected =
                EquipmentRulesRegistry.EPIC_BUILTIN_DRIFS.getOrDefault(baseName, List.of());
        List<Long> ids = data.getDrifIds() != null ? data.getDrifIds() : List.of();
        if (ids.size() != expected.size()) {
            return "Slot " + key + ": konfiguracja wbudowanych drifów nie pasuje do przedmiotu.";
        }
        for (int index = 0; index < ids.size(); index++) {
            DrifTemplate drif = ids.get(index) != null ? context.drifs().get(ids.get(index)) : null;
            if (drif == null
                    || drif.getSize()
                            != pl.brokenranks
                                    .tool
                                    .broken_ranks_tool
                                    .equipment
                                    .domain
                                    .enums
                                    .DRIF_SIZE
                                    .MAGNIDRIF
                    || !expected.get(index).equals(drif.getBonusType().name())) {
                return "Slot " + key + ": nieprawidłowy wbudowany drif na pozycji " + index + ".";
            }
        }
        return null;
    }

    private String validatePreservedDrifs(
            String key,
            EquipmentRequest.SlotData data,
            SlotContext slot,
            OptimizationContext context,
            Set<Integer> preserved) {
        List<Long> ids = data.getDrifIds() != null ? data.getDrifIds() : List.of();
        Set<DRIF_BONUS_TYPE> bonuses = new HashSet<>();
        int usedPower = 0;
        int elemental = 0;
        if (preserved.stream().anyMatch(java.util.Objects::isNull)) {
            return "Slot " + key + ": blokada drifa zawiera nieprawidłowy indeks.";
        }
        for (Integer index : preserved.stream().sorted().toList()) {
            if (index == null || index < 0 || index >= ids.size() || ids.get(index) == null) {
                return "Slot " + key + ": blokada drifa wskazuje pustą lub nieistniejącą pozycję.";
            }
            if (!slot.special() && index >= slot.maxDrifs()) {
                return "Slot " + key + ": blokada drifa przekracza liczbę dostępnych gniazd.";
            }
            DrifTemplate drif = context.drifs().get(ids.get(index));
            if (drif == null || !placementRules.isValidDrif(drif)) {
                return "Slot "
                        + key
                        + ": nie znaleziono poprawnego drifa o ID "
                        + ids.get(index)
                        + ".";
            }
            if (!placementRules.isValidDrifSizeForTier(drif, slot.item())) {
                return "Slot "
                        + key
                        + ": rozmiar zablokowanego drifa nie pasuje do tieru przedmiotu.";
            }
            if (!placementRules.isElementalDrifPositionValid(drif, key)) {
                return "Slot " + key + ": drif żywiołowy może znajdować się wyłącznie w broni.";
            }
            if (!bonuses.add(drif.getBonusType())) {
                return "Slot " + key + ": zablokowane drify powtarzają ten sam typ bonusu.";
            }
            if (placementRules.isElementalDamage(drif.getBonusType()) && ++elemental > 1) {
                return "Slot " + key + ": broń może zawierać tylko jeden drif żywiołowy.";
            }
            Integer level = requestedLevel(data, index);
            if (level == null) {
                return "Slot " + key + ": poziom zablokowanego drifa jest pusty.";
            }
            if (level < 1 || drif.getSize() != null && level > drif.getSize().getMaxLevel()) {
                return "Slot "
                        + key
                        + ": poziom zablokowanego drifa jest poza dozwolonym zakresem.";
            }
            if (!slot.special()) {
                usedPower += DrifPowerRules.power(drif.getBonusType().getBasePower(), level);
            }
        }
        if (!slot.special() && usedPower > slot.capacity()) {
            return "Slot " + key + ": zablokowane drify przekraczają pojemność przedmiotu.";
        }
        return validatePreservedLevelKeys(key, data, preserved);
    }

    private String validatePreservedLevelKeys(
            String key, EquipmentRequest.SlotData data, Set<Integer> preserved) {
        if (data.getDrifLevels() == null || preserved.isEmpty()) return null;
        List<String> invalid = new ArrayList<>();
        for (String levelKey : data.getDrifLevels().keySet()) {
            try {
                int index = Integer.parseInt(levelKey);
                if (String.valueOf(index).equals(levelKey) && preserved.contains(index)) continue;
            } catch (NumberFormatException ignored) {
                // Report malformed keys below when the slot configuration is preserved.
            }
            if (preserved.size() == (data.getDrifIds() != null ? data.getDrifIds().size() : 0)) {
                invalid.add(levelKey);
            }
        }
        return invalid.isEmpty()
                ? null
                : "Slot " + key + ": mapa poziomów zawiera nieprawidłowy indeks drifa.";
    }

    private String validateLockKeys(
            OptimizationRequest request, Map<String, SlotContext> validSlots) {
        if (request.getLockedSlots() != null) {
            if (request.getLockedSlots().stream().anyMatch(java.util.Objects::isNull)) {
                return "Blokada slotu ma pustą nazwę.";
            }
            for (String key : request.getLockedSlots().stream().sorted().toList()) {
                if (!validSlots.containsKey(key)) {
                    return "Blokada slotu " + key + " nie wskazuje wyposażonego, poprawnego slotu.";
                }
            }
        }
        if (request.getLockedDrifs() != null) {
            if (request.getLockedDrifs().keySet().stream().anyMatch(java.util.Objects::isNull)) {
                return "Blokada drifa ma pustą nazwę slotu.";
            }
            for (String key : request.getLockedDrifs().keySet().stream().sorted().toList()) {
                if (!validSlots.containsKey(key)) {
                    return "Blokada drifa w slocie "
                            + key
                            + " nie wskazuje wyposażonego, poprawnego slotu.";
                }
                if (request.getLockedDrifs().get(key) == null) {
                    return "Blokada drifa w slocie " + key + " ma pustą listę indeksów.";
                }
            }
        }
        return null;
    }
}
