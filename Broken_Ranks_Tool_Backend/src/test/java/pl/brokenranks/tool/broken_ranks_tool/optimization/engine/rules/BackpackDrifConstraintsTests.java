package pl.brokenranks.tool.broken_ranks_tool.optimization.engine.rules;

import static org.junit.jupiter.api.Assertions.*;
import static pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model.OptimizationEngineFixture.*;

import java.util.*;
import java.util.stream.Stream;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_BONUS_TYPE;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.rules.EquipmentRulesRegistry;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.validator.EquipmentPlacementRules;
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.*;

class BackpackDrifConstraintsTests {
    private static OptimizationRequest.BackpackDrif owned(String id, Long template, Integer level) {
        var entry = new OptimizationRequest.BackpackDrif();
        entry.setId(id);
        entry.setTemplateId(template);
        entry.setLevel(level);
        return entry;
    }

    private static OptimizationRequest using(List<OptimizationRequest.BackpackDrif> entries) {
        var request = request(DRIF_BONUS_TYPE.CRITICAL_CHANCE);
        request.setBackpackOnly(true);
        request.setBackpackDrifs(entries);
        return request;
    }

    static Stream<OptimizationRequest.BackpackDrif> malformed() {
        return Stream.of(
                null,
                owned(null, 1L, 1),
                owned("", 1L, 1),
                owned(" ", 1L, 1),
                owned("\u00a0\ufeff", 1L, 1),
                owned("a".repeat(129), 1L, 1),
                owned("stone", null, 1),
                owned("stone", 0L, 1),
                owned("stone", -1L, 1),
                owned("stone", 1L, null),
                owned("stone", 1L, 0),
                owned("stone", 1L, 22));
    }

    @ParameterizedTest
    @MethodSource("malformed")
    void rejectsMalformedOccurrences(OptimizationRequest.BackpackDrif entry) {
        assertNotNull(
                BackpackDrifConstraints.validateRequest(using(Collections.singletonList(entry))));
    }

    @Test
    void acceptsEmptyStockAnd200DistinctCopiesButRejectsOverflowBeforeEntryValidation() {
        assertNull(BackpackDrifConstraints.validateRequest(using(List.of())));
        var stock =
                java.util.stream.IntStream.range(0, 200)
                        .mapToObj(i -> owned("stone-" + i, 1L, 21))
                        .toList();
        assertNull(BackpackDrifConstraints.validateRequest(using(stock)));
        assertTrue(
                BackpackDrifConstraints.validateRequest(using(Collections.nCopies(201, null)))
                        .contains("200"));
    }

    @Test
    void rejectsDuplicateIdsWithoutRejectingDistinctCopiesOfTheSameTemplate() {
        assertNotNull(
                BackpackDrifConstraints.validateRequest(
                        using(List.of(owned("same", 1L, 1), owned("same", 2L, 2)))));
        assertNull(
                BackpackDrifConstraints.validateRequest(
                        using(List.of(owned("one", 1L, 1), owned("two", 1L, 1)))));
    }

    @Test
    void rejectsStockWithoutTheOptionAndTheOptionOutsideAdvancedScratch() {
        var request = using(List.of(owned("one", 1L, 1)));
        request.setBackpackOnly(false);
        assertNotNull(BackpackDrifConstraints.validateRequest(request));
        request.setBackpackOnly(true);
        request.setBackpackDrifs(null);
        assertNotNull(BackpackDrifConstraints.validateRequest(request));
        request.setBackpackDrifs(List.of());
        request.setMode(OptimizationMode.ADVISOR);
        assertNotNull(BackpackDrifConstraints.validateRequest(request));
        request.setMode(OptimizationMode.BUILD_FROM_SCRATCH);
        request.setConfigurationMode(BuildConfigurationMode.SIMPLE);
        assertNotNull(BackpackDrifConstraints.validateRequest(request));
        request.setConfigurationMode(BuildConfigurationMode.ADVANCED);
        request.setGenerateVariants(true);
        assertNotNull(BackpackDrifConstraints.validateRequest(request));
    }

    @Test
    void validatesUnknownTemplatesSizeLevelsAndNumericCatalogValuesEvenForUnusedBonusTypes() {
        var drif = drif(1, DRIF_BONUS_TYPE.CRITICAL_CHANCE);
        var placementRules = new EquipmentPlacementRules(new EquipmentRulesRegistry());
        var context =
                context(
                        using(List.of(owned("one", 1L, 6))),
                        slot("helmet", 24, 3, 0, false, Set.of(), drif));
        assertNull(BackpackDrifConstraints.validateCatalog(context, placementRules));
        context.request().setBackpackDrifs(List.of(owned("one", 1L, 7)));
        assertNotNull(BackpackDrifConstraints.validateCatalog(context, placementRules));
        context.request().setBackpackDrifs(List.of(owned("one", 99L, 1)));
        assertNotNull(BackpackDrifConstraints.validateCatalog(context, placementRules));
        context.request().setBackpackDrifs(List.of(owned("one", 1L, 1)));
        drif.setBaseValue("NaN");
        assertNotNull(BackpackDrifConstraints.validateCatalog(context, placementRules));
        drif.setBaseValue("2%");
        drif.setIncrement("invalid");
        assertNotNull(BackpackDrifConstraints.validateCatalog(context, placementRules));
        drif.setIncrement("1%");
        drif.setSize(null);
        assertNotNull(BackpackDrifConstraints.validateCatalog(context, placementRules));
    }
}
