package pl.brokenranks.tool.broken_ranks_tool.optimization.reorganization;

import static org.junit.jupiter.api.Assertions.*;
import static pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model.OptimizationEngineFixture.*;

import java.util.*;
import org.junit.jupiter.api.Test;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.*;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.rules.EquipmentRulesRegistry;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.DrifTemplate;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.validator.EquipmentPlacementRules;
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.*;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model.*;

class ReorganizationTaskPreflightTests {
    private final EquipmentPlacementRules rules =
            new EquipmentPlacementRules(new EquipmentRulesRegistry());
    private final DrifTemplate crit = drif(10, DRIF_BONUS_TYPE.CRITICAL_CHANCE);
    private final DrifTemplate mana = drif(11, DRIF_BONUS_TYPE.MANA_REGEN);
    private final DrifTemplate stamina = drif(12, DRIF_BONUS_TYPE.STAMINA_REGEN);

    private OptimizationRequest insertionRequest(String target, DrifTemplate... stones) {
        var request = request(DRIF_BONUS_TYPE.CRITICAL_CHANCE);
        var options = new ReorganizationOptions();
        options.setTask(ReorganizationOptions.Task.INSERT);
        var entries = new ArrayList<OptimizationRequest.BackpackDrif>();
        var insertions = new ArrayList<ReorganizationOptions.Insertion>();
        for (int i = 0; i < stones.length; i++) {
            var entry = new OptimizationRequest.BackpackDrif();
            entry.setId("chosen-" + i);
            entry.setTemplateId(stones[i].getId());
            entry.setLevel(6);
            entries.add(entry);
            var insertion = new ReorganizationOptions.Insertion();
            insertion.setEntryId(entry.getId());
            insertion.setTargetSlotKey(target);
            insertions.add(insertion);
        }
        options.setInsertions(insertions);
        request.setBackpackDrifs(entries);
        request.setReorganization(options);
        return request;
    }

    private String reason(OptimizationRequest request, SlotContext... slots) {
        return ReorganizationTaskPreflight.blockingReason(context(request, slots), rules);
    }

    @Test
    void leavesLegacyRequestsToTheirOwnSearchRules() {
        assertNull(reason(request(DRIF_BONUS_TYPE.CRITICAL_CHANCE)));
    }

    @Test
    void everySelectedInsertionConsumesOneMoveEvenWhenItFitsDirectly() {
        var request = insertionRequest("helmet", crit, mana);
        request.getReorganization().setMaxMoves(1);
        var helmet = slot("helmet", 12, 3, 0, false, Set.of(), crit, mana);
        assertTrue(reason(request, helmet).contains("Zwiększ limit przełożeń"));
        request.getReorganization().setMaxMoves(2);
        assertNull(reason(request, helmet));
    }

    @Test
    void countsEquippedRequiredStonesUnlessUnequippingIsAllowed() {
        var request = insertionRequest(null, mana);
        var helmet = slot("helmet", 12, 1, 0, false, Set.of(), crit, mana);
        helmet.original().setDrifIds(List.of(crit.getId()));
        assertTrue(reason(request, helmet).contains("Za mało gniazd"));
        request.getReorganization().setAllowUnequip(true);
        assertNull(reason(request, helmet));
    }

    @Test
    void rejectsSeveralTargetedStonesDespiteEnoughGlobalSpaceAndIndividualFits() {
        var request = insertionRequest("helmet", crit, mana, stamina);
        var helmet = slot("helmet", 12, 2, 0, false, Set.of(), crit, mana, stamina);
        var armor = slot("armor", 12, 2, 0, false, Set.of(), crit, mana, stamina);
        assertTrue(reason(request, helmet, armor).contains("przedmiocie docelowym"));
        request.getReorganization().getInsertions().getLast().setTargetSlotKey("armor");
        assertNull(reason(request, helmet, armor));
    }

    @Test
    void aFixedDuplicateCannotBeReplacedByAnIdenticalInsertion() {
        var request = insertionRequest("helmet", crit);
        var helmet = slot("helmet", 12, 3, 0, false, Set.of(0), crit, mana);
        helmet.original().setDrifIds(List.of(crit.getId()));
        assertTrue(reason(request, helmet).contains("blokadach"));
        request.getBackpackDrifs().getFirst().setTemplateId(mana.getId());
        assertNull(reason(request, helmet));
    }

    @Test
    void differentElementalTypesStillConflictWithAFixedElementInTheWeapon() {
        var fire = drif(20, DRIF_BONUS_TYPE.DAMAGE_FIRE);
        var frost = drif(21, DRIF_BONUS_TYPE.DAMAGE_FROST);
        var request = insertionRequest("weapon", frost);
        var weapon = slot("weapon", 100, 3, 0, false, Set.of(0), fire, frost, mana);
        weapon.original().setDrifIds(List.of(fire.getId()));
        assertTrue(reason(request, weapon).contains("blokadach"));
        request.getBackpackDrifs().getFirst().setTemplateId(mana.getId());
        assertNull(reason(request, weapon));
    }

    @Test
    void fixedStonePowerCountsEvenWithFreeSockets() {
        var request = insertionRequest("helmet", crit);
        var helmet = slot("helmet", 4, 3, 0, false, Set.of(0), crit, mana);
        helmet.original().setDrifIds(List.of(mana.getId()));
        assertTrue(reason(request, helmet).contains("pojemności"));
        var roomier = slot("helmet", 12, 3, 0, false, Set.of(0), crit, mana);
        roomier.original().setDrifIds(List.of(mana.getId()));
        assertNull(reason(request, roomier));
    }

    @Test
    void checksSizeAndElementPlacementIndependentlyOfAvailableCapacity() {
        var large = drif(30, DRIF_BONUS_TYPE.CRITICAL_CHANCE);
        large.setSize(DRIF_SIZE.ARCYDRIF);
        var request = insertionRequest("helmet", large);
        var helmet = slot("helmet", 100, 2, 0, false, Set.of(), large);
        helmet.item().setTier("III");
        assertTrue(reason(request, helmet).contains("tierze"));
        helmet.item().setTier("X");
        assertNull(reason(request, helmet));
        large.setBonusType(DRIF_BONUS_TYPE.DAMAGE_FIRE);
        assertTrue(reason(request, helmet).contains("tierze, pojemności i blokadach"));
    }

    @Test
    void aLockedEmptySocketCannotBeUsedForAnInsertion() {
        var request = insertionRequest("helmet", crit);
        var helmet = slot("helmet", 12, 2, 0, false, Set.of(0, 1), crit);
        var armor = slot("armor", 12, 2, 0, false, Set.of(), crit);
        assertTrue(reason(request, helmet, armor).contains("blokadach"));
        request.getReorganization().getInsertions().getFirst().setTargetSlotKey("armor");
        assertNull(reason(request, helmet, armor));
    }

    @Test
    void highestLevelSearchIsNotRejectedWhenOnlyTheOriginalLevelCanFit() {
        var request = request(DRIF_BONUS_TYPE.CRITICAL_CHANCE);
        crit.setSize(DRIF_SIZE.ARCYDRIF);
        var helmet = slot("helmet", 4, 2, 0, false, Set.of(), crit);
        helmet.original().setDrifIds(List.of(crit.getId()));
        helmet.original().setDrifLevels(Map.of("0", 6));
        var options = new ReorganizationOptions();
        options.setTask(ReorganizationOptions.Task.UPGRADE);
        var upgrade = new ReorganizationOptions.Upgrade();
        upgrade.setSourceSlotKey("helmet");
        upgrade.setSourceDrifIndex(0);
        upgrade.setTargetTemplateId(crit.getId());
        upgrade.setTargetLevel(21);
        options.setUpgrade(upgrade);
        request.setReorganization(options);
        assertTrue(reason(request, helmet).contains("pojemności"));
        upgrade.setMaximizeLevel(true);
        assertNull(reason(request, helmet));
    }

    @Test
    void reservedSocketsCannotDisplaceRequiredStonesWithoutPermission() {
        var request = request(DRIF_BONUS_TYPE.CRITICAL_CHANCE);
        var options = new ReorganizationOptions();
        options.setTask(ReorganizationOptions.Task.RESERVE);
        var reservation = new ReorganizationOptions.Reservation();
        reservation.setSlotKey("helmet");
        reservation.setFreeSockets(2);
        reservation.setFreeCapacity(12);
        options.setReservation(reservation);
        request.setReorganization(options);
        var helmet = slot("helmet", 12, 2, 0, false, Set.of(), crit);
        helmet.original().setDrifIds(List.of(crit.getId()));
        assertTrue(reason(request, helmet).contains("Za mało gniazd"));
        options.setAllowUnequip(true);
        assertNull(reason(request, helmet));
    }

    @Test
    void distinguishesFixedSocketAndFixedPowerObstructionsToReservation() {
        var request = request(DRIF_BONUS_TYPE.CRITICAL_CHANCE);
        var options = new ReorganizationOptions();
        options.setTask(ReorganizationOptions.Task.RESERVE);
        var reservation = new ReorganizationOptions.Reservation();
        reservation.setSlotKey("helmet");
        options.setReservation(reservation);
        request.setReorganization(options);
        var helmet = slot("helmet", 12, 3, 0, false, Set.of(0), crit);
        helmet.original().setDrifIds(List.of(crit.getId()));
        reservation.setFreeSockets(3);
        assertTrue(reason(request, helmet).contains("Blokady"));
        reservation.setFreeSockets(1);
        reservation.setFreeCapacity(9);
        assertTrue(reason(request, helmet).contains("Blokady"));
        reservation.setFreeCapacity(8);
        assertNull(reason(request, helmet));
    }
}
