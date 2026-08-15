package pl.brokenranks.tool.broken_ranks_tool.equipment.service.impl;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_BONUS_TYPE;
import pl.brokenranks.tool.broken_ranks_tool.equipment.dto.EquipmentRequest;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.DrifTemplate;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.ItemTemplate;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.EquipmentStatsCalculatorService;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.calculator.CalculationState;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.calculator.processor.DrifStatProcessor;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.calculator.processor.ItemStatProcessor;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.calculator.processor.OrbStatProcessor;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.provider.EquipmentDataProvider;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.provider.EquipmentDataProvider.CalculationContext;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.validator.EquipmentValidator;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;

/** Orchestrates validation, data preparation, and equipment statistic processors. */
@Service
@RequiredArgsConstructor
class EquipmentStatsCalculatorServiceImpl implements EquipmentStatsCalculatorService {

    private final EquipmentDataProvider dataProvider;
    private final EquipmentValidator validator;
    private final ItemStatProcessor itemProcessor;
    private final OrbStatProcessor orbProcessor;
    private final DrifStatProcessor drifProcessor;

    @Override
    public Map<String, String> calculateTotalStats(EquipmentRequest request) {
        if (request.getSlots() == null || request.getSlots().isEmpty()) {
            return Collections.emptyMap();
        }

        validator.validateCharacterStats(request.getCharacterStats());

        CalculationContext ctx = dataProvider.buildContext(request.getSlots().values());
        CalculationState state = new CalculationState(ctx);

        initializeDefaultStats(state);
        applyCharacterStats(state, request.getCharacterStats());

        state.getDrifCounts().putAll(drifProcessor.preCountDrifs(request, ctx));

        processSlots(request, ctx, state);

        return state.getAccumulator().getFormattedResults();
    }

    private void initializeDefaultStats(CalculationState state) {
        state.getAccumulator().addRawValue(DRIF_BONUS_TYPE.CRITICAL_CHANCE.name(), "2%", 1.0);
        state.getAccumulator().addRawValue(DRIF_BONUS_TYPE.MANA_REGEN.name(), "5%", 1.0);
        state.getAccumulator().addRawValue(DRIF_BONUS_TYPE.STAMINA_REGEN.name(), "5%", 1.0);
    }

    private void applyCharacterStats(CalculationState state, Map<String, Integer> characterStats) {
        if (characterStats != null) {
            characterStats.forEach((stat, val) ->
                    state.getAccumulator().addFlatValue(stat, val.doubleValue()));
        }
    }

    private void processSlots(EquipmentRequest request, CalculationContext ctx, CalculationState state) {
        request.getSlots().forEach((slotKey, slotData) -> processSlot(slotKey, slotData, ctx, state));
    }

    private void processSlot(String slotKey, EquipmentRequest.SlotData slotData, CalculationContext ctx, CalculationState state) {
        if (slotData.getItemId() == null || !ctx.items().containsKey(slotData.getItemId())) {
            return;
        }
        ItemTemplate item = ctx.items().get(slotData.getItemId());
        if (!validator.isValidItem(item, slotKey)) {
            return;
        }

        int starLevel = (slotData.getItemStars() != null) ? slotData.getItemStars() : 1;

        List<DrifTemplate> drifsForSlot = new ArrayList<>();
        List<Integer> levelsForSlot = new ArrayList<>();
        prepareDrifsForSlot(slotData, ctx, drifsForSlot, levelsForSlot);

        validator.validateDrifsSecurity(slotKey, item, starLevel, drifsForSlot, levelsForSlot);

        double finalDrifMod = itemProcessor.calculateFinalDrifMod(item, starLevel);

        itemProcessor.process(item, starLevel, state);
        orbProcessor.process(slotKey, slotData, item, starLevel, state);
        drifProcessor.process(slotKey, slotData, item, finalDrifMod, state);
    }

    private void prepareDrifsForSlot(EquipmentRequest.SlotData slotData, CalculationContext ctx, List<DrifTemplate> drifsForSlot, List<Integer> levelsForSlot) {
        if (slotData.getDrifIds() == null) {
            return;
        }

        for (int i = 0; i < slotData.getDrifIds().size(); i++) {
            Long drifId = slotData.getDrifIds().get(i);
            if (drifId != null && ctx.drifs().containsKey(drifId)) {
                drifsForSlot.add(ctx.drifs().get(drifId));

                int lvl = 1;
                if (slotData.getDrifLevels() != null) {
                    Integer levelObj = slotData.getDrifLevels().get(String.valueOf(i));
                    if (levelObj != null) {
                        lvl = levelObj;
                    }
                }
                levelsForSlot.add(lvl);
            }
        }
    }
}
