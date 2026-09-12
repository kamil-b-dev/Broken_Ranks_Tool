package pl.brokenranks.tool.broken_ranks_tool.optimization.advisor;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import java.util.*;
import org.junit.jupiter.api.Test;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.*;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.rules.*;
import pl.brokenranks.tool.broken_ranks_tool.equipment.dto.EquipmentRequest.SlotData;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.*;
import pl.brokenranks.tool.broken_ranks_tool.equipment.persistence.repository.*;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.EquipmentStatsCalculatorService;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.calculator.*;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.calculator.input.*;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.calculator.processor.*;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.calculator.random.RandomProvider;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.impl.EquipmentStatsCalculatorTestFactory;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.validator.*;
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.*;

/** End-to-end advisor search with real calculation/validation and in-memory catalog repositories. */
class AdvisorOptimizationTests {
    private static final DRIF_BONUS_TYPE A = DRIF_BONUS_TYPE.CRITICAL_CHANCE;
    private static final DRIF_BONUS_TYPE B = DRIF_BONUS_TYPE.CC_PROTECTION;

    @Test
    void movesOwnedSmallDrifWithoutBuyingLargerCatalogTemplate() {
        Fixture f =
                fixture(
                        List.of(
                                item(1, ITEM_CATEGORY.HELMET, "VII", 20, 0),
                                item(2, ITEM_CATEGORY.BOOTS, "VII", 20, 0)),
                        List.of(
                                drif(10, A, "10%"),
                                DrifTemplate.builder()
                                        .id(11L)
                                        .name("Larger")
                                        .bonusType(A)
                                        .size(DRIF_SIZE.MAGNIDRIF)
                                        .baseValue("20%")
                                        .increment("1%")
                                        .build()));
        OptimizationRequest request =
                request(A, Map.of("helmet", slot(1, 1, 10L), "boots", slot(2, 9)));
        request.getOriginalSlots().get("helmet").setDrifLevels(Map.of("0", 6));
        var result = f.service.optimize(request);
        assertTrue(result.getSummary().isSuccess());
        var best = result.getSummary().getNextVariants().getFirst();
        assertEquals(1.5, best.gain(), 0.0001);
        assertEquals(List.of(10L), best.setup().getSlots().get("boots").getDrifIds());
        assertEquals(6, best.setup().getSlots().get("boots").getDrifLevels().get("0"));
        assertEquals(List.of(10L), request.getOriginalSlots().get("helmet").getDrifIds());
        assertTrue(
                result.getAdvisorReport()
                        .plans()
                        .getFirst()
                        .actions()
                        .getFirst()
                        .contains("Przenieś"));
        verify(f.items, times(1)).findAll();
        verify(f.calculator, atMost(19)).calculateTotalStats(any());
    }

    @Test
    void choosesSevenStarsInsteadOfNineWhenItMeetsTarget() {
        Fixture f =
                fixture(
                        List.of(item(1, ITEM_CATEGORY.HELMET, "II", 4, 0)),
                        List.of(drif(10, A, "10%")));
        var request = request(A, Map.of("helmet", slot(1, 6, 10L)));
        request.getAdvisor().getAllowedChanges().setStars(true);
        request.getAdvisor().setTargetGain(0.2);
        var result = f.service.optimize(request);
        assertEquals(7, result.getOptimizedSetup().getSlots().get("helmet").getItemStars());
        assertEquals(0.3, result.getSummary().getNextVariants().getFirst().gain(), 0.0001);
        assertTrue(result.getAdvisorReport().targetReached());
    }

    @Test
    void findsStarUpgradeThatUnlocksCapacityForAMove() {
        Fixture f =
                fixture(
                        List.of(
                                item(1, ITEM_CATEGORY.HELMET, "IV", 3, 20),
                                item(2, ITEM_CATEGORY.BOOTS, "IV", 4, 0)),
                        List.of(drif(10, A, "10%")));
        var request = request(A, Map.of("helmet", slot(1, 6), "boots", slot(2, 9, 10L)));
        request.getAdvisor().setMaxActions(2);
        request.getAdvisor().getAllowedChanges().setStars(true);
        request.getAdvisor().setTargetGain(0.5);
        var result = f.service.optimize(request);
        assertEquals(7, result.getOptimizedSetup().getSlots().get("helmet").getItemStars());
        assertEquals(
                10L, result.getOptimizedSetup().getSlots().get("helmet").getDrifIds().getFirst());
        assertEquals(2, result.getAdvisorReport().plans().getFirst().actions().size());
    }

    @Test
    void protectsOtherModsWithoutHalfPointToleranceAndHonorsExplicitLoss() {
        Fixture f =
                fixture(
                        List.of(
                                item(1, ITEM_CATEGORY.HELMET, "I", 10, 0),
                                item(2, ITEM_CATEGORY.BOOTS, "I", 10, 1)),
                        List.of(drif(10, A, "10%"), drif(20, B, "10%")));
        var request = request(A, Map.of("helmet", slot(1, 1, 10L), "boots", slot(2, 1, 20L)));
        assertTrue(f.service.optimize(request).getSummary().getNextVariants().isEmpty());
        AdvisorOptions.Protection protection = new AdvisorOptions.Protection();
        protection.setLoss(0.1);
        request.getAdvisor().setProtectedModifiers(Map.of(B, protection));
        var result = f.service.optimize(request);
        assertFalse(result.getSummary().getNextVariants().isEmpty());
        assertEquals(0.1, result.getSummary().getNextVariants().getFirst().gain(), 0.0001);
    }

    @Test
    void improvesNegativeReductionInTheCorrectDirection() {
        DRIF_BONUS_TYPE reduction = DRIF_BONUS_TYPE.MANA_USAGE_REDUCTION;
        Fixture f =
                fixture(
                        List.of(
                                item(1, ITEM_CATEGORY.HELMET, "I", 10, 0),
                                item(2, ITEM_CATEGORY.BOOTS, "I", 10, 0)),
                        List.of(drif(10, reduction, "-10%")));
        var result =
                f.service.optimize(
                        request(reduction, Map.of("helmet", slot(1, 1, 10L), "boots", slot(2, 9))));
        var best = result.getSummary().getNextVariants().getFirst();
        assertEquals(-10, best.finalValue());
        assertEquals(-11.5, best.variantValue());
        assertEquals(1.5, best.gain());
    }

    @Test
    void accountsForTheGlobalPenaltyWhenUpgradingStars() {
        Fixture f =
                fixture(
                        List.of(
                                item(1, ITEM_CATEGORY.HELMET, "I", 10, 0),
                                item(2, ITEM_CATEGORY.BOOTS, "I", 10, 0),
                                item(3, ITEM_CATEGORY.ARMOR, "I", 10, 0),
                                item(4, ITEM_CATEGORY.BELT, "I", 10, 0)),
                        List.of(drif(10, A, "10%")));
        var request =
                request(
                        A,
                        Map.of(
                                "helmet",
                                slot(1, 6, 10L),
                                "boots",
                                slot(2, 6, 10L),
                                "armor",
                                slot(3, 6, 10L),
                                "belt",
                                slot(4, 6, 10L)));
        request.getAdvisor().getAllowedChanges().setStars(true);
        request.getAdvisor().setTargetGain(0.2);
        var result = f.service.optimize(request);
        assertEquals(40, result.getAdvisorReport().baselineValue());
        assertEquals(0.29, result.getSummary().getNextVariants().getFirst().gain(), 0.0001);
    }

    @Test
    void locksPreserveSlotsAndIndividualDrifs() {
        Fixture f =
                fixture(
                        List.of(
                                item(1, ITEM_CATEGORY.HELMET, "I", 10, 0),
                                item(2, ITEM_CATEGORY.BOOTS, "I", 10, 0)),
                        List.of(drif(10, A, "10%")));
        var request = request(A, Map.of("helmet", slot(1, 1, 10L), "boots", slot(2, 9)));
        request.setLockedDrifs(Map.of("helmet", Set.of(0)));
        assertTrue(f.service.optimize(request).getSummary().getNextVariants().isEmpty());
        request.getAdvisor().getAllowedChanges().setStars(true);
        request.setLockedSlots(Set.of("helmet"));
        assertTrue(f.service.optimize(request).getSummary().getNextVariants().isEmpty());
    }

    @Test
    void addsAbsentGoalOnlyWhenPurchasesAreAllowed() {
        var goal = DRIF_BONUS_TYPE.DAMAGE_MAGIC;
        Fixture f =
                fixture(
                        List.of(item(1, ITEM_CATEGORY.HELMET, "I", 10, 0)),
                        List.of(drif(10, goal, "10%")));
        var request = request(goal, Map.of("helmet", slot(1, 1)));
        assertTrue(f.service.optimize(request).getSummary().getNextVariants().isEmpty());
        request.getAdvisor().getAllowedChanges().setDrifs(true);
        var result = f.service.optimize(request);
        assertEquals(10, result.getSummary().getNextVariants().getFirst().gain());
        assertEquals(1, result.getAdvisorReport().plans().getFirst().upgrades());
    }

    @Test
    void upgradesAnOwnedDrifWithoutRemovingOrDowngradingIt() {
        DrifTemplate owned = drif(10, A, "2%");
        owned.setIncrement("1%");
        Fixture f = fixture(List.of(item(1, ITEM_CATEGORY.HELMET, "I", 10, 0)), List.of(owned));
        SlotData helmet = slot(1, 1, 10L);
        helmet.setDrifLevels(Map.of("0", 1));
        var request = request(A, Map.of("helmet", helmet));
        request.getAdvisor().getAllowedChanges().setDrifUpgrades(true);
        request.getAdvisor().setTargetGain(3.0);

        var result = f.service.optimize(request);

        SlotData optimized = result.getOptimizedSetup().getSlots().get("helmet");
        assertEquals(List.of(10L), optimized.getDrifIds());
        assertEquals(4, optimized.getDrifLevels().get("0"));
        assertEquals(List.of(10L), request.getOriginalSlots().get("helmet").getDrifIds());
        assertEquals(1, request.getOriginalSlots().get("helmet").getDrifLevels().get("0"));
        assertTrue(
                result.getAdvisorReport()
                        .plans()
                        .getFirst()
                        .actions()
                        .getFirst()
                        .contains("Ulepsz"));
    }

    @Test
    void itemReplacementHonorsExplicitProfessionAndKeepsStarsAndDrifs() {
        ItemTemplate current = item(1, ITEM_CATEGORY.HELMET, "I", 10, 0);
        current.setProfile(ITEM_PROFILE.UNIVERSAL);
        ItemTemplate physical = item(2, ITEM_CATEGORY.HELMET, "I", 10, 20);
        physical.setProfile(ITEM_PROFILE.PHYSICAL);
        ItemTemplate magical = item(3, ITEM_CATEGORY.HELMET, "I", 10, 50);
        magical.setProfile(ITEM_PROFILE.MAGICAL);
        Fixture f = fixture(List.of(current, physical, magical), List.of(drif(10, A, "10%")));
        SlotData helmet = slot(1, 7, 10L);
        helmet.setDrifLevels(Map.of("0", 6));
        var request = request(A, Map.of("helmet", helmet));
        request.getAdvisor().getAllowedChanges().setItems(true);
        request.getAdvisor().setProfession("PHYSICAL");
        request.getAdvisor().setTargetGain(1.0);

        var result = f.service.optimize(request);

        SlotData optimized = result.getOptimizedSetup().getSlots().get("helmet");
        assertEquals(2L, optimized.getItemId());
        assertEquals(7, optimized.getItemStars());
        assertEquals(List.of(10L), optimized.getDrifIds());
        assertEquals(6, optimized.getDrifLevels().get("0"));
        assertTrue(
                result.getAdvisorReport()
                        .plans()
                        .getFirst()
                        .actions()
                        .getFirst()
                        .contains("Zmień"));
    }

    @Test
    void automaticProfessionUsesCharacterStatsAndRejectsSpecialReplacementItems() {
        ItemTemplate current = item(1, ITEM_CATEGORY.HELMET, "I", 10, 0);
        current.setProfile(ITEM_PROFILE.UNSPECIFIED);
        ItemTemplate physical = item(2, ITEM_CATEGORY.HELMET, "I", 10, 20);
        physical.setProfile(ITEM_PROFILE.PHYSICAL);
        ItemTemplate magical = item(3, ITEM_CATEGORY.HELMET, "I", 10, 40);
        magical.setProfile(ITEM_PROFILE.MAGICAL);
        ItemTemplate epic = item(4, ITEM_CATEGORY.HELMET, "I", 10, 90);
        epic.setProfile(ITEM_PROFILE.PHYSICAL);
        epic.setRarity(RARITY.EPIC);
        Fixture f = fixture(List.of(current, physical, magical, epic), List.of(drif(10, A, "10%")));
        var request = request(A, Map.of("helmet", slot(1, 1, 10L)));
        request.setCharacterStats(Map.of("Siła", 50, "Moc", 1));
        request.getAdvisor().getAllowedChanges().setItems(true);

        var result = f.service.optimize(request);

        assertEquals(2L, result.getOptimizedSetup().getSlots().get("helmet").getItemId());
    }

    @Test
    void purchaseGenerationSupportsEveryAllowedBoundaryLevelAndSkipsWrongBonus() {
        DrifTemplate goal = drif(10, A, "2%");
        goal.setSize(DRIF_SIZE.ARCYDRIF);
        goal.setIncrement("1%");
        DrifTemplate unrelated = drif(20, B, "100%");
        unrelated.setSize(DRIF_SIZE.ARCYDRIF);
        Fixture f =
                fixture(
                        List.of(item(1, ITEM_CATEGORY.HELMET, "X", 40, 0)),
                        List.of(goal, unrelated));
        var request = request(A, Map.of("helmet", slot(1, 1)));
        request.getAdvisor().getAllowedChanges().setDrifs(true);
        request.getAdvisor().setTargetGain(17.0);

        var result = f.service.optimize(request);

        assertTrue(result.getAdvisorReport().targetReached());
        assertEquals(
                List.of(10L), result.getOptimizedSetup().getSlots().get("helmet").getDrifIds());
        assertEquals(
                21, result.getOptimizedSetup().getSlots().get("helmet").getDrifLevels().get("0"));
    }

    @Test
    void rejectsInvalidCapacityTierAndDuplicateBuilds() {
        DrifTemplate large = drif(11, A, "10%");
        large.setSize(DRIF_SIZE.ARCYDRIF);
        Fixture f =
                fixture(
                        List.of(item(1, ITEM_CATEGORY.HELMET, "I", 0, 0)),
                        List.of(drif(10, A, "10%"), large));
        assertFalse(
                f.service
                        .optimize(request(A, Map.of("helmet", slot(1, 1, 10L))))
                        .getSummary()
                        .isSuccess());
        assertFalse(
                f.service
                        .optimize(request(A, Map.of("helmet", slot(1, 1, 11L))))
                        .getSummary()
                        .isSuccess());
        assertFalse(
                f.service
                        .optimize(request(A, Map.of("helmet", slot(1, 1, 10L, 10L))))
                        .getSummary()
                        .isSuccess());
        verifyNoInteractions(f.calculator);
    }

    @Test
    void cancellationReturnsANonDestructiveCompletedAnalysis() {
        Fixture f =
                fixture(
                        List.of(item(1, ITEM_CATEGORY.HELMET, "I", 10, 0)),
                        List.of(drif(10, A, "10%")));
        var request = request(A, Map.of("helmet", slot(1, 1, 10L)));
        String id = UUID.randomUUID().toString();
        request.getAdvisor().setRunId(id);
        doAnswer(
                        invocation -> {
                            assertTrue(f.runs.cancel(id));
                            return invocation.callRealMethod();
                        })
                .when(f.calculator)
                .calculateTotalStats(any());
        var result = f.service.optimize(request);
        assertTrue(result.getAdvisorReport().cancelled());
        assertEquals(request.getOriginalSlots(), result.getOptimizedSetup().getSlots());
        assertFalse(f.runs.cancel(id));
    }

    private static OptimizationRequest request(DRIF_BONUS_TYPE goal, Map<String, SlotData> slots) {
        OptimizationRequest request = new OptimizationRequest();
        request.setMode(OptimizationMode.ADVISOR);
        request.setOriginalSlots(slots);
        request.setPriorities(Map.of(goal, 30));
        AdvisorOptions options = new AdvisorOptions();
        options.setGoal(goal);
        options.setMaxActions(1);
        options.getAllowedChanges().setStars(false);
        request.setAdvisor(options);
        return request;
    }

    @Test
    void returnsNoChangesWhenTargetIsAlreadyMet() {
        Fixture f =
                fixture(
                        List.of(item(1, ITEM_CATEGORY.HELMET, "I", 10, 0)),
                        List.of(drif(10, A, "10%")));
        var request = request(A, Map.of("helmet", slot(1, 1, 10L)));
        request.getAdvisor().setTargetValue(10.0);
        request.getAdvisor().getAllowedChanges().setStars(true);
        var result = f.service.optimize(request);
        assertTrue(result.getAdvisorReport().targetReached());
        assertEquals(0, result.getAdvisorReport().evaluatedStates());
        assertTrue(result.getSummary().getNextVariants().isEmpty());
    }

    @Test
    void findsACompensatingTwoSwapPlan() {
        var c = DRIF_BONUS_TYPE.DAMAGE_MAGIC;
        Fixture f =
                fixture(
                        List.of(
                                item(1, ITEM_CATEGORY.HELMET, "I", 10, 0),
                                item(2, ITEM_CATEGORY.BOOTS, "I", 10, 20),
                                item(3, ITEM_CATEGORY.ARMOR, "I", 10, 0),
                                item(4, ITEM_CATEGORY.BELT, "I", 10, 10)),
                        List.of(
                                drif(10, A, "10%"),
                                drif(20, B, "2%"),
                                drif(21, B, "10%"),
                                drif(30, c, "0%")));
        var request =
                request(
                        A,
                        Map.of(
                                "helmet",
                                slot(1, 1, 10L),
                                "boots",
                                slot(2, 1, 20L),
                                "armor",
                                slot(3, 1, 21L),
                                "belt",
                                slot(4, 1, 30L)));
        request.getAdvisor().setMaxActions(2);
        request.getAdvisor().setTargetGain(2.0);
        var result = f.service.optimize(request);
        assertTrue(result.getAdvisorReport().targetReached());
        assertEquals(2, result.getAdvisorReport().plans().getFirst().actions().size());
        assertTrue(
                result.getSummary().getGoalResults().stream()
                        .filter(g -> g.statKey().equals(B.name()))
                        .findFirst()
                        .orElseThrow()
                        .targetSatisfied());
    }

    @Test
    void boundsWorkOnAFullBuildAndVerifiesEveryReturnedPlan() {
        String[] keys = {
            "helmet",
            "armor",
            "cape",
            "legs",
            "boots",
            "gloves",
            "belt",
            "necklace",
            "ring1",
            "ring2",
            "weapon",
            "shield"
        };
        ITEM_CATEGORY[] categories = {
            ITEM_CATEGORY.HELMET,
            ITEM_CATEGORY.ARMOR,
            ITEM_CATEGORY.CAPE,
            ITEM_CATEGORY.LEGS,
            ITEM_CATEGORY.BOOTS,
            ITEM_CATEGORY.GLOVES,
            ITEM_CATEGORY.BELT,
            ITEM_CATEGORY.NECKLACE,
            ITEM_CATEGORY.RING,
            ITEM_CATEGORY.RING,
            ITEM_CATEGORY.WEAPON_1H,
            ITEM_CATEGORY.OFF_HAND
        };
        List<ItemTemplate> items = new ArrayList<>();
        List<DrifTemplate> drifs = new ArrayList<>();
        var types =
                List.of(
                        A,
                        B,
                        DRIF_BONUS_TYPE.DAMAGE_MAGIC,
                        DRIF_BONUS_TYPE.DAMAGE_PHYSICAL,
                        DRIF_BONUS_TYPE.DODGE_CHANCE,
                        DRIF_BONUS_TYPE.HIT_CHANCE_MELEE);
        for (int i = 0; i < types.size(); i++) {
            DrifTemplate drif = drif(100 + i, types.get(i), "2%");
            drif.setSize(DRIF_SIZE.ARCYDRIF);
            drif.setIncrement("0.5%");
            drifs.add(drif);
        }
        Map<String, SlotData> slots = new LinkedHashMap<>();
        for (int i = 0; i < keys.length; i++) {
            items.add(item(i + 1, categories[i], "X", 48, (i % 3) * 10));
            SlotData slot =
                    slot(i + 1, 6 + i % 4, 100L + i % 6, 100L + (i + 1) % 6, 100L + (i + 2) % 6);
            slot.setDrifLevels(Map.of("0", 6 + i % 4 * 5, "1", 11, "2", 16));
            slots.put(keys[i], slot);
        }
        Fixture f = fixture(items, drifs);
        var request = request(A, slots);
        request.getAdvisor().setMaxActions(3);
        request.getAdvisor().getAllowedChanges().setStars(true);
        long started = System.nanoTime();
        var result = f.service.optimize(request);
        assertTrue(result.getSummary().isSuccess());
        assertTrue(result.getAdvisorReport().evaluatedStates() <= 20000);
        verify(f.calculator, atMost(19)).calculateTotalStats(any());
        verify(f.items, times(1)).findAll();
        System.out.printf(
                Locale.ROOT,
                "Advisor full-build benchmark: %.3f s, %d states, %d verified plans%n",
                (System.nanoTime() - started) / 1_000_000_000.0,
                result.getAdvisorReport().evaluatedStates(),
                result.getSummary().getNextVariants().size());
        for (var plan : result.getSummary().getNextVariants()) {
            Map<String, String> actual = f.calculator.calculateTotalStats(plan.setup());
            assertEquals(
                    plan.variantValue(),
                    Double.parseDouble(actual.get(A.name()).replace("%", "")),
                    0.0001);
            assertTrue(plan.gain() > 0);
            assertTrue(plan.changeCount() <= 3);
        }
    }

    private static SlotData slot(long item, int stars, Long... drifs) {
        SlotData slot = new SlotData();
        slot.setItemId(item);
        slot.setItemStars(stars);
        slot.setDrifIds(new ArrayList<>(Arrays.asList(drifs)));
        slot.setDrifLevels(new HashMap<>());
        return slot;
    }

    private static ItemTemplate item(
            long id, ITEM_CATEGORY category, String tier, int capacity, double bonus) {
        return ItemTemplate.builder()
                .id(id)
                .name("Item " + id)
                .category(category)
                .tier(tier)
                .capacity(capacity)
                .rarity(RARITY.RARE)
                .stats(Map.of("Bonus drify", bonus))
                .build();
    }

    private static DrifTemplate drif(long id, DRIF_BONUS_TYPE type, String value) {
        return DrifTemplate.builder()
                .id(id)
                .name(type.name())
                .size(DRIF_SIZE.SUBDRIF)
                .bonusType(type)
                .baseValue(value)
                .increment("0%")
                .build();
    }

    private Fixture fixture(List<ItemTemplate> items, List<DrifTemplate> drifs) {
        ItemTemplateRepository itemRepo = mock(ItemTemplateRepository.class);
        DrifTemplateRepository drifRepo = mock(DrifTemplateRepository.class);
        OrbTemplateRepository orbRepo = mock(OrbTemplateRepository.class);
        when(itemRepo.findAll()).thenReturn(items);
        when(itemRepo.findAllById(any())).thenReturn(items);
        when(drifRepo.findAll()).thenReturn(drifs);
        when(drifRepo.findAllById(any())).thenReturn(drifs);
        when(orbRepo.findAll()).thenReturn(List.of());
        when(orbRepo.findAllById(any())).thenReturn(List.of());
        EquipmentRulesRegistry rules = new EquipmentRulesRegistry();
        EquipmentPlacementRules placement = new EquipmentPlacementRules(rules);
        UpgradeLevelPolicy levels = new UpgradeLevelPolicy();
        ItemStatProcessor itemProcessor = new ItemStatProcessor(mock(RandomProvider.class));
        OrbStatProcessor orbProcessor =
                new OrbStatProcessor(placement, levels, new OrbSecurityValidator());
        DrifValueCalculator values = new DrifValueCalculator();
        EquipmentStatsCalculatorService calculator =
                spy(
                        EquipmentStatsCalculatorTestFactory.create(
                                new EquipmentDataProvider(itemRepo, orbRepo, drifRepo),
                                new EquipmentRequestValidator(),
                                placement,
                                levels,
                                new DrifSecurityValidator(placement, levels),
                                itemProcessor,
                                orbProcessor,
                                new DrifStatProcessor(placement, levels, rules, values),
                                new DrifCounter(placement),
                                new CalculationMetadataFactory(),
                                new SlotDrifSelectionFactory()));
        AdvisorRunRegistry runs = new AdvisorRunRegistry();
        return new Fixture(
                new AdvisorOptimizationService(
                        itemRepo,
                        drifRepo,
                        orbRepo,
                        placement,
                        levels,
                        rules,
                        itemProcessor,
                        orbProcessor,
                        values,
                        calculator,
                        runs),
                itemRepo,
                calculator,
                runs);
    }

    private record Fixture(
            AdvisorOptimizationService service,
            ItemTemplateRepository items,
            EquipmentStatsCalculatorService calculator,
            AdvisorRunRegistry runs) {}
}
