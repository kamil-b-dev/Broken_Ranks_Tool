package pl.brokenranks.tool.broken_ranks_tool.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import pl.brokenranks.tool.broken_ranks_tool.dto.EquipmentRequest;
import pl.brokenranks.tool.broken_ranks_tool.dto.EquipmentRequest.SlotData;
import pl.brokenranks.tool.broken_ranks_tool.entity.enums.DRIF_BONUS_TYPE;
import pl.brokenranks.tool.broken_ranks_tool.entity.enums.ITEM_STAR;
import pl.brokenranks.tool.broken_ranks_tool.entity.enums.ORB_BONUS_TYPE;
import pl.brokenranks.tool.broken_ranks_tool.entity.templates.*;
import pl.brokenranks.tool.broken_ranks_tool.service.calculator.StatsAccumulator;
import pl.brokenranks.tool.broken_ranks_tool.service.provider.EquipmentDataProvider;
import pl.brokenranks.tool.broken_ranks_tool.service.provider.EquipmentDataProvider.CalculationContext;
import pl.brokenranks.tool.broken_ranks_tool.service.rules.EquipmentRulesRegistry;
import pl.brokenranks.tool.broken_ranks_tool.service.validator.EquipmentValidator;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.*;

@Service
@RequiredArgsConstructor
public class EquipmentStatsCalculatorService {

    private final EquipmentDataProvider dataProvider;
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

        Set<ORB_BONUS_TYPE> usedOrbs = new HashSet<>();
        Map<DRIF_BONUS_TYPE, Integer> drifCounts = preCountDrifs(request, ctx);

        request.getSlots().forEach((slotKey, slotData) ->
                processSlot(slotKey, slotData, ctx, acc, usedOrbs, drifCounts)
        );

        return acc.getFormattedResults();
    }

    private Map<DRIF_BONUS_TYPE, Integer> preCountDrifs(EquipmentRequest request, CalculationContext ctx) {
        Map<DRIF_BONUS_TYPE, Integer> counts = new HashMap<>();
        boolean elementalDamageAlreadyAssigned = false;

        for (Map.Entry<String, SlotData> entry : request.getSlots().entrySet()) {
            String slotKey = entry.getKey();
            SlotData slot = entry.getValue();

            if (slot.getItemId() == null || !ctx.items().containsKey(slot.getItemId())) continue;
            ItemTemplate item = ctx.items().get(slot.getItemId());
            if (!validator.isValidItem(item, slotKey)) continue;
            if (slot.getDrifIds() == null) continue;

            Set<DRIF_BONUS_TYPE> itemUniqueDrifs = new HashSet<>();
            for (Long drifId : slot.getDrifIds()) {
                if (drifId == null || !ctx.drifs().containsKey(drifId)) continue;
                DrifTemplate drif = ctx.drifs().get(drifId);

                if (!validator.isValidDrif(drif, slotKey)) continue;
                if (!validator.isElementalDrifPositionValid(drif, slotKey)) continue;

                if (validator.isElementalDamage(drif.getBonusType())) {
                    if (elementalDamageAlreadyAssigned) {
                        continue;
                    }
                    elementalDamageAlreadyAssigned = true;
                }

                if (!validator.isValidDrifSizeForTier(drif, item)) continue;
                if (itemUniqueDrifs.contains(drif.getBonusType())) continue;

                itemUniqueDrifs.add(drif.getBonusType());
                counts.merge(drif.getBonusType(), 1, Integer::sum);
            }
        }
        return counts;
    }

    private void processSlot(String slotKey, SlotData slot, CalculationContext ctx, StatsAccumulator acc,
                             Set<ORB_BONUS_TYPE> usedOrbs, Map<DRIF_BONUS_TYPE, Integer> drifCounts) {

        if (slot.getItemId() == null || !ctx.items().containsKey(slot.getItemId())) return;
        ItemTemplate item = ctx.items().get(slot.getItemId());
        if (!validator.isValidItem(item, slotKey)) return;

        int starLevel = (slot.getItemStars() != null) ? slot.getItemStars() : 1;
        ITEM_STAR starMod = ITEM_STAR.fromLevel(starLevel);

        double baseStarDrifMod = starMod.getDrifMod();

        double itemDatabaseDrifBonus = 0.0;
        if (item.getStats() != null && item.getStats().containsKey("Bonus drify")) {
            itemDatabaseDrifBonus = ((Number) item.getStats().get("Bonus drify")).doubleValue() / 100.0;
        }

        double finalDrifMod = baseStarDrifMod + itemDatabaseDrifBonus;

        processItem(item, starMod.getStatsMod(), acc);
        processOrb(slotKey, slot, starMod.getOrbMod(), ctx, acc, usedOrbs);
        processDrifs(slotKey, slot, item, finalDrifMod, ctx, acc, drifCounts);
    }

    private void processItem(ItemTemplate item, double statMod, StatsAccumulator acc) {
        if (item.getStats() == null || item.getStats().isEmpty()) return;

        if (statMod == 0.0) {
            item.getStats().forEach((stat, val) -> acc.addFlatValue(stat, ((Number) val).doubleValue()));
            return;
        }

        Map<String, Integer> baseStats = new HashMap<>();
        Map<String, Integer> baseResists = new HashMap<>();

        item.getStats().forEach((k, v) -> {
            String keyLower = k.toLowerCase();

            if (keyLower.contains("bonus") || keyLower.contains("drif") || keyLower.contains("orb") || keyLower.contains("pojemność")) {
                acc.addFlatValue(k, ((Number) v).doubleValue());
            } else {
                if (keyLower.contains("odp")) baseResists.put(k, ((Number) v).intValue());
                else baseStats.put(k, ((Number) v).intValue());
            }
        });

        acc.distributeRandomly(baseStats, statMod);
        acc.distributeRandomly(baseResists, statMod);
    }

    private void processOrb(String slotKey, SlotData slot, double orbMod, CalculationContext ctx,
                            StatsAccumulator acc, Set<ORB_BONUS_TYPE> usedOrbs) {
        if (slot.getOrbId() == null || !ctx.orbs().containsKey(slot.getOrbId())) return;
        OrbTemplate orb = ctx.orbs().get(slot.getOrbId());

        if (!validator.isValidOrb(orb, slotKey)) return;

        if (usedOrbs.contains(orb.getBonusType())) return;
        usedOrbs.add(orb.getBonusType());

        int finalLvl = validator.sanitizeOrbLevel((slot.getOrbLevel() != null) ? slot.getOrbLevel() : 1, orb);

        String bonusStr = switch (finalLvl) {
            case 1 -> orb.getBonusLvl1();
            case 2 -> orb.getBonusLvl2();
            case 3 -> orb.getBonusLvl3();
            default -> "0";
        };

        acc.addRawValue(orb.getBonusType().name(), bonusStr, 1.0 + orbMod);
    }

    private void processDrifs(String slotKey, SlotData slot, ItemTemplate item, double drifMod,
                              CalculationContext ctx, StatsAccumulator acc, Map<DRIF_BONUS_TYPE, Integer> drifCounts) {
        if (slot.getDrifIds() == null) return;

        Set<DRIF_BONUS_TYPE> processedDrifsForItem = new HashSet<>();

        for (int i = 0; i < slot.getDrifIds().size(); i++) {
            Long drifId = slot.getDrifIds().get(i);
            if (drifId == null || !ctx.drifs().containsKey(drifId)) continue;
            DrifTemplate drif = ctx.drifs().get(drifId);

            if (!validator.isValidDrif(drif, slotKey)) continue;
            if (!validator.isValidDrifSizeForTier(drif, item)) continue;

            if (processedDrifsForItem.contains(drif.getBonusType())) continue;
            processedDrifsForItem.add(drif.getBonusType());

            int requestedLvl = (slot.getDrifLevels() != null && slot.getDrifLevels().containsKey(String.valueOf(i)))
                    ? slot.getDrifLevels().get(String.valueOf(i)) : 1;

            int finalLvl = validator.sanitizeDrifLevel(requestedLvl, drif);

            int globalCountForThisDrif = drifCounts.getOrDefault(drif.getBonusType(), 1);
            double penaltyMultiplier = EquipmentRulesRegistry.getDrifPenalty(globalCountForThisDrif);

            String calculatedStatValue = calculateTotalDrifStat(drif.getBaseValue(), drif.getIncrement(), finalLvl);
            double finalMultiplier = (1.0 + drifMod) * penaltyMultiplier;

            acc.addRawValue(drif.getBonusType().name(), calculatedStatValue, finalMultiplier);
        }
    }

    private String calculateTotalDrifStat(String baseValueStr, String incrementStr, int level) {
        if (baseValueStr == null || incrementStr == null) return "0";
        boolean isPercentage = baseValueStr.contains("%") || incrementStr.contains("%");

        try {
            BigDecimal total = new BigDecimal(baseValueStr.replace(",", ".").replace("%", "").trim());
            BigDecimal increment = new BigDecimal(incrementStr.replace(",", ".").replace("%", "").trim());
            BigDecimal doubleIncrement = increment.multiply(new BigDecimal("2"));

            for (int currentLevel = 2; currentLevel <= level; currentLevel++) {
                if (currentLevel >= 19 && currentLevel <= 21) {
                    total = total.add(doubleIncrement);
                } else {
                    total = total.add(increment);
                }
            }

            String result = total.setScale(2, RoundingMode.HALF_UP)
                    .stripTrailingZeros()
                    .toPlainString();

            return isPercentage ? result + "%" : result;
        } catch (NumberFormatException e) {
            return "0";
        }
    }
}