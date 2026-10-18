package pl.brokenranks.tool.broken_ranks_tool.optimization.service.impl;

import static org.junit.jupiter.api.Assertions.*;

import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_BONUS_TYPE;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.EquipmentStatsCalculatorService;
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.*;
import tools.jackson.databind.ObjectMapper;

@SpringBootTest(properties = "spring.jpa.show-sql=false")
class ReorganizationRealBuildTests {
    @Autowired private ObjectMapper mapper;
    @Autowired private CustomModsOptimizationServiceImpl optimizer;
    @Autowired private EquipmentStatsCalculatorService calculator;

    @Test
    void upgradesTheSelectedAlornByReturningLingOnlyWhenTheAccuracyLossIsAllowed()
            throws Exception {
        var request =
                mapper.readValue(
                        getClass()
                                .getResourceAsStream(
                                        "/optimization/reorganization-alorn-upgrade.json"),
                        OptimizationRequest.class);
        var protection = new ReorganizationOptions.Protection();
        protection.setLoss(5);
        request.getReorganization()
                .setProtectedModifiers(Map.of(DRIF_BONUS_TYPE.HIT_CHANCE_RANGED, protection));
        var result = optimizer.optimize(request);
        assertEquals(
                OptimizationOutcome.VALID_BUILD,
                result.getSummary().getOutcome(),
                result.getSummary().getMessage());
        var boots = result.getOptimizedSetup().getSlots().get("boots");
        assertEquals(52L, boots.getDrifIds().get(1));
        assertEquals(11, boots.getDrifLevels().get("1"));
        assertEquals(2, boots.getDrifIds().size());
        assertFalse(
                result.getReorganizationDrifUsages().stream()
                        .anyMatch(
                                usage ->
                                        "boots".equals(usage.sourceSlotKey())
                                                && usage.sourceDrifIndex() == 2));
        assertTrue(
                result.getReorganizationDrifUsages().stream()
                        .allMatch(
                                usage ->
                                        usage.slotKey().equals(usage.sourceSlotKey())
                                                && usage.drifIndex() == usage.sourceDrifIndex()));
        assertEquals(
                calculator.calculateWithSources(result.getOptimizedSetup()),
                result.getCalculationResult());
        assertEquals("106.73%", result.getCalculationResult().stats().get("HIT_CHANCE_RANGED"));
        assertEquals("42.75%", result.getCalculationResult().stats().get("DAMAGE_REDUCTION"));
        assertEquals(6, request.getOriginalSlots().get("boots").getDrifLevels().get("1"));

        request.getReorganization().setProtectedModifiers(Map.of());
        var protectedResult = optimizer.optimize(request);
        if (protectedResult.getOptimizedSetup() != null
                && protectedResult.getOptimizedSetup().getSlots() != null
                && !protectedResult.getOptimizedSetup().getSlots().isEmpty()) {
            double accuracy =
                    Double.parseDouble(
                            protectedResult
                                    .getCalculationResult()
                                    .stats()
                                    .get("HIT_CHANCE_RANGED")
                                    .replace("%", ""));
            assertTrue(accuracy >= 111.66);
        } else {
            assertEquals(
                    OptimizationOutcome.NO_BUILD_FOUND, protectedResult.getSummary().getOutcome());
            assertFalse(protectedResult.getSummary().getSearchReport().proofComplete());
        }
    }
}
