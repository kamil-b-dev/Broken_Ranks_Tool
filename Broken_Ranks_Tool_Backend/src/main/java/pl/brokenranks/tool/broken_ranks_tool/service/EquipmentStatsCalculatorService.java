package pl.brokenranks.tool.broken_ranks_tool.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import pl.brokenranks.tool.broken_ranks_tool.dto.EquipmentRequest;
import pl.brokenranks.tool.broken_ranks_tool.dto.EquipmentRequest.SlotData;
import pl.brokenranks.tool.broken_ranks_tool.entity.enums.ITEM_STAR;
import pl.brokenranks.tool.broken_ranks_tool.entity.templates.*;
import pl.brokenranks.tool.broken_ranks_tool.service.calculator.StatsAccumulator;
import pl.brokenranks.tool.broken_ranks_tool.service.provider.EquipmentDataProvider;
import pl.brokenranks.tool.broken_ranks_tool.service.provider.EquipmentDataProvider.CalculationContext;
import pl.brokenranks.tool.broken_ranks_tool.service.validator.EquipmentValidator;

import java.util.*;

@Service
@RequiredArgsConstructor
public class EquipmentStatsCalculatorService {

    private final EquipmentDataProvider dataProvider; // Zamiast 3 repozytoriów mamy 1 dostawcę
    private final EquipmentValidator validator;

    public Map<String, String> calculateTotalStats(EquipmentRequest request) {
        if (request.getSlots() == null || request.getSlots().isEmpty()) {
            return Collections.emptyMap();
        }

        CalculationContext ctx = dataProvider.buildContext(request.getSlots().values());
        StatsAccumulator acc = new StatsAccumulator();

        if (request.getCharacterStats() != null) {
            request.getCharacterStats().forEach((stat, val) -> acc.addFlatValue(stat, val.doubleValue()));
        }

        request.getSlots().forEach((slotKey, slotData) -> processSlot(slotKey, slotData, ctx, acc));

        return acc.getFormattedResults();
    }

    private void processSlot(String slotKey, SlotData slot, CalculationContext ctx, StatsAccumulator acc) {
        int starLevel = (slot.getItemStars() != null) ? slot.getItemStars() : 1;
        ITEM_STAR starMod = ITEM_STAR.fromLevel(starLevel);

        processItem(slotKey, slot, starMod.getStatsMod(), ctx, acc);
        processOrb(slotKey, slot, starMod.getOrbMod(), ctx, acc);
        processDrifs(slotKey, slot, starMod.getDrifMod(), ctx, acc);
    }

    private void processItem(String slotKey, SlotData slot, double statMod, CalculationContext ctx, StatsAccumulator acc) {
        if (slot.getItemId() == null || !ctx.items().containsKey(slot.getItemId())) return;
        ItemTemplate item = ctx.items().get(slot.getItemId());

        if (!validator.isValidItem(item, slotKey) || item.getStats() == null || item.getStats().isEmpty()) return;

        if (statMod == 0.0) {
            item.getStats().forEach((stat, val) -> acc.addFlatValue(stat, ((Number) val).doubleValue()));
            return;
        }

        Map<String, Integer> baseStats = new HashMap<>();
        Map<String, Integer> baseResists = new HashMap<>();

        item.getStats().forEach((k, v) -> {
            if (k.toLowerCase().contains("odp")) baseResists.put(k, ((Number) v).intValue());
            else baseStats.put(k, ((Number) v).intValue());
        });

        acc.distributeRandomly(baseStats, statMod);
        acc.distributeRandomly(baseResists, statMod);
    }

    private void processOrb(String slotKey, SlotData slot, double orbMod, CalculationContext ctx, StatsAccumulator acc) {
        if (slot.getOrbId() == null || !ctx.orbs().containsKey(slot.getOrbId())) return;
        OrbTemplate orb = ctx.orbs().get(slot.getOrbId());

        if (!validator.isValidOrb(orb, slotKey)) return;

        int finalLvl = validator.sanitizeOrbLevel((slot.getOrbLevel() != null) ? slot.getOrbLevel() : 1, orb);

        String bonusStr = switch (finalLvl) {
            case 1 -> orb.getBonusLvl1();
            case 2 -> orb.getBonusLvl2();
            case 3 -> orb.getBonusLvl3();
            default -> "0";
        };

        acc.addRawValue(orb.getBonusType().name(), bonusStr, 1.0 + orbMod);
    }

    private void processDrifs(String slotKey, SlotData slot, double drifMod, CalculationContext ctx, StatsAccumulator acc) {
        if (slot.getDrifIds() == null) return;

        for (int i = 0; i < slot.getDrifIds().size(); i++) {
            Long drifId = slot.getDrifIds().get(i);
            if (drifId == null || !ctx.drifs().containsKey(drifId)) continue;
            DrifTemplate drif = ctx.drifs().get(drifId);

            if (!validator.isValidDrif(drif, slotKey)) continue;

            int requestedLvl = (slot.getDrifLevels() != null && slot.getDrifLevels().containsKey(String.valueOf(i)))
                    ? slot.getDrifLevels().get(String.valueOf(i)) : 1;

            int finalLvl = validator.sanitizeDrifLevel(requestedLvl, drif);

            acc.addRawValue(drif.getBonusType().name(), drif.getBaseValue(), (double) finalLvl * (1.0 + drifMod));
        }
    }
}