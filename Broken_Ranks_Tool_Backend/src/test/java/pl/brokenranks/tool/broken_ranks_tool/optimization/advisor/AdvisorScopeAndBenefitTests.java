package pl.brokenranks.tool.broken_ranks_tool.optimization.advisor;

import static org.junit.jupiter.api.Assertions.*;

import java.util.*;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.stream.Collectors;
import org.junit.jupiter.api.Test;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.*;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.rules.*;
import pl.brokenranks.tool.broken_ranks_tool.equipment.dto.EquipmentRequest;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.*;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.calculator.input.EquipmentDataProvider.CalculationContext;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.calculator.processor.*;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.validator.*;
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.*;

class AdvisorScopeAndBenefitTests extends AdvisorOptimizationTestSupport {

    @Test
    void automaticItemProfileUsesCanonicalCharacterStatNames() {
        var original = item(1, ITEM_CATEGORY.HELMET, "I", 10, 0);
        var magical = item(2, ITEM_CATEGORY.HELMET, "I", 10, 20);
        magical.setProfile(ITEM_PROFILE.MAGICAL);
        var physical = item(3, ITEM_CATEGORY.HELMET, "I", 10, 100);
        physical.setProfile(ITEM_PROFILE.PHYSICAL);
        var f = fixture(List.of(original, magical, physical), List.of(drif(10, A, "10%")));
        var request = request(A, Map.of("helmet", slot(1, 1, 10L)));
        request.setCharacterStats(Map.of("moc", 100));
        request.getAdvisor().getAllowedChanges().setItems(true);
        var response = f.service.optimize(request);
        assertEquals(2L, response.getOptimizedSetup().getSlots().get("helmet").getItemId());
        assertEquals("100", response.getCalculationResult().stats().get("Moc"));
    }

    @Test
    void deduplicationKeepsCheaperAndCostTradeoffPathsToTheSameState() {
        var items = List.of(item(1, ITEM_CATEGORY.HELMET, "IV", 10, 0));
        var request = request(A, Map.of("helmet", slot(1, 1)));
        var search =
                new AdvisorSearch(
                        model(request, items, List.of()),
                        request.getAdvisor(),
                        new double[AdvisorStatValues.TYPES.length],
                        System.nanoTime() + 3_000_000_000L,
                        new AtomicBoolean());
        Set<AdvisorChangeKey> changes = Set.of(new AdvisorChangeKey.Drif("helmet", 0));
        var costly =
                new AdvisorSearch.Node(
                        request.getOriginalSlots(),
                        null,
                        List.of("buy", "move", "upgrade"),
                        changes,
                        2,
                        16);
        var cheaper =
                new AdvisorSearch.Node(
                        request.getOriginalSlots(),
                        null,
                        List.of("buy", "move", "upgrade"),
                        changes,
                        2,
                        5);
        var shorter =
                new AdvisorSearch.Node(
                        request.getOriginalSlots(), null, List.of("buy", "upgrade"), changes, 2, 7);
        assertTrue(search.admit(costly));
        assertTrue(search.admit(cheaper));
        assertFalse(search.admit(costly));
        assertTrue(search.admit(shorter));
        assertFalse(search.admit(cheaper));
    }

    @Test
    void disabledProtectionIsExcludedFromProtectedPurchaseScope() {
        var items =
                List.of(
                        item(1, ITEM_CATEGORY.HELMET, "IV", 10, 0),
                        item(2, ITEM_CATEGORY.ARMOR, "IV", 10, 0));
        var drifs = List.of(drif(10, A, "5%"), drif(20, B, "10%"));
        var request = request(A, Map.of("helmet", slot(1, 1, 20L), "armor", slot(2, 1)));
        request.getAdvisor().getAllowedChanges().setDrifs(true);
        request.getAdvisor().setPurchaseScope(AdvisorOptions.PurchaseScope.GOAL_AND_PROTECTED);
        var protection = new AdvisorOptions.Protection();
        protection.setEnabled(false);
        request.getAdvisor().setProtectedModifiers(Map.of(B, protection));
        var model = model(request, items, drifs);
        var search =
                new AdvisorSearch(
                        model,
                        request.getAdvisor(),
                        model.evaluate(request.getOriginalSlots()),
                        System.nanoTime() + 3_000_000_000L,
                        new AtomicBoolean());
        List<AdvisorSearch.Node> nodes = new ArrayList<>();
        new AdvisorActionGenerator(search)
                .generate(
                        new AdvisorSearch.Node(
                                request.getOriginalSlots(), null, List.of(), Set.of(), 0, 0),
                        nodes::add);
        assertTrue(nodes.stream().anyMatch(node -> node.upgrades() == 1));
        assertTrue(
                nodes.stream()
                        .filter(node -> node.upgrades() == 1)
                        .allMatch(
                                node ->
                                        node.changed().stream()
                                                .filter(key -> key instanceof AdvisorChangeKey.Drif)
                                                .map(key -> (AdvisorChangeKey.Drif) key)
                                                .allMatch(
                                                        key ->
                                                                AdvisorSlotData.id(
                                                                                node.slots()
                                                                                        .get(
                                                                                                key
                                                                                                        .slot()),
                                                                                key.index())
                                                                        == 10L)));
    }

    @Test
    void purchasesUseSelectedScopeAndRespectDisabledProtections() {
        var items =
                List.of(
                        item(1, ITEM_CATEGORY.HELMET, "IV", 10, 0),
                        item(2, ITEM_CATEGORY.ARMOR, "IV", 10, 0));
        var drifs =
                List.of(
                        drif(10, A, "5%"),
                        drif(20, B, "10%"),
                        drif(30, DRIF_BONUS_TYPE.DAMAGE_MAGIC, "5%"));
        for (var scope : AdvisorOptions.PurchaseScope.values()) {
            var request = request(A, Map.of("helmet", slot(1, 1, 20L), "armor", slot(2, 1)));
            request.getAdvisor().getAllowedChanges().setDrifs(true);
            request.getAdvisor().setPurchaseScope(scope);
            var model = model(request, items, drifs);
            var search =
                    new AdvisorSearch(
                            model,
                            request.getAdvisor(),
                            model.evaluate(request.getOriginalSlots()),
                            System.nanoTime() + 3_000_000_000L,
                            new AtomicBoolean());
            var root =
                    new AdvisorSearch.Node(
                            request.getOriginalSlots(),
                            model.evaluate(request.getOriginalSlots()),
                            List.of(),
                            Set.of(),
                            0,
                            0);
            List<AdvisorSearch.Node> children = new ArrayList<>();
            new AdvisorActionGenerator(search).generate(root, children::add);
            Set<Long> purchased =
                    children.stream()
                            .filter(node -> node.upgrades() == 1)
                            .flatMap(
                                    node ->
                                            node.changed().stream()
                                                    .filter(
                                                            key ->
                                                                    key
                                                                            instanceof
                                                                            AdvisorChangeKey.Drif)
                                                    .map(key -> (AdvisorChangeKey.Drif) key)
                                                    .map(
                                                            key ->
                                                                    AdvisorSlotData.id(
                                                                            node.slots()
                                                                                    .get(
                                                                                            key
                                                                                                    .slot()),
                                                                            key.index())))
                            .collect(Collectors.toSet());
            assertEquals(
                    switch (scope) {
                        case GOAL_ONLY -> Set.of(10L);
                        case GOAL_AND_PROTECTED -> Set.of(10L, 20L);
                        case ANY -> Set.of(10L, 20L, 30L);
                    },
                    purchased);
        }
    }

    @Test
    void bestResultRewardsUpToCapUnlessExplicitlyLimitedToRequestedTarget() {
        var items = List.of(item(1, ITEM_CATEGORY.HELMET, "I", 10, 0));
        var request = request(A, Map.of("helmet", slot(1, 1)));
        request.getAdvisor().setStrategy(AdvisorOptions.Strategy.BEST_RESULT);
        request.getAdvisor().setTargetGain(10.0);
        double[] baseline = new double[AdvisorStatValues.TYPES.length];
        baseline[A.ordinal()] = 20;
        for (boolean limited : List.of(false, true)) {
            request.getAdvisor().setLimitBenefitToTarget(limited);
            var search =
                    new AdvisorSearch(
                            model(request, items, List.of()),
                            request.getAdvisor(),
                            baseline,
                            System.nanoTime() + 3_000_000_000L,
                            new AtomicBoolean());
            assertEquals(30, search.target);
            double[] lower = baseline.clone();
            lower[A.ordinal()] = 30;
            double[] higher = baseline.clone();
            higher[A.ordinal()] = 40;
            var low = new AdvisorSearch.Node(Map.of(), lower, List.of("upgrade"), Set.of(), 1, 1);
            var high = new AdvisorSearch.Node(Map.of(), higher, List.of("upgrade"), Set.of(), 1, 1);
            assertEquals(limited ? 0 : -1, Integer.signum(search.ranking().compare(high, low)));
        }
    }

    @Test
    void setRemainsCountedAndCannotReceiveAnyActions() {
        var set = item(1, ITEM_CATEGORY.HELMET, "XII", 0, 0);
        set.setRarity(RARITY.SET);
        set.setStats(Map.of("PŻ", 100.0));
        var f = fixture(List.of(set), List.of());
        var request = request(A, Map.of("helmet", slot(1, 1)));
        request.getAdvisor().getAllowedChanges().setStars(true);
        request.getAdvisor().getAllowedChanges().setItems(true);
        request.getAdvisor().getAllowedChanges().setDrifs(true);
        var response = f.service.optimize(request);
        assertEquals("100", response.getCalculationResult().stats().get("PŻ"));
        assertEquals(1, response.getOptimizedSetup().getSlots().get("helmet").getItemStars());
        assertEquals(0, response.getAdvisorReport().evaluatedStates());
    }

    @Test
    void modelAndProtectionUseTheSameRoundedStatsAsTheCalculator() {
        var items = List.of(item(1, ITEM_CATEGORY.HELMET, "I", 10, 12.35));
        var drifs = List.of(drif(20, B, "10%"));
        var request = request(A, Map.of("helmet", slot(1, 1, 20L)));
        var f = fixture(items, drifs);
        var setup = new EquipmentRequest();
        setup.setSlots(request.getOriginalSlots());
        double[] actual = AdvisorStatValues.parsed(f.calculator.calculateTotalStats(setup));
        var model = model(request, items, drifs);
        assertArrayEquals(actual, model.evaluate(request.getOriginalSlots()), 1e-8);
    }

    private AdvisorEquipmentModel model(
            OptimizationRequest request, List<ItemTemplate> items, List<DrifTemplate> drifs) {
        var templates =
                new CalculationContext(
                        items.stream()
                                .collect(Collectors.toMap(ItemTemplate::getId, value -> value)),
                        Map.of(),
                        drifs.stream()
                                .collect(Collectors.toMap(DrifTemplate::getId, value -> value)));
        var rules = new EquipmentRulesRegistry();
        var placement = new EquipmentPlacementRules(rules);
        return new AdvisorEquipmentModel(
                templates,
                request,
                placement,
                new UpgradeLevelPolicy(),
                rules,
                new ItemStatProcessor(),
                new OrbStatProcessor(placement, new OrbSecurityValidator()),
                new DrifValueCalculator());
    }
}
