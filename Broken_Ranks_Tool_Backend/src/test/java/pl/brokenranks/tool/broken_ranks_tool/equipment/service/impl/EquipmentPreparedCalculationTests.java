package pl.brokenranks.tool.broken_ranks_tool.equipment.service.impl;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import java.util.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.*;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.rules.*;
import pl.brokenranks.tool.broken_ranks_tool.equipment.dto.EquipmentRequest;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.*;
import pl.brokenranks.tool.broken_ranks_tool.equipment.persistence.repository.*;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.EquipmentStatsCalculatorService;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.calculator.*;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.calculator.input.*;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.calculator.processor.*;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.validator.*;

class EquipmentPreparedCalculationTests {
    private final ItemTemplateRepository itemsRepository = mock(ItemTemplateRepository.class);
    private final DrifTemplateRepository drifsRepository = mock(DrifTemplateRepository.class);
    private final OrbTemplateRepository orbsRepository = mock(OrbTemplateRepository.class);
    private final Map<Long, ItemTemplate> items = new LinkedHashMap<>();
    private final Map<Long, DrifTemplate> drifs = new LinkedHashMap<>();
    private EquipmentStatsCalculatorService calculator;
    private EquipmentRequest request;

    @BeforeEach
    void setup() {
        var rules = new EquipmentRulesRegistry();
        var placement = new EquipmentPlacementRules(rules);
        var levels = new UpgradeLevelPolicy();
        calculator =
                EquipmentStatsCalculatorTestFactory.create(
                        new EquipmentDataProvider(itemsRepository, orbsRepository, drifsRepository),
                        new EquipmentRequestValidator(rules),
                        placement,
                        levels,
                        new DrifSecurityValidator(placement, levels),
                        new ItemStatProcessor(),
                        new OrbStatProcessor(placement, levels, new OrbSecurityValidator()),
                        new DrifStatProcessor(placement, levels, rules, new DrifValueCalculator()),
                        new DrifCounter(placement),
                        new CalculationMetadataFactory(),
                        new SlotDrifSelectionFactory());
        drifs.put(1L, drif(1L, DRIF_BONUS_TYPE.DAMAGE_PHYSICAL, "2%"));
        drifs.put(2L, drif(2L, DRIF_BONUS_TYPE.STAMINA_USAGE_REDUCTION, "-2%"));
        var orb =
                OrbTemplate.builder()
                        .id(1L)
                        .name("Orb")
                        .size(ORB_SIZE.ARCYORB)
                        .category(ORB_CATEGORY.DEFENSIVE)
                        .bonusType(ORB_BONUS_TYPE.DMG_REDUCTION_MELEE)
                        .bonusLvl1("1%")
                        .bonusLvl2("2%")
                        .bonusLvl3("3%")
                        .build();
        Map<String, EquipmentRequest.SlotData> slots = new LinkedHashMap<>();
        var categories =
                Map.of(
                        "helmet",
                        ITEM_CATEGORY.HELMET,
                        "armor",
                        ITEM_CATEGORY.ARMOR,
                        "legs",
                        ITEM_CATEGORY.LEGS,
                        "boots",
                        ITEM_CATEGORY.BOOTS);
        long id = 1;
        for (String key : List.of("helmet", "armor", "legs", "boots")) {
            var item =
                    ItemTemplate.builder()
                            .id(id)
                            .name(key)
                            .category(categories.get(key))
                            .tier("XII")
                            .rarity(RARITY.RARE)
                            .capacity(100)
                            .stats(Map.of("Siła", 30.0))
                            .build();
            items.put(id, item);
            var slot = new EquipmentRequest.SlotData();
            slot.setItemId(id++);
            slot.setItemStars(9);
            slot.setDrifIds(List.of(1L, 2L));
            slot.setDrifLevels(Map.of("0", 6, "1", 6));
            slot.setOrbIds(key.equals("helmet") ? List.of(1L) : List.of());
            slot.setOrbLevels(key.equals("helmet") ? List.of(3) : List.of());
            slots.put(key, slot);
        }
        request = new EquipmentRequest();
        request.setSlots(slots);
        request.setCharacterStats(Map.of("Siła", 10));
        when(itemsRepository.findAllById(any()))
                .thenAnswer(ignored -> new ArrayList<>(items.values()));
        when(drifsRepository.findAllById(any()))
                .thenAnswer(ignored -> new ArrayList<>(drifs.values()));
        when(orbsRepository.findAllById(any())).thenReturn(List.of(orb));
    }

    @Test
    void repeatedCalculationsKeepFullCalculatorSemanticsWithoutCatalogQueries() {
        var prepared = calculator.prepareCalculation(items, drifs, request.getSlots().values());
        verify(orbsRepository).findAllById(List.of(1L));
        verifyNoInteractions(itemsRepository, drifsRepository);
        clearInvocations(orbsRepository);
        for (int level : List.of(1, 6, 11, 16, 21)) {
            request.getSlots()
                    .values()
                    .forEach(slot -> slot.setDrifLevels(Map.of("0", level, "1", level)));
            var actual = prepared.apply(request);
            verifyNoInteractions(itemsRepository, drifsRepository, orbsRepository);
            assertEquals(calculator.calculateTotalStats(request), actual);
            clearInvocations(itemsRepository, drifsRepository, orbsRepository);
        }
    }

    @Test
    void preparedCalculatorStillRejectsIllegalLevelsAndDuplicateBonuses() {
        var prepared = calculator.prepareCalculation(items, drifs, request.getSlots().values());
        var helmet = request.getSlots().get("helmet");
        helmet.setDrifLevels(Map.of("0", 22, "1", 6));
        assertThrows(IllegalArgumentException.class, () -> prepared.apply(request));
        helmet.setDrifLevels(Map.of("0", 6, "1", 6));
        helmet.setDrifIds(List.of(1L, 1L));
        assertThrows(IllegalArgumentException.class, () -> prepared.apply(request));
    }

    @Test
    void preparedSourceCalculationsMatchFreshCalculationsAcrossItemChangesAndIgnoreUnusedSources() {
        var orbs =
                new LinkedHashMap<>(
                        new EquipmentDataProvider(itemsRepository, orbsRepository, drifsRepository)
                                .loadOrbs(request.getSlots().values()));
        var unusedOrb =
                OrbTemplate.builder().id(99L).bonusType(ORB_BONUS_TYPE.DMG_REDUCTION_BOSS).build();
        orbs.put(99L, unusedOrb);
        drifs.values().forEach(drif -> drif.setCategory(DRIF_CATEGORY.OFFENSIVE));
        var unusedDrif = drif(99L, DRIF_BONUS_TYPE.CRITICAL_CHANCE, "2%");
        unusedDrif.setCategory(DRIF_CATEGORY.DEFENSIVE);
        drifs.put(99L, unusedDrif);
        var helmet = request.getSlots().get("helmet");
        var replacement =
                ItemTemplate.builder()
                        .id(99L)
                        .name("Replacement")
                        .category(ITEM_CATEGORY.HELMET)
                        .tier("XII")
                        .rarity(RARITY.RARE)
                        .capacity(100)
                        .stats(Map.of("Siła", 80.0))
                        .build();
        items.put(99L, replacement);
        var prepared = calculator.prepareCalculationWithSources(items, orbs, drifs);
        clearInvocations(itemsRepository, drifsRepository, orbsRepository);
        for (long itemId : List.of(1L, 99L)) {
            helmet.setItemId(itemId);
            for (int stars : List.of(1, 7, 9)) {
                helmet.setItemStars(stars);
                var actual = prepared.apply(request);
                verifyNoInteractions(itemsRepository, drifsRepository, orbsRepository);
                assertEquals(calculator.calculateWithSources(request), actual);
                assertFalse(
                        actual.drifCategories()
                                .containsKey(DRIF_BONUS_TYPE.CRITICAL_CHANCE.name()));
                assertFalse(
                        actual.orbBonusTypes().contains(ORB_BONUS_TYPE.DMG_REDUCTION_BOSS.name()));
                clearInvocations(itemsRepository, drifsRepository, orbsRepository);
            }
        }
        helmet.setDrifLevels(Map.of("0", 22));
        assertThrows(IllegalArgumentException.class, () -> prepared.apply(request));
        verifyNoInteractions(itemsRepository, drifsRepository, orbsRepository);
    }

    private DrifTemplate drif(long id, DRIF_BONUS_TYPE type, String base) {
        return DrifTemplate.builder()
                .id(id)
                .name(type.name())
                .size(DRIF_SIZE.ARCYDRIF)
                .bonusType(type)
                .baseValue(base)
                .increment(type == DRIF_BONUS_TYPE.STAMINA_USAGE_REDUCTION ? "-0.5%" : "0.5%")
                .build();
    }

    @Test
    void normalizesAcceptedCharacterStatisticNamesBeforeCombiningEquipmentBonuses() {
        var canonical = calculator.calculateWithSources(request);
        request.setCharacterStats(Map.of("siła", 10));
        assertEquals(canonical, calculator.calculateWithSources(request));
    }

    @Test
    void validatesCharacterStatsAlsoForAnEmptyEquipmentRequest() {
        request.setSlots(Map.of());
        request.setCharacterStats(Map.of("strength", 10));
        assertThrows(
                IllegalArgumentException.class, () -> calculator.calculateWithSources(request));
    }

    @Test
    void emptyEquipmentIncludesBaseStatsAndMatchesAnExplicitEmptySlot() {
        request.setSlots(Map.of());
        request.setCharacterStats(Map.of("Siła", 10));
        clearInvocations(itemsRepository, drifsRepository, orbsRepository);

        var empty = calculator.calculateWithSources(request);
        assertEquals(
                Map.of(
                        "Siła",
                        "10",
                        "CRITICAL_CHANCE",
                        "2%",
                        "MANA_REGEN",
                        "5%",
                        "STAMINA_REGEN",
                        "5%"),
                empty.stats());
        assertTrue(empty.drifCategories().isEmpty());
        assertTrue(empty.orbBonusTypes().isEmpty());
        verifyNoInteractions(itemsRepository, drifsRepository, orbsRepository);

        var prepared = calculator.prepareCalculationWithSources(Map.of(), Map.of(), Map.of());
        assertEquals(empty, prepared.apply(request));
        request.setSlots(Map.of("helmet", new EquipmentRequest.SlotData()));
        assertEquals(empty, calculator.calculateWithSources(request));
        assertEquals(empty, prepared.apply(request));
    }

    @Test
    void emptyEquipmentWithoutCharacterStatsStillIncludesDefaultBonuses() {
        request.setSlots(Map.of());
        request.setCharacterStats(null);

        assertEquals(
                Map.of("CRITICAL_CHANCE", "2%", "MANA_REGEN", "5%", "STAMINA_REGEN", "5%"),
                calculator.calculateTotalStats(request));
    }

    @Test
    void rejectsGapsInBuiltInDrifPositions() {
        var helmet = request.getSlots().get("helmet");
        items.get(helmet.getItemId()).setName("Allenor X");
        items.get(helmet.getItemId()).setRarity(RARITY.EPIC);
        helmet.setDrifIds(Arrays.asList(null, 1L, 2L));
        helmet.setDrifLevels(Map.of("1", 6, "2", 6));
        assertThrows(
                IllegalArgumentException.class, () -> calculator.calculateWithSources(request));
    }
}
