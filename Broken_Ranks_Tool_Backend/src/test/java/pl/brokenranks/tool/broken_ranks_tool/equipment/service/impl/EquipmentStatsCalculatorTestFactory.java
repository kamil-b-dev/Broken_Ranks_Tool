package pl.brokenranks.tool.broken_ranks_tool.equipment.service.impl;

import pl.brokenranks.tool.broken_ranks_tool.equipment.service.EquipmentStatsCalculatorService;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.calculator.CalculationMetadataFactory;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.calculator.DrifCounter;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.calculator.input.EquipmentDataProvider;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.calculator.input.SlotDrifSelectionFactory;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.calculator.processor.DrifStatProcessor;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.calculator.processor.ItemStatProcessor;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.calculator.processor.OrbStatProcessor;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.validator.DrifSecurityValidator;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.validator.EquipmentPlacementRules;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.validator.EquipmentRequestValidator;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.validator.UpgradeLevelPolicy;

/** Creates the package-private calculator implementation for cross-package integration tests. */
public final class EquipmentStatsCalculatorTestFactory {
    private EquipmentStatsCalculatorTestFactory() {}

    public static EquipmentStatsCalculatorService create(
            EquipmentDataProvider dataProvider,
            EquipmentRequestValidator requestValidator,
            EquipmentPlacementRules placementRules,
            UpgradeLevelPolicy levelPolicy,
            DrifSecurityValidator securityValidator,
            ItemStatProcessor itemProcessor,
            OrbStatProcessor orbProcessor,
            DrifStatProcessor drifProcessor,
            DrifCounter drifCounter,
            CalculationMetadataFactory metadataFactory,
            SlotDrifSelectionFactory drifSelectionFactory) {
        return new EquipmentStatsCalculatorServiceImpl(
                dataProvider,
                requestValidator,
                placementRules,
                levelPolicy,
                securityValidator,
                itemProcessor,
                orbProcessor,
                drifProcessor,
                drifCounter,
                metadataFactory,
                drifSelectionFactory);
    }
}
