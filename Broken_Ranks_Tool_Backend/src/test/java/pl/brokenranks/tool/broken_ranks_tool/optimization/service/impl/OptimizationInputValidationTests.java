package pl.brokenranks.tool.broken_ranks_tool.optimization.service.impl;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.junit.jupiter.api.Test;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_BONUS_TYPE;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.ITEM_CATEGORY;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.RARITY;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.DrifTemplate;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.ItemTemplate;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.EquipmentStatsCalculatorService;
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.OptimizationRequest;
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.OptimizationResponse;

class OptimizationInputValidationTests extends CustomModsOptimizationTestSupport {

    @Test
    void rejectsUnknownItemInsteadOfSilentlyOmittingItsSlot() {
        ItemTemplate item = item(1L, 12);
        OptimizationRequest request = request(999L, priorities());

        OptimizationResponse response = service(item, List.of(), calculator()).optimize(request);

        assertRejected(response, "nie znaleziono przedmiotu o ID 999");
    }

    @Test
    void rejectsItemThatDoesNotFitItsRequestedSlot() {
        ItemTemplate armor = item(1L, 12, ITEM_CATEGORY.ARMOR);
        OptimizationRequest request = request(armor.getId(), priorities());

        OptimizationResponse response = service(armor, List.of(), calculator()).optimize(request);

        assertRejected(response, "nie pasuje do tego slotu");
    }

    @Test
    void rejectsZeroStarsInsteadOfNormalizingThemToOne() {
        ItemTemplate item = item(1L, 12);
        OptimizationRequest request = request(item.getId(), priorities());
        request.getOriginalSlots().get("helmet").setItemStars(0);

        OptimizationResponse response = service(item, List.of(), calculator()).optimize(request);

        assertRejected(response, "zakresie 1–9");
    }

    @Test
    void rejectsLockPointingAtAnEmptyDrifPosition() {
        ItemTemplate item = item(1L, 12);
        OptimizationRequest request = request(item.getId(), priorities());
        request.setLockedDrifs(Map.of("helmet", Set.of(0)));

        OptimizationResponse response = service(item, List.of(), calculator()).optimize(request);

        assertRejected(response, "pustą lub nieistniejącą pozycję");
    }

    @Test
    void rejectsNullLockedIndexCollectionWithBusinessMessage() {
        ItemTemplate item = item(1L, 12);
        OptimizationRequest request = request(item.getId(), priorities());
        Map<String, Set<Integer>> locks = new HashMap<>();
        locks.put("helmet", null);
        request.setLockedDrifs(locks);

        OptimizationResponse response = service(item, List.of(), calculator()).optimize(request);

        assertRejected(response, "ma pustą listę indeksów");
    }

    @Test
    void rejectsInvalidLockedDrifLevelInsteadOfSanitizingIt() {
        ItemTemplate item = item(1L, 12);
        DrifTemplate drif = drif(10L, DRIF_BONUS_TYPE.CRITICAL_CHANCE, 2.0, 1.0);
        OptimizationRequest request = request(item.getId(), priorities());
        request.getOriginalSlots().get("helmet").setDrifIds(List.of(drif.getId()));
        request.getOriginalSlots().get("helmet").setDrifLevels(Map.of("0", 22));
        request.setLockedDrifs(Map.of("helmet", Set.of(0)));

        OptimizationResponse response =
                service(item, List.of(drif), calculator()).optimize(request);

        assertRejected(response, "poziom zablokowanego drifa");
    }

    @Test
    void rejectsElementalDrifLockedOutsideWeapon() {
        ItemTemplate item = item(1L, 12);
        DrifTemplate elemental = drif(10L, DRIF_BONUS_TYPE.DAMAGE_FIRE, 2.0, 1.0);
        OptimizationRequest request = request(item.getId(), priorities());
        request.getOriginalSlots().get("helmet").setDrifIds(List.of(elemental.getId()));
        request.getOriginalSlots().get("helmet").setDrifLevels(Map.of("0", 1));
        request.setLockedDrifs(Map.of("helmet", Set.of(0)));

        OptimizationResponse response =
                service(item, List.of(elemental), calculator()).optimize(request);

        assertRejected(response, "wyłącznie w broni");
    }

    @Test
    void rejectsLockedDrifsThatAlreadyExceedItemCapacity() {
        ItemTemplate item = item(1L, 1);
        DrifTemplate drif = drif(10L, DRIF_BONUS_TYPE.CRITICAL_CHANCE, 2.0, 1.0);
        OptimizationRequest request = request(item.getId(), priorities());
        request.getOriginalSlots().get("helmet").setDrifIds(List.of(drif.getId()));
        request.getOriginalSlots().get("helmet").setDrifLevels(Map.of("0", 1));
        request.setLockedDrifs(Map.of("helmet", Set.of(0)));

        OptimizationResponse response =
                service(item, List.of(drif), calculator()).optimize(request);

        assertRejected(response, "przekraczają pojemność");
    }

    @Test
    void acceptsValidLockedDrif() {
        ItemTemplate item = item(1L, 12);
        DrifTemplate drif = drif(10L, DRIF_BONUS_TYPE.CRITICAL_CHANCE, 2.0, 1.0);
        OptimizationRequest request = request(item.getId(), priorities());
        request.getOriginalSlots().get("helmet").setDrifIds(List.of(drif.getId()));
        request.getOriginalSlots().get("helmet").setDrifLevels(Map.of("0", 1));
        request.setLockedDrifs(Map.of("helmet", Set.of(0)));

        OptimizationResponse response =
                service(item, List.of(drif), calculator()).optimize(request);

        assertTrue(response.getSummary().isSuccess());
    }

    @Test
    void rejectsUnknownSlotAndStonesAttachedToAnEmptySlot() {
        ItemTemplate item = item(1L, 12);
        OptimizationRequest unknownSlot = request(item.getId(), priorities());
        unknownSlot.setOriginalSlots(Map.of("invented", slot(item.getId())));
        assertRejected(
                service(item, List.of(), calculator()).optimize(unknownSlot),
                "Nieznany slot ekwipunku");

        OptimizationRequest empty = request(item.getId(), priorities());
        var emptyData = slot(null);
        emptyData.setDrifLevels(Map.of("0", 1));
        empty.setOriginalSlots(Map.of("helmet", emptyData));
        assertRejected(
                service(item, List.of(), calculator()).optimize(empty),
                "pusty slot nie może zawierać kamieni");
    }

    @Test
    void rejectsUnknownOrbInsteadOfIgnoringIt() {
        ItemTemplate item = item(1L, 12);
        OptimizationRequest request = request(item.getId(), priorities());
        request.getOriginalSlots().get("helmet").setOrbIds(List.of(999L));
        request.getOriginalSlots().get("helmet").setOrbLevels(List.of(1));

        assertRejected(
                service(item, List.of(), calculator()).optimize(request),
                "nie znaleziono poprawnego orba");
    }

    @Test
    void rejectsIncompleteBuiltInDrifIdentity() {
        ItemTemplate epic = item(1L, 0);
        epic.setName("Washi");
        epic.setRarity(RARITY.EPIC);
        DrifTemplate critical = drif(10L, DRIF_BONUS_TYPE.CRITICAL_CHANCE, 2.0, 1.0);
        critical.setSize(
                pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_SIZE.MAGNIDRIF);
        OptimizationRequest request = request(epic.getId(), priorities());
        request.getOriginalSlots().get("helmet").setDrifIds(List.of(critical.getId()));
        request.getOriginalSlots().get("helmet").setDrifLevels(Map.of("0", 1));

        assertRejected(
                service(epic, List.of(critical), calculator()).optimize(request),
                "konfiguracja wbudowanych drifów");
    }

    @Test
    void rejectsMinimumBlockedByAWholeLockedSlot() {
        ItemTemplate item = item(1L, 12);
        DrifTemplate drif = drif(10L, DRIF_BONUS_TYPE.CRITICAL_CHANCE, 2.0, 1.0);
        OptimizationRequest request = request(item.getId(), priorities());
        request.setLockedSlots(Set.of("helmet"));
        request.setTargetQuantities(
                Map.of(
                        DRIF_BONUS_TYPE.CRITICAL_CHANCE,
                        new OptimizationRequest.QuantityRange(1, 1)));

        assertRejected(
                service(item, List.of(drif), calculator()).optimize(request),
                "fizycznie nieosiągalne");
    }

    @Test
    void rejectsMaximumAlreadyExceededByLockedDrifs() {
        ItemTemplate helmet = item(1L, 12, ITEM_CATEGORY.HELMET);
        ItemTemplate armor = item(2L, 12, ITEM_CATEGORY.ARMOR);
        DrifTemplate drif = drif(10L, DRIF_BONUS_TYPE.CRITICAL_CHANCE, 2.0, 1.0);
        var helmetSlot = slot(helmet.getId());
        helmetSlot.setDrifIds(List.of(drif.getId()));
        helmetSlot.setDrifLevels(Map.of("0", 1));
        var armorSlot = slot(armor.getId());
        armorSlot.setDrifIds(List.of(drif.getId()));
        armorSlot.setDrifLevels(Map.of("0", 1));
        OptimizationRequest request = request(helmet.getId(), priorities());
        request.setOriginalSlots(Map.of("helmet", helmetSlot, "armor", armorSlot));
        request.setLockedDrifs(Map.of("helmet", Set.of(0), "armor", Set.of(0)));
        request.setTargetQuantities(
                Map.of(
                        DRIF_BONUS_TYPE.CRITICAL_CHANCE,
                        new OptimizationRequest.QuantityRange(0, 1)));

        assertRejected(
                service(List.of(helmet, armor), List.of(drif), calculator()).optimize(request),
                "maksimum");
    }

    @Test
    void rejectsCombinedMinimumsThatExceedAllFreeSockets() {
        ItemTemplate helmet = item(1L, 12, ITEM_CATEGORY.HELMET);
        helmet.setTier("IV");
        ItemTemplate armor = item(2L, 12, ITEM_CATEGORY.ARMOR);
        armor.setTier("I");
        DrifTemplate critical = drif(10L, DRIF_BONUS_TYPE.CRITICAL_CHANCE, 2.0, 1.0);
        DrifTemplate magic = drif(11L, DRIF_BONUS_TYPE.DAMAGE_MAGIC, 2.0, 1.0);
        critical.setSize(
                pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_SIZE.SUBDRIF);
        magic.setSize(
                pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_SIZE.SUBDRIF);
        OptimizationRequest request =
                request(
                        helmet.getId(),
                        Map.of(
                                DRIF_BONUS_TYPE.CRITICAL_CHANCE,
                                20,
                                DRIF_BONUS_TYPE.DAMAGE_MAGIC,
                                20));
        request.setOriginalSlots(
                Map.of("helmet", slot(helmet.getId()), "armor", slot(armor.getId())));
        request.setTargetQuantities(
                Map.of(
                        DRIF_BONUS_TYPE.CRITICAL_CHANCE,
                        new OptimizationRequest.QuantityRange(2, 2),
                        DRIF_BONUS_TYPE.DAMAGE_MAGIC,
                        new OptimizationRequest.QuantityRange(2, 2)));

        assertRejected(
                service(List.of(helmet, armor), List.of(critical, magic), calculator())
                        .optimize(request),
                "łącznie więcej gniazd");
    }

    @Test
    void rejectsCombinedSizeMinimumsThatExceedAllFreeSockets() {
        ItemTemplate helmet = item(1L, 12, ITEM_CATEGORY.HELMET);
        helmet.setTier("IV");
        ItemTemplate armor = item(2L, 12, ITEM_CATEGORY.ARMOR);
        armor.setTier("I");
        DrifTemplate critical = drif(10L, DRIF_BONUS_TYPE.CRITICAL_CHANCE, 2.0, 1.0);
        DrifTemplate magic = drif(11L, DRIF_BONUS_TYPE.DAMAGE_MAGIC, 2.0, 1.0);
        critical.setSize(
                pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_SIZE.SUBDRIF);
        magic.setSize(
                pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_SIZE.SUBDRIF);
        OptimizationRequest request =
                request(
                        helmet.getId(),
                        Map.of(
                                DRIF_BONUS_TYPE.CRITICAL_CHANCE,
                                20,
                                DRIF_BONUS_TYPE.DAMAGE_MAGIC,
                                20));
        request.setOriginalSlots(
                Map.of("helmet", slot(helmet.getId()), "armor", slot(armor.getId())));
        request.setDrifSizeQuantities(
                Map.of(
                        DRIF_BONUS_TYPE.CRITICAL_CHANCE,
                        Map.of(
                                pl.brokenranks
                                        .tool
                                        .broken_ranks_tool
                                        .equipment
                                        .domain
                                        .enums
                                        .DRIF_SIZE
                                        .SUBDRIF,
                                new OptimizationRequest.QuantityRange(2, 2)),
                        DRIF_BONUS_TYPE.DAMAGE_MAGIC,
                        Map.of(
                                pl.brokenranks
                                        .tool
                                        .broken_ranks_tool
                                        .equipment
                                        .domain
                                        .enums
                                        .DRIF_SIZE
                                        .SUBDRIF,
                                new OptimizationRequest.QuantityRange(2, 2))));

        assertRejected(
                service(List.of(helmet, armor), List.of(critical, magic), calculator())
                        .optimize(request),
                "łącznie więcej gniazd");
    }

    @Test
    void rejectsMalformedLockedDrifCatalogValues() {
        ItemTemplate item = item(1L, 12);
        DrifTemplate drif = drif(10L, DRIF_BONUS_TYPE.CRITICAL_CHANCE, 2.0, 1.0);
        drif.setBaseValue("broken");
        OptimizationRequest request = request(item.getId(), priorities());
        request.getOriginalSlots().get("helmet").setDrifIds(List.of(drif.getId()));
        request.getOriginalSlots().get("helmet").setDrifLevels(Map.of("0", 1));
        request.setLockedDrifs(Map.of("helmet", Set.of(0)));

        assertRejected(
                service(item, List.of(drif), calculator()).optimize(request),
                "Katalog zawiera niepoprawny drif");
    }

    private Map<DRIF_BONUS_TYPE, Integer> priorities() {
        return Map.of(DRIF_BONUS_TYPE.CRITICAL_CHANCE, 20);
    }

    private EquipmentStatsCalculatorService calculator() {
        EquipmentStatsCalculatorService calculator = mock(EquipmentStatsCalculatorService.class);
        when(calculator.calculateTotalStats(any())).thenReturn(Map.of());
        return calculator;
    }

    private void assertRejected(OptimizationResponse response, String messagePart) {
        assertFalse(response.getSummary().isSuccess());
        assertTrue(response.getSummary().getMessage().contains(messagePart));
        assertTrue(response.getOptimizedSetup().getSlots() == null);
    }
}
