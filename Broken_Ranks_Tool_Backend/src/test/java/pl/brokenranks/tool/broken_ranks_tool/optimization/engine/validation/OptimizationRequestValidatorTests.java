package pl.brokenranks.tool.broken_ranks_tool.optimization.engine.validation;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;

import java.util.HashMap;
import java.util.Map;
import java.util.Set;
import org.junit.jupiter.api.Test;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_BONUS_TYPE;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_SIZE;
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.BuildConfigurationMode;
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.OptimizationRequest;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.rules.OptimizationRequestConstraints;

class OptimizationRequestValidatorTests {

    @Test
    void usesFivePercentVariantLossWhenOlderRequestOmitsSetting() {
        OptimizationRequest request = new OptimizationRequest();

        assertEquals(0.05, OptimizationRequestConstraints.maxVariantRelativeLoss(request));
        assertNull(OptimizationRequestValidator.validateSettings(request));
    }

    @Test
    void convertsConfiguredVariantLossFromPercentToRatio() {
        OptimizationRequest request = new OptimizationRequest();
        request.setMaxVariantLossPercent(17);

        assertEquals(0.17, OptimizationRequestConstraints.maxVariantRelativeLoss(request));
    }

    @Test
    void rejectsVariantLossOutsideSupportedRange() {
        OptimizationRequest request = new OptimizationRequest();
        request.setMaxVariantLossPercent(101);

        assertNotNull(OptimizationRequestValidator.validateSettings(request));
    }

    @Test
    void rejectsPercentageTargetCombinedWithMaximization() {
        OptimizationRequest request = new OptimizationRequest();
        request.setForcedPercentageTargets(Map.of(DRIF_BONUS_TYPE.CRITICAL_CHANCE, 25.0));
        request.setMaximizeBonuses(Set.of(DRIF_BONUS_TYPE.CRITICAL_CHANCE));

        assertNotNull(OptimizationRequestValidator.validateSettings(request));
    }

    @Test
    void acceptsInclusiveQuantityAndVariantLossBoundaries() {
        OptimizationRequest request = new OptimizationRequest();
        request.setMaxVariantLossPercent(100);
        request.setTargetQuantities(
                Map.of(
                        DRIF_BONUS_TYPE.CRITICAL_CHANCE,
                        new OptimizationRequest.QuantityRange(0, 12)));

        assertNull(OptimizationRequestValidator.validateSettings(request));
    }

    @Test
    void validatesAdvancedSizeRangesAgainstTotalQuantity() {
        OptimizationRequest request = new OptimizationRequest();
        request.setPriorities(Map.of(DRIF_BONUS_TYPE.CRITICAL_CHANCE, 15));
        request.setTargetQuantities(
                Map.of(
                        DRIF_BONUS_TYPE.CRITICAL_CHANCE,
                        new OptimizationRequest.QuantityRange(2, 3)));
        request.setDrifSizeQuantities(
                Map.of(
                        DRIF_BONUS_TYPE.CRITICAL_CHANCE,
                        Map.of(DRIF_SIZE.SUBDRIF, new OptimizationRequest.QuantityRange(1, 2))));

        assertNull(OptimizationRequestValidator.validateSettings(request));
        request.setDrifSizeQuantities(
                Map.of(
                        DRIF_BONUS_TYPE.CRITICAL_CHANCE,
                        Map.of(DRIF_SIZE.SUBDRIF, new OptimizationRequest.QuantityRange(4, 4))));
        assertNotNull(OptimizationRequestValidator.validateSettings(request));
    }

    @Test
    void simpleModeRejectsAdvancedControls() {
        OptimizationRequest request = new OptimizationRequest();
        request.setConfigurationMode(BuildConfigurationMode.SIMPLE);
        request.setPriorities(Map.of(DRIF_BONUS_TYPE.CRITICAL_CHANCE, 15));
        request.setTargetQuantities(
                Map.of(
                        DRIF_BONUS_TYPE.CRITICAL_CHANCE,
                        new OptimizationRequest.QuantityRange(0, 12)));
        request.setDrifSizeQuantities(Map.of());
        assertNull(OptimizationRequestValidator.validateSettings(request));

        request.setMaximizeBonuses(Set.of(DRIF_BONUS_TYPE.CRITICAL_CHANCE));
        assertNotNull(OptimizationRequestValidator.validateSettings(request));
    }

    @Test
    void simpleModeRejectsNonAutomaticWeightsAndQuantities() {
        OptimizationRequest request = new OptimizationRequest();
        request.setConfigurationMode(BuildConfigurationMode.SIMPLE);
        request.setPriorities(Map.of(DRIF_BONUS_TYPE.CRITICAL_CHANCE, 14));
        request.setTargetQuantities(
                Map.of(
                        DRIF_BONUS_TYPE.CRITICAL_CHANCE,
                        new OptimizationRequest.QuantityRange(0, 12)));
        assertNotNull(OptimizationRequestValidator.validateSettings(request));

        request.setPriorities(Map.of(DRIF_BONUS_TYPE.CRITICAL_CHANCE, 15));
        request.setTargetQuantities(
                Map.of(
                        DRIF_BONUS_TYPE.CRITICAL_CHANCE,
                        new OptimizationRequest.QuantityRange(1, 12)));
        assertNotNull(OptimizationRequestValidator.validateSettings(request));
    }

    @Test
    void rejectsMalformedPerSizeRanges() {
        for (OptimizationRequest.QuantityRange range :
                new OptimizationRequest.QuantityRange[] {
                    null,
                    new OptimizationRequest.QuantityRange(-1, 1),
                    new OptimizationRequest.QuantityRange(0, 13),
                    new OptimizationRequest.QuantityRange(2, 1)
                }) {
            OptimizationRequest request = new OptimizationRequest();
            request.setPriorities(Map.of(DRIF_BONUS_TYPE.CRITICAL_CHANCE, 15));
            Map<DRIF_SIZE, OptimizationRequest.QuantityRange> sizes = new HashMap<>();
            sizes.put(DRIF_SIZE.SUBDRIF, range);
            request.setDrifSizeQuantities(Map.of(DRIF_BONUS_TYPE.CRITICAL_CHANCE, sizes));

            assertNotNull(OptimizationRequestValidator.validateSettings(request));
        }
    }

    @Test
    void rejectsEveryInvalidQuantityRangeShape() {
        for (OptimizationRequest.QuantityRange range :
                new OptimizationRequest.QuantityRange[] {
                    null,
                    new OptimizationRequest.QuantityRange(-1, 1),
                    new OptimizationRequest.QuantityRange(0, 13),
                    new OptimizationRequest.QuantityRange(2, 1)
                }) {
            OptimizationRequest request = new OptimizationRequest();
            Map<DRIF_BONUS_TYPE, OptimizationRequest.QuantityRange> quantities = new HashMap<>();
            quantities.put(DRIF_BONUS_TYPE.CRITICAL_CHANCE, range);
            request.setTargetQuantities(quantities);

            assertNotNull(OptimizationRequestValidator.validateSettings(request));
        }
    }

    @Test
    void rejectsNegativeVariantLossBoundary() {
        OptimizationRequest request = new OptimizationRequest();
        request.setMaxVariantLossPercent(-1);

        assertNotNull(OptimizationRequestValidator.validateSettings(request));
    }

    @Test
    void rejectsInvalidPercentageTargetsAndConflictWithCap() {
        for (Double target : new Double[] {null, -0.01, Double.NaN, Double.POSITIVE_INFINITY}) {
            OptimizationRequest request = new OptimizationRequest();
            Map<DRIF_BONUS_TYPE, Double> targets = new HashMap<>();
            targets.put(DRIF_BONUS_TYPE.CRITICAL_CHANCE, target);
            request.setForcedPercentageTargets(targets);

            assertNotNull(OptimizationRequestValidator.validateSettings(request));
        }

        OptimizationRequest conflicting = new OptimizationRequest();
        conflicting.setForcedPercentageTargets(Map.of(DRIF_BONUS_TYPE.CRITICAL_CHANCE, 0.0));
        conflicting.setForceCapBonuses(Set.of(DRIF_BONUS_TYPE.CRITICAL_CHANCE));
        assertNotNull(OptimizationRequestValidator.validateSettings(conflicting));
    }

    @Test
    void validatesRequiredTopLevelRequestFields() {
        assertNotNull(OptimizationRequestValidator.validate(null));

        OptimizationRequest request = new OptimizationRequest();
        request.setOriginalSlots(Map.of());
        assertNotNull(OptimizationRequestValidator.validate(request));

        request.setOriginalSlots(
                Map.of(
                        "helmet",
                        new pl.brokenranks.tool.broken_ranks_tool.equipment.dto.EquipmentRequest
                                .SlotData()));
        assertNotNull(OptimizationRequestValidator.validate(request));
    }

    @Test
    void rejectsPriorityOutsideServiceContract() {
        OptimizationRequest request = new OptimizationRequest();
        request.setOriginalSlots(
                Map.of(
                        "helmet",
                        new pl.brokenranks.tool.broken_ranks_tool.equipment.dto.EquipmentRequest
                                .SlotData()));
        request.setPriorities(Map.of(DRIF_BONUS_TYPE.CRITICAL_CHANCE, 31));

        assertNotNull(OptimizationRequestValidator.validate(request));
    }

    @Test
    void rejectsSettingsForTypesThatAreNotPriorities() {
        OptimizationRequest request = new OptimizationRequest();
        request.setPriorities(Map.of(DRIF_BONUS_TYPE.CRITICAL_CHANCE, 10));
        request.setTargetQuantities(
                Map.of(DRIF_BONUS_TYPE.DAMAGE_MAGIC, new OptimizationRequest.QuantityRange(1, 2)));

        assertNotNull(OptimizationRequestValidator.validateSettings(request));
    }

    @Test
    void rejectsCapForTypeWithoutCapAndCapCombinedWithMaximization() {
        OptimizationRequest withoutCap = new OptimizationRequest();
        withoutCap.setPriorities(Map.of(DRIF_BONUS_TYPE.DAMAGE_MAGIC, 10));
        withoutCap.setForceCapBonuses(Set.of(DRIF_BONUS_TYPE.DAMAGE_MAGIC));
        assertNotNull(OptimizationRequestValidator.validateSettings(withoutCap));

        OptimizationRequest conflicting = new OptimizationRequest();
        conflicting.setPriorities(Map.of(DRIF_BONUS_TYPE.CRITICAL_CHANCE, 10));
        conflicting.setForceCapBonuses(Set.of(DRIF_BONUS_TYPE.CRITICAL_CHANCE));
        conflicting.setMaximizeBonuses(Set.of(DRIF_BONUS_TYPE.CRITICAL_CHANCE));
        assertNotNull(OptimizationRequestValidator.validateSettings(conflicting));
    }

    @Test
    void rejectsUnknownAndNullCharacterStats() {
        OptimizationRequest unknown = new OptimizationRequest();
        unknown.setCharacterStats(Map.of("NOT_A_STAT", 1));
        assertNotNull(OptimizationRequestValidator.validateSettings(unknown));

        OptimizationRequest nullValue = new OptimizationRequest();
        Map<String, Integer> stats = new HashMap<>();
        stats.put("STRENGTH", null);
        nullValue.setCharacterStats(stats);
        assertNotNull(OptimizationRequestValidator.validateSettings(nullValue));
    }

    @Test
    void acceptsCharacterStatBoundariesAndRejectsValuesOutsideThem() {
        OptimizationRequest boundaries = new OptimizationRequest();
        boundaries.setCharacterStats(Map.of("Siła", 0, "Moc", 50_000));
        assertNull(OptimizationRequestValidator.validateSettings(boundaries));

        OptimizationRequest negative = new OptimizationRequest();
        negative.setCharacterStats(Map.of("Siła", -1));
        assertNotNull(OptimizationRequestValidator.validateSettings(negative));

        OptimizationRequest excessive = new OptimizationRequest();
        excessive.setCharacterStats(Map.of("Siła", 50_001));
        assertNotNull(OptimizationRequestValidator.validateSettings(excessive));
    }
}
