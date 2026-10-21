package pl.brokenranks.tool.broken_ranks_tool.progressionpath.service;

import static org.junit.jupiter.api.Assertions.*;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.*;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.rules.DrifPowerRules;
import pl.brokenranks.tool.broken_ranks_tool.equipment.dto.EquipmentRequest;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.ItemTemplate;
import pl.brokenranks.tool.broken_ranks_tool.equipment.persistence.repository.DrifTemplateRepository;
import pl.brokenranks.tool.broken_ranks_tool.equipment.persistence.repository.ItemTemplateRepository;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.EquipmentStatsCalculatorService;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.validator.EquipmentPlacementRules;
import pl.brokenranks.tool.broken_ranks_tool.progressionpath.model.*;

@SpringBootTest
class ProgressionPathEvaluationIntegrationTests {
    @Autowired private ProgressionPathEvaluationService service;
    @Autowired private EquipmentStatsCalculatorService calculator;
    @Autowired private ItemTemplateRepository items;
    @Autowired private DrifTemplateRepository drifs;
    @Autowired private EquipmentPlacementRules placement;
    @Autowired private ProgressionDrifReplayService replay;

    @Test
    void replaysASizeAndLevelUpgradeUsingRealTemplatesAndChecksBothStageBuilds() {
        var stones = drifs.findAll();
        var sub =
                stones.stream()
                        .filter(drif -> drif.getSize() == DRIF_SIZE.SUBDRIF)
                        .filter(drif -> drif.getBonusType() == DRIF_BONUS_TYPE.DAMAGE_PHYSICAL)
                        .findFirst()
                        .orElseThrow();
        var bi =
                stones.stream()
                        .filter(drif -> drif.getSize() == DRIF_SIZE.BIDRIF)
                        .filter(drif -> drif.getBonusType() == sub.getBonusType())
                        .findFirst()
                        .orElseThrow();
        var item =
                items.findAll().stream()
                        .filter(value -> value.getClassScope() == ITEM_CLASS_SCOPE.UNIVERSAL)
                        .filter(value -> value.getCategory() == ITEM_CATEGORY.HELMET)
                        .filter(value -> value.getRarity() == RARITY.RARE)
                        .filter(value -> placement.isValidDrifSizeForTier(bi, value))
                        .filter(
                                value ->
                                        value.getCapacity() != null
                                                && value.getCapacity()
                                                        >= DrifPowerRules.power(
                                                                bi.getBonusType().getBasePower(),
                                                                11))
                        .findFirst()
                        .orElseThrow();
        var position = new ProgressionDrif.Position("helmet", 0);
        var initial = new ProgressionDrif("owned", sub.getId(), 6, position);
        var finalStones =
                replay.replay(
                        List.of(initial),
                        List.of(
                                new ProgressionDrifOperation.Move("owned", position, null),
                                new ProgressionDrifOperation.Upgrade("owned", bi.getId(), 11),
                                new ProgressionDrifOperation.Move("owned", null, position)),
                        Map.of(sub.getId(), sub, bi.getId(), bi));
        assertEquals(List.of(new ProgressionDrif("owned", bi.getId(), 11, position)), finalStones);
        var start = equipment(item.getId(), 1);
        start.getSlots().get("helmet").setDrifIds(List.of(initial.templateId()));
        start.getSlots().get("helmet").setDrifLevels(Map.of("0", initial.level()));
        var target = equipment(item.getId(), 1);
        target.getSlots().get("helmet").setDrifIds(List.of(finalStones.getFirst().templateId()));
        target.getSlots().get("helmet").setDrifLevels(Map.of("0", finalStones.getFirst().level()));
        var path =
                new ProgressionPath(
                        CHARACTER_CLASS.ARCHER,
                        List.of(
                                new ProgressionStage(
                                        "start", Math.max(1, item.getReqLevel()), start),
                                new ProgressionStage("target", 140, target)));
        var evaluated = service.evaluate(path);
        assertEquals(calculator.calculateWithSources(start), evaluated.getFirst().calculation());
        assertEquals(calculator.calculateWithSources(target), evaluated.getLast().calculation());
        assertTrue(
                evaluated
                        .getLast()
                        .calculation()
                        .drifCategories()
                        .containsKey(bi.getBonusType().name()));
    }

    @ParameterizedTest
    @EnumSource(CHARACTER_CLASS.class)
    void stageResultsMatchFreshAuthoritativeCalculationsOnTheRealCatalog(
            CHARACTER_CLASS characterClass) {
        ItemTemplate item =
                items.findAll().stream()
                        .filter(value -> value.getClassScope() == ITEM_CLASS_SCOPE.UNIVERSAL)
                        .filter(value -> value.getCategory() == ITEM_CATEGORY.HELMET)
                        .filter(value -> value.getRarity() == RARITY.RARE)
                        .findFirst()
                        .orElseThrow();
        var start = equipment(item.getId(), 1);
        start.setCharacterStats(Map.of("Siła", 10));
        var target = equipment(item.getId(), 9);
        target.setCharacterStats(Map.of("Siła", 30));
        var path =
                new ProgressionPath(
                        characterClass,
                        List.of(
                                new ProgressionStage(
                                        "start", Math.max(1, item.getReqLevel()), start),
                                new ProgressionStage("target", 140, target)));

        var result = service.evaluate(path);
        assertEquals(calculator.calculateWithSources(start), result.getFirst().calculation());
        assertEquals(calculator.calculateWithSources(target), result.getLast().calculation());
        assertEquals(result, service.evaluate(path));
        assertEquals(1, start.getSlots().get("helmet").getItemStars());
        assertEquals(Map.of("Siła", 10), start.getCharacterStats());
    }

    @Test
    void sharedCalculatorRejectsAnInvalidPhysicalStage() {
        var helmet =
                items.findAll().stream()
                        .filter(item -> item.getCategory() == ITEM_CATEGORY.HELMET)
                        .filter(item -> item.getClassScope() == ITEM_CLASS_SCOPE.UNIVERSAL)
                        .findFirst()
                        .orElseThrow();
        var bad = equipment(helmet.getId(), 1);
        bad.setSlots(Map.of("weapon", bad.getSlots().get("helmet")));
        var empty = new EquipmentRequest();
        empty.setSlots(Map.of());
        var path =
                new ProgressionPath(
                        CHARACTER_CLASS.ARCHER,
                        List.of(
                                new ProgressionStage("start", 1, empty),
                                new ProgressionStage("target", 140, bad)));
        var exception = assertThrows(IllegalArgumentException.class, () -> service.evaluate(path));
        assertTrue(exception.getMessage().contains("Etap 'target'"));
        assertTrue(exception.getMessage().contains("nie pasuje do slotu"));
    }

    private EquipmentRequest equipment(long itemId, int stars) {
        var slot = new EquipmentRequest.SlotData();
        slot.setItemId(itemId);
        slot.setItemStars(stars);
        var equipment = new EquipmentRequest();
        equipment.setSlots(new LinkedHashMap<>(Map.of("helmet", slot)));
        return equipment;
    }
}
