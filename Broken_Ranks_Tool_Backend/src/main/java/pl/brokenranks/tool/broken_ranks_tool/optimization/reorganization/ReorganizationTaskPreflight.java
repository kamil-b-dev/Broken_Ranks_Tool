package pl.brokenranks.tool.broken_ranks_tool.optimization.reorganization;

import static pl.brokenranks.tool.broken_ranks_tool.optimization.engine.rules.DrifOptimizationMath.usedPower;

import java.util.*;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.rules.DrifPowerRules;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.validator.EquipmentPlacementRules;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model.*;

/** Proves only local obstructions; passing these checks is not a feasibility proof. */
final class ReorganizationTaskPreflight {
    private ReorganizationTaskPreflight() {}

    static String blockingReason(OptimizationContext context, EquipmentPlacementRules rules) {
        var options = context.request().getReorganization();
        if (!ReorganizationTaskRules.operational(options)) return null;
        var pool = new ReorganizationPool(context);
        var reservation = options.getReservation();
        if (reservation != null) {
            var slot =
                    context.slots().stream()
                            .filter(s -> s.key().equals(reservation.getSlotKey()))
                            .findFirst()
                            .orElseThrow();
            var fixed = pool.fixed.slots().get(slot.key());
            if (slot.maxDrifs() - fixed.stream().filter(Objects::nonNull).count()
                            < reservation.getFreeSockets()
                    || slot.capacity() - usedPower(fixed) < reservation.getFreeCapacity())
                return "Blokady w wybranym przedmiocie nie pozwalają zwolnić wymaganego miejsca.";
        }
        if (options.requestedInsertions().size() > options.getMaxMoves())
            return "Każdy wstawiany drif wymaga jednego przełożenia. Zwiększ limit przełożeń.";
        int reservedMovableSockets = 0;
        if (reservation != null) {
            var reservedSlot =
                    context.slots().stream()
                            .filter(slot -> slot.key().equals(reservation.getSlotKey()))
                            .findFirst()
                            .orElseThrow();
            long positions =
                    pool.positions.stream()
                            .filter(position -> position.slot().key().equals(reservedSlot.key()))
                            .count();
            long fixedStones =
                    pool.fixed.slots().get(reservedSlot.key()).stream()
                            .filter(Objects::nonNull)
                            .count();
            long fixedEmpty = reservedSlot.maxDrifs() - positions - fixedStones;
            reservedMovableSockets = (int) Math.max(0, reservation.getFreeSockets() - fixedEmpty);
        }
        int usableSockets = pool.positions.size() - reservedMovableSockets;
        int requiredCount = pool.required.values().stream().mapToInt(Integer::intValue).sum();
        if (requiredCount > usableSockets)
            return "Za mało gniazd, aby zachować wymagane drify i wykonać zadanie. Pozwól odkładać drify lub zmniejsz wymagania.";
        for (var source : pool.mandatory) {
            var drif = context.drifs().get(source.stone().templateId());
            int level = source.stone().level();
            for (var upgrade : options.requestedUpgrades())
                if (upgrade.isMaximizeLevel()
                        && upgrade.getSourceSlotKey().equals(source.slotKey())
                        && Objects.equals(upgrade.getSourceDrifIndex(), source.index()))
                    level = pool.baseline.slots().get(source.slotKey()).get(source.index()).level();
            int power = DrifPowerRules.power(drif.getBonusType().getBasePower(), level);
            boolean fits =
                    context.slots().stream()
                            .anyMatch(
                                    slot -> {
                                        if (slot.special()
                                                || pool.positions.stream()
                                                        .noneMatch(
                                                                position ->
                                                                        position.slot()
                                                                                .key()
                                                                                .equals(
                                                                                        slot
                                                                                                .key())))
                                            return false;
                                        String target = pool.targetSlots.get(source);
                                        if (target != null && !slot.key().equals(target))
                                            return false;
                                        if (!rules.isValidDrifSizeForTier(drif, slot.item())
                                                || !rules.isElementalDrifPositionValid(
                                                        drif, slot.key())) return false;
                                        var fixed = pool.fixed.slots().get(slot.key());
                                        int reservedSockets =
                                                reservation != null
                                                                && slot.key()
                                                                        .equals(
                                                                                reservation
                                                                                        .getSlotKey())
                                                        ? reservation.getFreeSockets()
                                                        : 0;
                                        int reservedCapacity =
                                                reservation != null
                                                                && slot.key()
                                                                        .equals(
                                                                                reservation
                                                                                        .getSlotKey())
                                                        ? reservation.getFreeCapacity()
                                                        : 0;
                                        return slot.maxDrifs()
                                                                - fixed.stream()
                                                                        .filter(Objects::nonNull)
                                                                        .count()
                                                        > reservedSockets
                                                && power + usedPower(fixed)
                                                        <= slot.capacity() - reservedCapacity
                                                && fixed.stream()
                                                        .filter(Objects::nonNull)
                                                        .noneMatch(
                                                                p ->
                                                                        p.drif().getBonusType()
                                                                                        == drif
                                                                                                .getBonusType()
                                                                                || rules
                                                                                                .isElementalDamage(
                                                                                                        p.drif()
                                                                                                                .getBonusType())
                                                                                        && rules
                                                                                                .isElementalDamage(
                                                                                                        drif
                                                                                                                .getBonusType()));
                                    });
            if (!fits)
                return "Wskazany drif nie mieści się w żadnym dozwolonym przedmiocie przy obecnym tierze, pojemności i blokadach.";
        }
        for (var slot : context.slots()) {
            long targeted = pool.targetSlots.values().stream().filter(slot.key()::equals).count();
            long available =
                    pool.positions.stream()
                            .filter(position -> position.slot().key().equals(slot.key()))
                            .count();
            if (targeted > available)
                return "W wybranym przedmiocie docelowym jest za mało niezablokowanych gniazd na wskazane drify.";
        }
        return null;
    }
}
