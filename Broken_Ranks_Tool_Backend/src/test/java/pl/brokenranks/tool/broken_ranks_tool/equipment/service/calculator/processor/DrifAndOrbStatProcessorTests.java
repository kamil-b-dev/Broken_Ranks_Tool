package pl.brokenranks.tool.broken_ranks_tool.equipment.service.calculator.processor;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_BONUS_TYPE;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_SIZE;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.ITEM_CATEGORY;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.ORB_BONUS_TYPE;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.ORB_CATEGORY;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.ORB_SIZE;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.RARITY;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.rules.DrifValueCalculator;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.rules.EquipmentRulesRegistry;
import pl.brokenranks.tool.broken_ranks_tool.equipment.dto.EquipmentRequest;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.DrifTemplate;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.ItemTemplate;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.OrbTemplate;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.calculator.CalculationState;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.calculator.input.EquipmentDataProvider.CalculationContext;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.validator.EquipmentPlacementRules;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.validator.OrbSecurityValidator;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.validator.UpgradeLevelPolicy;

class DrifAndOrbStatProcessorTests {

    private final EquipmentPlacementRules placementRules =
            new EquipmentPlacementRules(new EquipmentRulesRegistry());
    private final UpgradeLevelPolicy levelPolicy = new UpgradeLevelPolicy();
    private final OrbSecurityValidator securityValidator = new OrbSecurityValidator();

    @Test
    void preCountDrifsSkipsInvalidPositionsAndDuplicateTypesPerItem() {
        ItemTemplate weapon = item(1L, ITEM_CATEGORY.WEAPON_1H);
        ItemTemplate helmet = item(2L, ITEM_CATEGORY.HELMET);
        DrifTemplate fire = drif(10L, DRIF_BONUS_TYPE.DAMAGE_FIRE);
        DrifTemplate critical = drif(11L, DRIF_BONUS_TYPE.CRITICAL_CHANCE);

        EquipmentRequest request = new EquipmentRequest();
        request.setSlots(
                Map.of(
                        "weapon", slot(1L, List.of(10L, 11L, 11L)),
                        "helmet", slot(2L, List.of(10L))));
        CalculationContext context =
                new CalculationContext(
                        Map.of(1L, weapon, 2L, helmet), Map.of(), Map.of(10L, fire, 11L, critical));

        pl.brokenranks.tool.broken_ranks_tool.equipment.service.calculator.DrifCounter processor =
                new pl.brokenranks.tool.broken_ranks_tool.equipment.service.calculator.DrifCounter(
                        placementRules);

        assertEquals(
                Map.of(
                        DRIF_BONUS_TYPE.DAMAGE_FIRE, 1,
                        DRIF_BONUS_TYPE.CRITICAL_CHANCE, 1),
                processor.count(request, context));
    }

    @Test
    void appliesDrifPenaltyAndLevelMaximum() {
        DrifTemplate critical = drif(10L, DRIF_BONUS_TYPE.CRITICAL_CHANCE);
        ItemTemplate item = item(1L, ITEM_CATEGORY.HELMET);
        EquipmentRequest.SlotData slot = slot(1L, List.of(10L));
        slot.setDrifLevels(Map.of("0", 99));
        CalculationState state =
                new CalculationState(
                        new CalculationContext(Map.of(1L, item), Map.of(), Map.of(10L, critical)));
        state.getDrifCounts().put(DRIF_BONUS_TYPE.CRITICAL_CHANCE, 4);

        DrifStatProcessor processor =
                new DrifStatProcessor(
                        placementRules,
                        levelPolicy,
                        new EquipmentRulesRegistry(),
                        new DrifValueCalculator());
        processor.process("helmet", slot, item, 0.0, state);

        assertEquals(
                "23.75%",
                state.getAccumulator()
                        .getFormattedResults()
                        .get(DRIF_BONUS_TYPE.CRITICAL_CHANCE.name()));
    }

    @Test
    void appliesOrbLevelAndDoesNotCountTheSameBonusTwice() {
        ItemTemplate item = item(1L, ITEM_CATEGORY.HELMET);
        OrbTemplate orb =
                OrbTemplate.builder()
                        .id(20L)
                        .name("Defensive orb")
                        .category(ORB_CATEGORY.DEFENSIVE)
                        .bonusType(ORB_BONUS_TYPE.DMG_REDUCTION_MELEE)
                        .size(ORB_SIZE.BIORB)
                        .bonusLvl1("2%")
                        .bonusLvl2("6%")
                        .bonusLvl3("10%")
                        .build();
        EquipmentRequest.SlotData slot = slot(1L, List.of());
        slot.setOrbIds(List.of(20L));
        slot.setOrbLevels(List.of(3));
        CalculationState state =
                new CalculationState(
                        new CalculationContext(Map.of(1L, item), Map.of(20L, orb), Map.of()));
        OrbStatProcessor processor =
                new OrbStatProcessor(placementRules, levelPolicy, securityValidator);

        processor.process("helmet", slot, item, 8, state);
        processor.process("helmet", slot, item, 8, state);

        assertEquals(
                "15%",
                state.getAccumulator()
                        .getFormattedResults()
                        .get(ORB_BONUS_TYPE.DMG_REDUCTION_MELEE.name()));
    }

    private EquipmentRequest.SlotData slot(Long itemId, List<Long> drifIds) {
        EquipmentRequest.SlotData slot = new EquipmentRequest.SlotData();
        slot.setItemId(itemId);
        slot.setItemStars(1);
        slot.setDrifIds(drifIds);
        slot.setDrifLevels(new HashMap<>());
        return slot;
    }

    private ItemTemplate item(Long id, ITEM_CATEGORY category) {
        return ItemTemplate.builder()
                .id(id)
                .name("Test XII")
                .category(category)
                .rarity(RARITY.RARE)
                .tier("XII")
                .capacity(20)
                .build();
    }

    private DrifTemplate drif(Long id, DRIF_BONUS_TYPE type) {
        return DrifTemplate.builder()
                .id(id)
                .name(type.name())
                .size(DRIF_SIZE.ARCYDRIF)
                .bonusType(type)
                .baseValue("2%")
                .increment("1%")
                .build();
    }
}
