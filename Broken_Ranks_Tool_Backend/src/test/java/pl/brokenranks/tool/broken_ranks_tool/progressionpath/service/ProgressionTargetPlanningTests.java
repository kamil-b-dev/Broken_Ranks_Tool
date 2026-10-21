package pl.brokenranks.tool.broken_ranks_tool.progressionpath.service;

import static org.junit.jupiter.api.Assertions.*;

import java.util.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.*;
import pl.brokenranks.tool.broken_ranks_tool.equipment.dto.EquipmentRequest;
import pl.brokenranks.tool.broken_ranks_tool.equipment.persistence.repository.*;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.EquipmentStatsCalculatorService;
import pl.brokenranks.tool.broken_ranks_tool.progressionpath.dto.*;
import pl.brokenranks.tool.broken_ranks_tool.progressionpath.model.ProgressionStage;
import pl.brokenranks.tool.broken_ranks_tool.progressionpath.planning.ProgressionEquipmentSequence;

@SpringBootTest
class ProgressionTargetPlanningTests {
    @Autowired private ProgressionTargetPlanningService service;
    @Autowired private EquipmentStatsCalculatorService calculator;
    @Autowired private ItemTemplateRepository items;
    @Autowired private DrifTemplateRepository drifs;
    @Autowired private OrbTemplateRepository orbs;

    @ParameterizedTest
    @EnumSource(CHARACTER_CLASS.class)
    void generatesEveryProfessionEpicNineStarsThenLegendOneAndPreservesExactGoal(
            CHARACTER_CLASS cls) {
        var legend =
                items.findAll().stream()
                        .filter(item -> item.getRarity() == RARITY.LEGENDARY)
                        .filter(item -> item.getAllowedClasses().contains(cls))
                        .findFirst()
                        .orElseThrow();
        var target = equipment("weapon", legend.getId(), 9);
        var epic =
                items.findAll().stream()
                        .filter(item -> item.getRarity() == RARITY.EPIC)
                        .filter(item -> item.getName().equals(legend.getName()))
                        .findFirst()
                        .orElseThrow();
        var stone =
                drifs.findAll().stream()
                        .filter(
                                drif ->
                                        drif.getSize() == DRIF_SIZE.ARCYDRIF
                                                && drif.getBonusType()
                                                        == DRIF_BONUS_TYPE.CRITICAL_CHANCE)
                        .findFirst()
                        .orElseThrow();
        var doubleAttack =
                drifs.findAll().stream()
                        .filter(
                                drif ->
                                        drif.getSize() == DRIF_SIZE.ARCYDRIF
                                                && drif.getBonusType()
                                                        == DRIF_BONUS_TYPE.DOUBLE_ATTACK_CHANCE)
                        .findFirst()
                        .orElseThrow();
        var magicDamage =
                drifs.findAll().stream()
                        .filter(
                                drif ->
                                        drif.getSize() == DRIF_SIZE.ARCYDRIF
                                                && drif.getBonusType()
                                                        == DRIF_BONUS_TYPE.DAMAGE_MAGIC)
                        .findFirst()
                        .orElseThrow();
        target.getSlots()
                .get("weapon")
                .setDrifIds(List.of(stone.getId(), doubleAttack.getId(), magicDamage.getId()));
        // 16 + 8 + 12 power exactly fills a legendary weapon at nine stars (32 + 4).
        target.getSlots().get("weapon").setDrifLevels(Map.of("0", 21, "1", 11, "2", 21));
        var orb =
                orbs.findAll().stream()
                        .filter(
                                value ->
                                        value.getSize() == ORB_SIZE.ARCYORB
                                                && value.getCategory() == ORB_CATEGORY.OFFENSIVE)
                        .findFirst()
                        .orElseThrow();
        target.getSlots().get("weapon").setOrbIds(List.of(orb.getId()));
        target.getSlots().get("weapon").setOrbLevels(List.of(3));
        var snapshot = new ProgressionStage("snapshot", 140, target).equipment();
        var result = service.plan(new ProgressionTargetRequest(cls, 140, target, Set.of("ring1")));
        assertEquals("VALID_PATH", result.outcome());
        assertEquals(1, result.stages().getFirst().stage().characterLevel());
        assertEquals(snapshot, result.stages().getLast().stage().equipment());
        assertEquals(snapshot, new ProgressionStage("unchanged", 140, target).equipment());
        int upgrade = -1;
        for (int i = 0; i < result.stages().size(); i++) {
            var stage = result.stages().get(i);
            var weaponId = stage.stage().equipment().getSlots().get("weapon").getItemId();
            if (epic.getId().equals(weaponId)) {
                assertTrue(stage.stage().characterLevel() >= 120);
                assertTrue(stage.stage().characterLevel() < 140);
                assertEquals(9, stage.stage().equipment().getSlots().get("weapon").getItemStars());
            }
            if (legend.getId().equals(weaponId)) assertEquals(140, stage.stage().characterLevel());
            assertEquals(
                    calculator.calculateWithSources(stage.stage().equipment()).stats(),
                    stage.calculation().stats());
            var reserved = stage.stage().equipment().getSlots().get("ring1");
            assertTrue(reserved == null || reserved.getItemId() == null);
            if (stage.equipmentChanges().stream().anyMatch(change -> change.contains("do legendy")))
                upgrade = i;
        }
        assertTrue(upgrade > 0);
        assertEquals(140, result.stages().get(upgrade).stage().characterLevel());
        var firstEpic =
                result.stages().stream()
                        .filter(
                                stage ->
                                        epic.getId()
                                                .equals(
                                                        stage.stage()
                                                                .equipment()
                                                                .getSlots()
                                                                .get("weapon")
                                                                .getItemId()))
                        .findFirst()
                        .orElseThrow();
        assertEquals(120, firstEpic.stage().characterLevel());
        assertEquals(9, firstEpic.stage().equipment().getSlots().get("weapon").getItemStars());
        assertEquals(
                9,
                result.stages()
                        .get(upgrade - 1)
                        .stage()
                        .equipment()
                        .getSlots()
                        .get("weapon")
                        .getItemStars());
        assertEquals(
                1,
                result.stages()
                        .get(upgrade)
                        .stage()
                        .equipment()
                        .getSlots()
                        .get("weapon")
                        .getItemStars());
        assertEquals(
                legend.getId(),
                result.stages()
                        .get(upgrade)
                        .stage()
                        .equipment()
                        .getSlots()
                        .get("weapon")
                        .getItemId());
        assertTrue(
                result.stages().stream()
                        .flatMap(stage -> stage.orbActions().stream())
                        .anyMatch(action -> action.type().equals("UPGRADE")));
        assertEquals(
                1,
                result.stages().stream()
                        .flatMap(stage -> stage.orbActions().stream())
                        .filter(action -> action.type().equals("ACQUIRE"))
                        .count());
        assertFalse(result.searchReport().proofComplete());
        assertEquals(Set.of("ring1"), result.resSlots());
        var oversized = new ProgressionStage("oversized", 140, target).equipment();
        oversized.getSlots().get("weapon").setDrifLevels(Map.of("0", 21, "1", 16, "2", 21));
        var error =
                assertThrows(
                        IllegalArgumentException.class,
                        () ->
                                service.plan(
                                        new ProgressionTargetRequest(
                                                cls, 140, oversized, Set.of())));
        assertTrue(error.getMessage().contains("pojemność"));
    }

    @Test
    void respectsAcquisitionLevelsForAnExactEpicOrLegendaryTarget() {
        var legend =
                items.findAll().stream()
                        .filter(item -> item.getRarity() == RARITY.LEGENDARY)
                        .filter(
                                item ->
                                        item.getAllowedClasses()
                                                .contains(CHARACTER_CLASS.FIRE_MAGE))
                        .findFirst()
                        .orElseThrow();
        var legendTarget = equipment("weapon", legend.getId(), 9);
        var legendPath =
                service.plan(
                        new ProgressionTargetRequest(
                                CHARACTER_CLASS.FIRE_MAGE, 140, legendTarget, Set.of()));
        var epicTarget =
                legendPath.stages().stream()
                        .filter(stage -> stage.stage().characterLevel() == 120)
                        .findFirst()
                        .orElseThrow()
                        .stage()
                        .equipment();
        var epicPath =
                service.plan(
                        new ProgressionTargetRequest(
                                CHARACTER_CLASS.FIRE_MAGE, 120, epicTarget, Set.of()));
        assertEquals(epicTarget, epicPath.stages().getLast().stage().equipment());
        var laterEpicTarget =
                service.plan(
                        new ProgressionTargetRequest(
                                CHARACTER_CLASS.FIRE_MAGE, 140, epicTarget, Set.of()));
        assertTrue(
                laterEpicTarget.stages().stream()
                        .filter(stage -> stage.stage().characterLevel() >= 120)
                        .allMatch(
                                stage ->
                                        stage.stage()
                                                        .equipment()
                                                        .getSlots()
                                                        .get("weapon")
                                                        .getItemStars()
                                                == 9));
        assertTrue(
                epicPath.stages().stream()
                        .noneMatch(
                                stage ->
                                        legend.getId()
                                                .equals(
                                                        stage.stage()
                                                                .equipment()
                                                                .getSlots()
                                                                .get("weapon")
                                                                .getItemId())));
        var earlyEpic =
                assertThrows(
                        IllegalArgumentException.class,
                        () ->
                                service.plan(
                                        new ProgressionTargetRequest(
                                                CHARACTER_CLASS.FIRE_MAGE,
                                                119,
                                                epicTarget,
                                                Set.of())));
        assertTrue(earlyEpic.getMessage().contains("co najmniej 120"));
        var earlyLegend =
                assertThrows(
                        IllegalArgumentException.class,
                        () ->
                                service.plan(
                                        new ProgressionTargetRequest(
                                                CHARACTER_CLASS.FIRE_MAGE,
                                                139,
                                                legendTarget,
                                                Set.of())));
        assertTrue(earlyLegend.getMessage().contains("co najmniej 140"));
    }

    @Test
    void createsTheLinearMagicEquipmentRouteWithoutStarringTemporaryItems() {
        var goal =
                items.findAll().stream()
                        .filter(item -> item.getName().equals("Miłość Morany"))
                        .findFirst()
                        .orElseThrow();
        var target = equipment("helmet", goal.getId(), 9);
        var result =
                service.plan(
                        new ProgressionTargetRequest(
                                CHARACTER_CLASS.FIRE_MAGE, 140, target, Set.of()));
        var names = new ArrayList<String>();
        var catalog = items.findAll();
        for (var entry : result.stages()) {
            var slot = entry.stage().equipment().getSlots().get("helmet");
            if (slot.getItemId() == null) continue;
            var item =
                    catalog.stream()
                            .filter(value -> value.getId().equals(slot.getItemId()))
                            .findFirst()
                            .orElseThrow();
            if (names.isEmpty() || !names.getLast().equals(item.getName()))
                names.add(item.getName());
            if (!item.getId().equals(goal.getId())) assertEquals(1, slot.getItemStars());
        }
        assertEquals(
                List.of("Martumal", "Khalam", "Czacha", "Sigil", "Htagan", "Miłość Morany"), names);
    }

    @Test
    void rejectsItemsAndStonesInsideResAndUnavailableGoals() {
        var target = equipment("ring1", 154L, 1);
        assertThrows(
                IllegalArgumentException.class,
                () ->
                        service.plan(
                                new ProgressionTargetRequest(
                                        CHARACTER_CLASS.DRUID, 140, target, Set.of("ring1"))));
        assertThrows(
                IllegalArgumentException.class,
                () ->
                        service.plan(
                                new ProgressionTargetRequest(
                                        CHARACTER_CLASS.DRUID, 1, target, Set.of())));
        assertThrows(
                IllegalArgumentException.class,
                () ->
                        service.plan(
                                new ProgressionTargetRequest(
                                        CHARACTER_CLASS.DRUID, 140, target, Set.of("weapon"))));
    }

    @ParameterizedTest
    @ValueSource(ints = {20, 21, 140})
    void omitsShortLivedItemsBackwardsFromTheExactSlotGoal(int gap) {
        var target = equipment("helmet", 13L, 9);
        var result =
                service.plan(
                        new ProgressionTargetRequest(
                                CHARACTER_CLASS.FIRE_MAGE, 140, target, Set.of(), false, gap));
        var catalog = items.findAll();
        var names =
                result.stages().stream()
                        .map(
                                stage ->
                                        stage.stage()
                                                .equipment()
                                                .getSlots()
                                                .get("helmet")
                                                .getItemId())
                        .filter(Objects::nonNull)
                        .distinct()
                        .map(
                                id ->
                                        catalog.stream()
                                                .filter(item -> item.getId().equals(id))
                                                .findFirst()
                                                .orElseThrow()
                                                .getName())
                        .toList();
        var expected =
                switch (gap) {
                    case 20 -> List.of("Khalam", "Czacha", "Sigil", "Htagan", "Miłość Morany");
                    case 21 -> List.of("Khalam", "Sigil", "Miłość Morany");
                    default -> List.of("Miłość Morany");
                };
        assertEquals(expected, names);
        assertEquals(
                new ProgressionStage("goal", 140, target).equipment(),
                result.stages().getLast().stage().equipment());
    }

    @Test
    void maximumGapStillKeepsEpicAndLegendAndReprojectsBalancedStones() {
        var target = equipment("weapon", 181L, 9);
        var critical =
                drifs.findAll().stream()
                        .filter(
                                stone ->
                                        stone.getSize() == DRIF_SIZE.ARCYDRIF
                                                && stone.getBonusType()
                                                        == DRIF_BONUS_TYPE.CRITICAL_CHANCE)
                        .findFirst()
                        .orElseThrow();
        target.getSlots().get("weapon").setDrifIds(List.of(critical.getId()));
        target.getSlots().get("weapon").setDrifLevels(Map.of("0", 21));
        var result =
                service.plan(
                        new ProgressionTargetRequest(
                                CHARACTER_CLASS.FIRE_MAGE, 140, target, Set.of(), true, 140));
        var catalog = items.findAll();
        for (var stage : result.stages()) {
            assertEquals(
                    calculator.calculateWithSources(stage.stage().equipment()),
                    stage.calculation());
            var id = stage.stage().equipment().getSlots().get("weapon").getItemId();
            if (id == null) continue;
            var item =
                    catalog.stream()
                            .filter(value -> value.getId().equals(id))
                            .findFirst()
                            .orElseThrow();
            assertTrue(item.getRarity() == RARITY.EPIC || item.getRarity() == RARITY.LEGENDARY);
            if (item.getRarity() == RARITY.EPIC) {
                assertTrue(stage.stage().characterLevel() >= 120);
                assertTrue(stage.stage().characterLevel() < 140);
                assertEquals(9, stage.stage().equipment().getSlots().get("weapon").getItemStars());
            } else assertEquals(140, stage.stage().characterLevel());
        }
        assertEquals(
                120,
                result.stages().stream()
                        .filter(
                                stage ->
                                        stage.stage()
                                                        .equipment()
                                                        .getSlots()
                                                        .get("weapon")
                                                        .getItemId()
                                                != null)
                        .findFirst()
                        .orElseThrow()
                        .stage()
                        .characterLevel());
        assertTrue(
                result.stages().stream()
                        .anyMatch(
                                stage ->
                                        stage.equipmentChanges().stream()
                                                .anyMatch(
                                                        change -> change.contains("do legendy"))));
        assertEquals(
                new ProgressionStage("goal", 140, target).equipment(),
                result.stages().getLast().stage().equipment());
    }

    @Test
    void replaysACompleteMagicBuildWithManyMilestonesAndNoAcquisitionsInResSlots() {
        var target = new EquipmentRequest();
        var slots = new LinkedHashMap<String, EquipmentRequest.SlotData>();
        var ids =
                Map.ofEntries(
                        Map.entry("weapon", 181L),
                        Map.entry("helmet", 13L),
                        Map.entry("armor", 2L),
                        Map.entry("cape", 7L),
                        Map.entry("legs", 12L),
                        Map.entry("boots", 23L),
                        Map.entry("gloves", 5L),
                        Map.entry("belt", 6L),
                        Map.entry("necklace", 11L),
                        Map.entry("ring2", 160L),
                        Map.entry("shield", 27L));
        long critical =
                drifs.findAll().stream()
                        .filter(
                                stone ->
                                        stone.getSize() == DRIF_SIZE.ARCYDRIF
                                                && stone.getBonusType()
                                                        == DRIF_BONUS_TYPE.CRITICAL_CHANCE)
                        .findFirst()
                        .orElseThrow()
                        .getId();
        ids.forEach(
                (key, id) -> {
                    var slot = ProgressionEquipmentSequence.emptySlot();
                    slot.setItemId(id);
                    slot.setItemStars(9);
                    slot.setDrifIds(List.of(critical));
                    slot.setDrifLevels(Map.of("0", 21));
                    slots.put(key, slot);
                });
        slots.put("ring1", ProgressionEquipmentSequence.emptySlot());
        target.setSlots(slots);
        target.setCharacterStats(Map.of("Moc", 288, "Wiedza", 288));
        var report =
                service.plan(
                        new ProgressionTargetRequest(
                                CHARACTER_CLASS.FIRE_MAGE, 140, target, Set.of("ring1")));
        assertTrue(report.stages().size() > 6);
        assertEquals(
                new ProgressionStage("goal", 140, target).equipment(),
                report.stages().getLast().stage().equipment());
        var known = new HashMap<String, ProgressionPlanResponse.Action>();
        var catalog = drifs.findAll();
        for (var stage : report.stages()) {
            assertEquals(
                    calculator.calculateWithSources(stage.stage().equipment()),
                    stage.calculation());
            assertTrue(stage.stage().equipment().getSlots().get("ring1").getDrifIds().isEmpty());
            for (var action : stage.actions()) {
                if (action.type().equals("ACQUIRE"))
                    assertNull(known.putIfAbsent(action.instanceId(), action));
                if (action.type().equals("UPGRADE")) {
                    var old = known.get(action.instanceId());
                    assertNotNull(old);
                    assertTrue(old.level() <= action.level());
                    var oldSize =
                            catalog.stream()
                                    .filter(stone -> stone.getId().equals(old.templateId()))
                                    .findFirst()
                                    .orElseThrow()
                                    .getSize();
                    var newSize =
                            catalog.stream()
                                    .filter(stone -> stone.getId().equals(action.templateId()))
                                    .findFirst()
                                    .orElseThrow()
                                    .getSize();
                    assertTrue(oldSize.ordinal() <= newSize.ordinal());
                    known.put(action.instanceId(), action);
                }
            }
        }
    }

    @Test
    void acceptsLevelOneAndEmptyPlansWithoutInventingOrdinaryItems() {
        var target = equipment("ring1", null, 1);
        var result =
                service.plan(
                        new ProgressionTargetRequest(
                                CHARACTER_CLASS.ARCHER, 1, target, Set.of("ring1")));
        assertEquals("VALID_PATH", result.outcome());
        assertTrue(result.stages().stream().allMatch(stage -> stage.stage().characterLevel() == 1));
    }

    @Test
    void balancingKeepsTheOriginalPlannerAvailableAndReplaysTheExactMixedBonusGoal() {
        var target = equipment("helmet", 13L, 9);
        target.getSlots().put("armor", equipment("armor", 2L, 9).getSlots().get("armor"));
        target.getSlots().put("boots", equipment("boots", 23L, 9).getSlots().get("boots"));
        var catalog = drifs.findAll();
        long reduction =
                catalog.stream()
                        .filter(
                                stone ->
                                        stone.getSize() == DRIF_SIZE.ARCYDRIF
                                                && stone.getBonusType()
                                                        == DRIF_BONUS_TYPE.DAMAGE_REDUCTION)
                        .findFirst()
                        .orElseThrow()
                        .getId();
        long critical =
                catalog.stream()
                        .filter(
                                stone ->
                                        stone.getSize() == DRIF_SIZE.ARCYDRIF
                                                && stone.getBonusType()
                                                        == DRIF_BONUS_TYPE.CRITICAL_CHANCE)
                        .findFirst()
                        .orElseThrow()
                        .getId();
        target.getSlots()
                .values()
                .forEach(
                        slot -> {
                            slot.setDrifIds(List.of(reduction, critical));
                            slot.setDrifLevels(Map.of("0", 16, "1", 16));
                        });
        var original =
                service.plan(
                        new ProgressionTargetRequest(
                                CHARACTER_CLASS.FIRE_MAGE, 140, target, Set.of()));
        var explicitDefault =
                service.plan(
                        new ProgressionTargetRequest(
                                CHARACTER_CLASS.FIRE_MAGE, 140, target, Set.of(), false));
        assertEquals(original.stages(), explicitDefault.stages());
        assertEquals(original.remainingDrifs(), explicitDefault.remainingDrifs());
        var balanced =
                service.plan(
                        new ProgressionTargetRequest(
                                CHARACTER_CLASS.FIRE_MAGE, 140, target, Set.of(), true));
        assertEquals("BALANCED_BACKWARD_PROJECTION", balanced.searchReport().stopReason());
        assertEquals(
                new ProgressionStage("goal", 140, target).equipment(),
                balanced.stages().getLast().stage().equipment());
        assertFalse(balanced.searchReport().proofComplete());
        for (var stage : balanced.stages())
            assertEquals(
                    calculator.calculateWithSources(stage.stage().equipment()),
                    stage.calculation());
    }

    @Test
    void canStarAnEndgameOffensiveItemEvenWhenALaterDefensiveAlternativeExists() {
        var target =
                equipment(
                        "legs", 40L,
                        9); // Offensive endgame leg armor; the later Temary item sacrifices its
        // offense.
        var result =
                service.plan(
                        new ProgressionTargetRequest(
                                CHARACTER_CLASS.FIRE_MAGE, 140, target, Set.of()));
        var firstUse =
                result.stages().stream()
                        .filter(
                                stage ->
                                        Long.valueOf(40)
                                                .equals(
                                                        stage.stage()
                                                                .equipment()
                                                                .getSlots()
                                                                .get("legs")
                                                                .getItemId()))
                        .findFirst()
                        .orElseThrow();
        assertEquals(110, firstUse.stage().characterLevel());
        assertEquals(9, firstUse.stage().equipment().getSlots().get("legs").getItemStars());
    }

    @Test
    void doesNotBuyANearLevelAlternativeImmediatelyBeforeTheChosenTarget() {
        var result =
                service.plan(
                        new ProgressionTargetRequest(
                                CHARACTER_CLASS.FIRE_MAGE,
                                35,
                                equipment("belt", 119L, 1),
                                Set.of())); // Koriatula, level 35.
        assertTrue(
                result.stages().stream()
                        .noneMatch(
                                stage ->
                                        Long.valueOf(129L)
                                                .equals(
                                                        stage.stage()
                                                                .equipment()
                                                                .getSlots()
                                                                .get("belt")
                                                                .getItemId()))); // Radius, 34.
        assertEquals(
                119L,
                result.stages().getLast().stage().equipment().getSlots().get("belt").getItemId());
    }

    @Test
    void projectsCharacterPointsWithinEachLevelsBudget() {
        for (int level = 1; level <= 140; level++) {
            var stats =
                    ProgressionEquipmentSequence.characterStats(
                            Map.of("Moc", 288, "Wiedza", 288), 140, level);
            int points = stats.values().stream().mapToInt(value -> value - 10).sum();
            assertTrue(points <= (level - 1) * 4);
        }
    }

    private EquipmentRequest equipment(String key, Long id, int stars) {
        var target = new EquipmentRequest();
        var slot = ProgressionEquipmentSequence.emptySlot();
        slot.setItemId(id);
        if (id != null) slot.setItemStars(stars);
        target.setSlots(new LinkedHashMap<>(Map.of(key, slot)));
        target.setCharacterStats(Map.of());
        return target;
    }
}
