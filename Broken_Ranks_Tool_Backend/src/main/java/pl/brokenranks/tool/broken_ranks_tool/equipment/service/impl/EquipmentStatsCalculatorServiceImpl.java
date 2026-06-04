package pl.brokenranks.tool.broken_ranks_tool.equipment.service.impl;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import pl.brokenranks.tool.broken_ranks_tool.equipment.dto.EquipmentRequest;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.ItemTemplate;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.EquipmentStatsCalculatorService;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.calculator.CalculationState;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.processor.DrifStatProcessor;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.processor.ItemStatProcessor;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.processor.OrbStatProcessor;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.provider.EquipmentDataProvider;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.provider.EquipmentDataProvider.CalculationContext;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.validator.EquipmentValidator;

import java.util.Collections;
import java.util.Map;

@Service
@RequiredArgsConstructor
class EquipmentStatsCalculatorServiceImpl implements EquipmentStatsCalculatorService {

    private final EquipmentDataProvider dataProvider;
    private final EquipmentValidator validator;
    private final ItemStatProcessor itemProcessor;
    private final OrbStatProcessor orbProcessor;
    private final DrifStatProcessor drifProcessor;

    public Map<String, String> calculateTotalStats(EquipmentRequest request) {
        if (request.getSlots() == null || request.getSlots().isEmpty()) {
            return Collections.emptyMap();
        }

        CalculationContext ctx = dataProvider.buildContext(request.getSlots().values());
        CalculationState state = new CalculationState(ctx);

        if (request.getCharacterStats() != null) {
            request.getCharacterStats().forEach((stat, val) ->
                    state.getAccumulator().addFlatValue(stat, val.doubleValue()));
        }

        state.getDrifCounts().putAll(drifProcessor.preCountDrifs(request, ctx));

        request.getSlots().forEach((slotKey, slotData) -> {
            if (slotData.getItemId() == null || !ctx.items().containsKey(slotData.getItemId())) return;
            ItemTemplate item = ctx.items().get(slotData.getItemId());
            if (!validator.isValidItem(item, slotKey)) return;

            int starLevel = (slotData.getItemStars() != null) ? slotData.getItemStars() : 1;
            double finalDrifMod = itemProcessor.calculateFinalDrifMod(item, starLevel);

            itemProcessor.process(item, starLevel, state);
            orbProcessor.process(slotKey, slotData, starLevel, state);
            drifProcessor.process(slotKey, slotData, item, finalDrifMod, state);
        });

        return state.getAccumulator().getFormattedResults();
    }
}