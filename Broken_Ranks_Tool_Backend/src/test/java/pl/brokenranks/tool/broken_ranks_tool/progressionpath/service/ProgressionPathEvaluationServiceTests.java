package pl.brokenranks.tool.broken_ranks_tool.progressionpath.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import jakarta.validation.Validation;
import jakarta.validation.ValidatorFactory;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.*;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.rules.EquipmentRulesRegistry;
import pl.brokenranks.tool.broken_ranks_tool.equipment.dto.CalculationResultDto;
import pl.brokenranks.tool.broken_ranks_tool.equipment.dto.EquipmentRequest;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.ItemTemplate;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.EquipmentStatsCalculatorService;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.calculator.input.EquipmentDataProvider;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.calculator.input.EquipmentDataProvider.CalculationContext;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.validator.EquipmentRequestValidator;
import pl.brokenranks.tool.broken_ranks_tool.progressionpath.model.*;

class ProgressionPathEvaluationServiceTests {
    private static ValidatorFactory validation;
    private final EquipmentDataProvider provider = mock(EquipmentDataProvider.class);
    private final EquipmentStatsCalculatorService calculator =
            mock(EquipmentStatsCalculatorService.class);
    private ProgressionPathEvaluationService service;
    private ItemTemplate item;

    @BeforeAll
    static void createValidation() {
        validation = Validation.buildDefaultValidatorFactory();
    }

    @AfterAll
    static void closeValidation() {
        validation.close();
    }

    @BeforeEach
    void setup() {
        service =
                new ProgressionPathEvaluationService(
                        provider,
                        calculator,
                        new EquipmentRequestValidator(new EquipmentRulesRegistry()),
                        validation.getValidator());
        item =
                ItemTemplate.builder()
                        .id(1L)
                        .name("Hełm")
                        .reqLevel(10)
                        .classScope(ITEM_CLASS_SCOPE.UNIVERSAL)
                        .build();
        when(provider.buildContext(any()))
                .thenReturn(new CalculationContext(Map.of(1L, item), Map.of(), Map.of()));
        when(calculator.prepareCalculationWithSources(any(), any(), any()))
                .thenReturn(
                        request ->
                                new CalculationResultDto(Map.of("Siła", "10"), Map.of(), Set.of()));
    }

    @Test
    void preparesOneCatalogSessionForAllStagesAndReturnsReadOnlyResults() {
        var path = path(equipment(), equipment());
        var results = service.evaluate(path);
        assertEquals(
                List.of("start", "target"),
                results.stream().map(result -> result.stage().id()).toList());
        verify(provider, times(1)).buildContext(any());
        verify(calculator, times(1)).prepareCalculationWithSources(any(), any(), any());
        verifyNoMoreInteractions(provider, calculator);
        assertThrows(UnsupportedOperationException.class, () -> results.clear());
        assertThrows(
                UnsupportedOperationException.class,
                () -> results.getFirst().calculation().stats().clear());
    }

    @Test
    void validatesEveryEnvelopeBeforeLoadingTheCatalog() {
        var bad = equipment();
        bad.setSlots(Map.of("invalid", new EquipmentRequest.SlotData()));
        var exception =
                assertThrows(
                        IllegalArgumentException.class,
                        () -> service.evaluate(path(equipment(), bad)));
        assertTrue(exception.getMessage().contains("Etap 'target'"));
        verifyNoInteractions(provider, calculator);
    }

    @Test
    void rejectsOversizedPayloadAndBadStatsBeforeCatalogLoading() {
        var oversized = equipment();
        oversized
                .getSlots()
                .get("helmet")
                .setDrifIds(Arrays.asList(1L, 1L, 1L, 1L, 1L, 1L, 1L, 1L, 1L));
        assertThrows(
                IllegalArgumentException.class,
                () -> service.evaluate(path(equipment(), oversized)));
        var badStats = equipment();
        badStats.setCharacterStats(Map.of("Siła", -1));
        assertThrows(
                IllegalArgumentException.class,
                () -> service.evaluate(path(equipment(), badStats)));
        verifyNoInteractions(provider, calculator);
    }

    @Test
    void rejectsItemsBeforeTheirRequiredLevelWithTheStageId() {
        item.setReqLevel(11);
        var exception =
                assertThrows(
                        IllegalArgumentException.class,
                        () -> service.evaluate(path(equipment(), equipment())));
        assertTrue(exception.getMessage().contains("Etap 'start'"));
        assertTrue(exception.getMessage().contains("wymaga poziomu 11"));
    }

    @Test
    void rejectsUnavailableAndUnclassifiedItemsInsteadOfInferringFromTheirProfile() {
        item.setClassScope(ITEM_CLASS_SCOPE.RESTRICTED);
        item.setAllowedClasses(Set.of(CHARACTER_CLASS.FIRE_MAGE));
        assertThrows(
                IllegalArgumentException.class,
                () -> service.evaluate(path(equipment(), equipment())));
        item.setAllowedClasses(Set.of(CHARACTER_CLASS.ARCHER));
        assertEquals(2, service.evaluate(path(equipment(), equipment())).size());
        item.setClassScope(ITEM_CLASS_SCOPE.UNKNOWN);
        assertThrows(
                IllegalArgumentException.class,
                () -> service.evaluate(path(equipment(), equipment())));
        item.setClassScope(null);
        assertThrows(
                IllegalArgumentException.class,
                () -> service.evaluate(path(equipment(), equipment())));
    }

    @Test
    void identifiesAnUnknownItemAndCalculatorErrorsAtTheirStage() {
        var unknown = equipment();
        unknown.getSlots().get("helmet").setItemId(99L);
        var missing =
                assertThrows(
                        IllegalArgumentException.class,
                        () -> service.evaluate(path(equipment(), unknown)));
        assertTrue(missing.getMessage().contains("Etap 'target'"));
        assertTrue(missing.getMessage().contains("ID 99"));
        when(calculator.prepareCalculationWithSources(any(), any(), any()))
                .thenReturn(
                        request -> {
                            if (Integer.valueOf(9)
                                    .equals(request.getSlots().get("helmet").getItemStars())) {
                                throw new IllegalArgumentException("Przekroczono pojemność.");
                            }
                            return new CalculationResultDto(Map.of(), Map.of(), Set.of());
                        });
        var target = equipment();
        target.getSlots().get("helmet").setItemStars(9);
        var failed =
                assertThrows(
                        IllegalArgumentException.class,
                        () -> service.evaluate(path(equipment(), target)));
        assertTrue(failed.getMessage().contains("Etap 'target': Przekroczono pojemność."));
    }

    @Test
    void handlesEmptySlotsAndReportsMissingPath() {
        var empty = new EquipmentRequest();
        empty.setSlots(Map.of("helmet", new EquipmentRequest.SlotData()));
        assertEquals(2, service.evaluate(path(empty, empty)).size());
        assertThrows(IllegalArgumentException.class, () -> service.evaluate(null));
    }

    private ProgressionPath path(EquipmentRequest start, EquipmentRequest target) {
        return new ProgressionPath(
                CHARACTER_CLASS.ARCHER,
                List.of(
                        new ProgressionStage("start", 10, start),
                        new ProgressionStage("target", 140, target)));
    }

    private EquipmentRequest equipment() {
        var slot = new EquipmentRequest.SlotData();
        slot.setItemId(1L);
        var request = new EquipmentRequest();
        request.setSlots(new LinkedHashMap<>(Map.of("helmet", slot)));
        return request;
    }
}
