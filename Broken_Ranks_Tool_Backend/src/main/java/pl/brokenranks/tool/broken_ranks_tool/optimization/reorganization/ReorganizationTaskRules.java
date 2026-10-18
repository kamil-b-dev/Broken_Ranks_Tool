package pl.brokenranks.tool.broken_ranks_tool.optimization.reorganization;

import java.util.*;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_BONUS_TYPE;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.validator.EquipmentPlacementRules;
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.*;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model.*;

/** Keeps operational tasks separate from catalog-building preferences. */
public final class ReorganizationTaskRules {
    private ReorganizationTaskRules() {}

    static boolean operational(ReorganizationOptions options) {
        return options != null && options.getTask() != ReorganizationOptions.Task.ARRANGE;
    }

    public static String configure(OptimizationRequest request) {
        if (request == null || request.getReorganization() == null) return null;
        var options = request.getReorganization();
        if (request.getMode() != OptimizationMode.REORGANIZE)
            return "Zadanie reorganizacji wymaga trybu Reorganizacja.";
        if (options.getTask() == null
                || options.getTask() == ReorganizationOptions.Task.ARRANGE
                        && options.getGoal() == null) return "Wybierz zadanie reorganizacji.";
        if (options.getMaxMoves() == null
                || options.getMaxMoves() < 1
                || options.getMaxMoves() > 50)
            return "Limit przełożeń musi być liczbą całkowitą od 1 do 50.";
        if (options.getUpgrade() != null && options.getUpgrades() != null)
            return "Ulepszenia muszą być przekazane jako jedna lista.";
        var upgrades = options.requestedUpgrades();
        if (upgrades.size() > 36
                || upgrades.stream().anyMatch(Objects::isNull)
                || (options.getTask() == ReorganizationOptions.Task.UPGRADE) != !upgrades.isEmpty()
                || (options.getTask() == ReorganizationOptions.Task.INSERT)
                        != (options.getInsertEntryId() != null)
                || (options.getTask() == ReorganizationOptions.Task.RESERVE)
                        != (options.getReservation() != null))
            return "Uzupełnij wyłącznie parametry wybranego zadania.";
        if (upgrades.stream().anyMatch(ReorganizationOptions.Upgrade::isMaximizeLevel)
                && upgrades.size() != 1)
            return "Szukanie najwyższego poziomu dotyczy jednego kamienia.";
        if (options.getProtectedModifiers() != null) {
            if (options.getProtectedModifiers().size() > 32) return "Wybrano zbyt wiele ochron.";
            for (var entry : options.getProtectedModifiers().entrySet())
                if (entry.getKey() == null
                        || entry.getValue() == null
                        || !Double.isFinite(entry.getValue().getLoss())
                        || entry.getValue().getLoss() < 0)
                    return "Dopuszczalny spadek moda musi być nieujemną, skończoną liczbą.";
        }
        var goal = options.getGoal() == null ? DRIF_BONUS_TYPE.CRITICAL_CHANCE : options.getGoal();
        if (operational(options)) {
            Map<DRIF_BONUS_TYPE, Integer> priorities = new EnumMap<>(DRIF_BONUS_TYPE.class);
            for (var type : DRIF_BONUS_TYPE.values()) priorities.put(type, 1);
            request.setPriorities(priorities);
        } else request.setPriorities(Map.of(goal, 30));
        request.setTargetQuantities(Map.of());
        request.setDrifSizeQuantities(Map.of());
        request.setForceCapBonuses(Set.of());
        request.setForcedPercentageTargets(Map.of());
        request.setMaximizeBonuses(operational(options) ? Set.of() : Set.of(goal));
        return null;
    }

    static String validateUpgrade(OptimizationContext context, EquipmentPlacementRules rules) {
        var options = context.request().getReorganization();
        if (options == null) return null;
        Set<String> sources = new HashSet<>();
        for (var upgrade : options.requestedUpgrades()) {
            SlotContext slot =
                    context.slots().stream()
                            .filter(s -> s.key().equals(upgrade.getSourceSlotKey()))
                            .findFirst()
                            .orElse(null);
            int index = upgrade.getSourceDrifIndex();
            if (slot == null
                    || slot.special()
                    || index < 0
                    || index >= slot.maxDrifs()
                    || slot.lockedIndices().contains(index)
                    || context.request().getLockedSlots() != null
                            && context.request().getLockedSlots().contains(slot.key())
                    || slot.original().getDrifIds() == null
                    || index >= slot.original().getDrifIds().size()
                    || slot.original().getDrifIds().get(index) == null
                    || !sources.add(slot.key() + ":" + index))
                return "Wybierz różne, założone i niezablokowane zwykłe drify do ulepszenia.";
            var source = context.drifs().get(slot.original().getDrifIds().get(index));
            var target = context.drifs().get(upgrade.getTargetTemplateId());
            int level =
                    slot.original().getDrifLevels() == null
                            ? 1
                            : slot.original()
                                    .getDrifLevels()
                                    .getOrDefault(String.valueOf(index), 1);
            if (!rules.isValidDrif(target)
                    || source.getBonusType() != target.getBonusType()
                    || target.getSize().ordinal() < source.getSize().ordinal()
                    || upgrade.getTargetLevel() < level
                    || upgrade.getTargetLevel() > target.getSize().getMaxLevel()
                    || !upgrade.isMaximizeLevel()
                            && upgrade.getTargetLevel() == level
                            && target.getSize() == source.getSize())
                return "Ulepszenie musi zachować typ drifa i zwiększyć poziom lub rozmiar, bez ich obniżania.";
        }
        if (options.getTask() == ReorganizationOptions.Task.INSERT
                && (context.request().getBackpackDrifs() == null
                        || context.request().getBackpackDrifs().stream()
                                .noneMatch(
                                        entry -> entry.getId().equals(options.getInsertEntryId()))))
            return "Wybierz konkretny osobny drif z plecaka.";
        var reservation = options.getReservation();
        if (reservation != null) {
            var slot =
                    context.slots().stream()
                            .filter(s -> s.key().equals(reservation.getSlotKey()))
                            .findFirst()
                            .orElse(null);
            if (slot == null
                    || slot.special()
                    || reservation.getFreeSockets() < 0
                    || reservation.getFreeSockets() > slot.maxDrifs()
                    || reservation.getFreeCapacity() < 0
                    || reservation.getFreeCapacity() > slot.capacity()
                    || reservation.getFreeCapacity() == 0 && reservation.getFreeSockets() == 0)
                return "Wskaż przedmiot oraz dostępną liczbę wolnych gniazd lub pojemność.";
        }
        return null;
    }
}
