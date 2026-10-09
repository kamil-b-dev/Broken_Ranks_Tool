package pl.brokenranks.tool.broken_ranks_tool.equipment.service.impl;

import java.util.Collection;
import java.util.Map;
import java.util.function.Function;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_BONUS_TYPE;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.STAT_TYPE;
import pl.brokenranks.tool.broken_ranks_tool.equipment.dto.CalculationResultDto;
import pl.brokenranks.tool.broken_ranks_tool.equipment.dto.EquipmentRequest;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.DrifTemplate;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.ItemTemplate;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.OrbTemplate;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.EquipmentStatsCalculatorService;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.calculator.CalculationMetadataFactory;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.calculator.CalculationMetadataFactory.CalculationMetadata;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.calculator.CalculationState;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.calculator.DrifCounter;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.calculator.input.EquipmentDataProvider;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.calculator.input.EquipmentDataProvider.CalculationContext;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.calculator.input.SlotDrifSelectionFactory;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.calculator.input.SlotDrifSelectionFactory.SlotDrifSelection;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.calculator.processor.DrifStatProcessor;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.calculator.processor.ItemStatProcessor;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.calculator.processor.OrbStatProcessor;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.validator.DrifSecurityValidator;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.validator.EquipmentPlacementRules;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.validator.EquipmentRequestValidator;

/** Orchestrates validation, data preparation, and equipment statistic processors. */
@Service
@RequiredArgsConstructor
class EquipmentStatsCalculatorServiceImpl implements EquipmentStatsCalculatorService {

    private final EquipmentDataProvider dataProvider;
    private final EquipmentRequestValidator requestValidator;
    private final EquipmentPlacementRules placementRules;
    private final DrifSecurityValidator securityValidator;
    private final ItemStatProcessor itemProcessor;
    private final OrbStatProcessor orbProcessor;
    private final DrifStatProcessor drifProcessor;
    private final DrifCounter drifCounter;
    private final CalculationMetadataFactory metadataFactory;
    private final SlotDrifSelectionFactory drifSelectionFactory;

    @Override
    public Map<String, String> calculateTotalStats(EquipmentRequest request) {
        return calculateWithSources(request).stats();
    }

    @Override
    public CalculationResultDto calculateWithSources(EquipmentRequest request) {
        return calculateWithSources(request, null);
    }

    @Override
    public Function<EquipmentRequest, Map<String, String>> prepareCalculation(
            Map<Long, ItemTemplate> items,
            Map<Long, DrifTemplate> drifs,
            Collection<EquipmentRequest.SlotData> slots) {
        var prepared = prepareCalculationWithSources(items, dataProvider.loadOrbs(slots), drifs);
        return request -> prepared.apply(request).stats();
    }

    @Override
    public Function<EquipmentRequest, CalculationResultDto> prepareCalculationWithSources(
            Map<Long, ItemTemplate> items,
            Map<Long, OrbTemplate> orbs,
            Map<Long, DrifTemplate> drifs) {
        CalculationContext context = new CalculationContext(items, orbs, drifs);
        return request -> calculateWithSources(request, context);
    }

    private CalculationResultDto calculateWithSources(
            EquipmentRequest request, CalculationContext preparedContext) {
        requestValidator.validateRequest(request);
        requestValidator.validateCharacterStats(request.getCharacterStats());
        CalculationContext ctx =
                preparedContext != null
                        ? preparedContext
                        : request.getSlots().isEmpty()
                                ? new CalculationContext(Map.of(), Map.of(), Map.of())
                                : dataProvider.buildContext(request.getSlots().values());
        CalculationState state = new CalculationState(ctx);

        initializeDefaultStats(state);
        applyCharacterStats(state, request.getCharacterStats());

        state.getDrifCounts().putAll(drifCounter.count(request, ctx));

        processSlots(request, ctx, state);

        CalculationMetadata metadata = metadataFactory.create(ctx, request.getSlots().values());
        return new CalculationResultDto(
                state.getAccumulator().getFormattedResults(),
                metadata.drifCategories(),
                metadata.orbBonusTypes());
    }

    private void initializeDefaultStats(CalculationState state) {
        state.getAccumulator().addRawValue(DRIF_BONUS_TYPE.CRITICAL_CHANCE.name(), "2%", 1.0);
        state.getAccumulator().addRawValue(DRIF_BONUS_TYPE.MANA_REGEN.name(), "5%", 1.0);
        state.getAccumulator().addRawValue(DRIF_BONUS_TYPE.STAMINA_REGEN.name(), "5%", 1.0);
    }

    private void applyCharacterStats(CalculationState state, Map<String, Integer> characterStats) {
        if (characterStats != null) {
            characterStats.forEach(
                    (stat, val) ->
                            state.getAccumulator()
                                    .addFlatValue(
                                            STAT_TYPE
                                                    .fromDescription(stat)
                                                    .orElseThrow()
                                                    .getDescription(),
                                            val.doubleValue()));
        }
    }

    private void processSlots(
            EquipmentRequest request, CalculationContext ctx, CalculationState state) {
        request.getSlots()
                .forEach((slotKey, slotData) -> processSlot(slotKey, slotData, ctx, state));
    }

    private void processSlot(
            String slotKey,
            EquipmentRequest.SlotData slotData,
            CalculationContext ctx,
            CalculationState state) {
        if (slotData.getItemId() == null) return;
        if (!ctx.items().containsKey(slotData.getItemId()))
            throw new IllegalArgumentException(
                    "Nie znaleziono przedmiotu o ID " + slotData.getItemId() + ".");
        ItemTemplate item = ctx.items().get(slotData.getItemId());
        if (!placementRules.isValidItem(item, slotKey)) {
            throw new IllegalArgumentException("Przedmiot nie pasuje do slotu " + slotKey + ".");
        }

        int requestedStarLevel = slotData.getItemStars() != null ? slotData.getItemStars() : 1;
        if (requestedStarLevel < 1 || requestedStarLevel > 9) {
            throw new IllegalArgumentException("Liczba gwiazdek musi mieścić się w zakresie 1–9.");
        }
        int starLevel = requestedStarLevel;
        validateDrifPositions(slotKey, slotData, item, starLevel);

        SlotDrifSelection drifSelection = drifSelectionFactory.create(slotData, ctx);

        securityValidator.validate(
                slotKey, item, starLevel, drifSelection.drifs(), drifSelection.levels());

        double finalDrifMod = itemProcessor.calculateFinalDrifMod(item, starLevel);

        itemProcessor.process(item, starLevel, state);
        orbProcessor.process(slotKey, slotData, item, starLevel, state);
        drifProcessor.process(slotKey, slotData, item, finalDrifMod, state);
    }

    private void validateDrifPositions(
            String slotKey, EquipmentRequest.SlotData slotData, ItemTemplate item, int starLevel) {
        if (slotData.getDrifIds() == null) return;
        if (item.getRarity()
                        == pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.RARITY.EPIC
                || item.getRarity()
                        == pl.brokenranks
                                .tool
                                .broken_ranks_tool
                                .equipment
                                .domain
                                .enums
                                .RARITY
                                .SET) {
            if (slotData.getDrifIds().stream().anyMatch(java.util.Objects::isNull)) {
                throw new IllegalArgumentException(
                        "Konfiguracja wbudowanych drifów nie może zawierać pustych pozycji.");
            }
            return;
        }
        int maxDrifs = placementRules.maxDrifs(item, starLevel);
        for (int index = maxDrifs; index < slotData.getDrifIds().size(); index++) {
            if (slotData.getDrifIds().get(index) != null) {
                throw new IllegalArgumentException(
                        "Drif w slocie " + slotKey + " znajduje się poza dostępnymi gniazdami.");
            }
        }
    }
}
