package pl.brokenranks.tool.broken_ranks_tool.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import pl.brokenranks.tool.broken_ranks_tool.dto.EquipmentRequest;
import pl.brokenranks.tool.broken_ranks_tool.dto.EquipmentRequest.SlotData;
import pl.brokenranks.tool.broken_ranks_tool.entity.templates.*;
import pl.brokenranks.tool.broken_ranks_tool.repository.*;

import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class EquipmentStatsCalculatorService {

    private final ItemTemplateRepository itemRepository;
    private final OrbTemplateRepository orbRepository;
    private final DrifTemplateRepository drifRepository;

    private record CalculationContext(
            Map<Long, ItemTemplate> items,
            Map<Long, OrbTemplate> orbs,
            Map<Long, DrifTemplate> drifs,
            Map<String, Double> flatStats,
            Map<String, Double> percentStats
    ) {}

    public Map<String, String> calculateTotalStats(EquipmentRequest request) {
        if (request.getSlots() == null || request.getSlots().isEmpty()) {
            return Collections.emptyMap();
        }

        Collection<SlotData> allSlots = request.getSlots().values();

        CalculationContext ctx = buildContext(allSlots);

        allSlots.forEach(slot -> processSlot(slot, ctx));

        Map<String, String> finalStats = new HashMap<>();
        ctx.flatStats().forEach((stat, val) -> finalStats.put(stat, String.valueOf(Math.round(val))));
        ctx.percentStats().forEach((stat, val) -> finalStats.put(stat, formatPercent(val)));

        return finalStats;
    }

    private CalculationContext buildContext(Collection<SlotData> slots) {
        List<Long> itemIds = slots.stream().map(SlotData::getItemId).filter(Objects::nonNull).toList();
        List<Long> orbIds = slots.stream().map(SlotData::getOrbId).filter(Objects::nonNull).toList();
        List<Long> drifIds = slots.stream()
                .map(SlotData::getDrifIds).filter(Objects::nonNull)
                .flatMap(List::stream).filter(Objects::nonNull).toList();

        return new CalculationContext(
                itemRepository.findAllById(itemIds).stream().collect(Collectors.toMap(ItemTemplate::getId, Function.identity())),
                orbRepository.findAllById(orbIds).stream().collect(Collectors.toMap(OrbTemplate::getId, Function.identity())),
                drifRepository.findAllById(drifIds).stream().collect(Collectors.toMap(DrifTemplate::getId, Function.identity())),
                new HashMap<>(), //statystyki
                new HashMap<>()  //% statystyki
        );
    }

    private void processSlot(SlotData slot, CalculationContext ctx) {
        processItem(slot.getItemId(), ctx);
        processOrb(slot.getOrbId(), slot.getOrbLevel(), ctx);
        processDrifs(slot.getDrifIds(), slot.getDrifLevels(), ctx);
    }

    private void processItem(Long itemId, CalculationContext ctx) {
        if (itemId == null || !ctx.items().containsKey(itemId)) return;

        ItemTemplate item = ctx.items().get(itemId);
        if (item.getStats() != null) {
            item.getStats().forEach((stat, val) ->
                    ctx.flatStats().merge(stat, ((Number) val).doubleValue(), Double::sum));
        }
    }

    private void processOrb(Long orbId, Integer level, CalculationContext ctx) {
        if (orbId == null || !ctx.orbs().containsKey(orbId)) return;

        OrbTemplate orb = ctx.orbs().get(orbId);
        int lvl = (level != null) ? level : 1;

        String bonusStr = switch (lvl) {
            case 1 -> orb.getBonusLvl1();
            case 2 -> orb.getBonusLvl2();
            case 3 -> orb.getBonusLvl3();
            default -> "0";
        };
        addParsedValue(orb.getBonusType().name(), bonusStr, 1, ctx);
    }

    private void processDrifs(List<Long> drifIds, Map<String, Integer> drifLevels, CalculationContext ctx) {
        if (drifIds == null) return;

        for (int i = 0; i < drifIds.size(); i++) {
            Long drifId = drifIds.get(i);
            if (drifId == null || !ctx.drifs().containsKey(drifId)) continue;

            DrifTemplate drif = ctx.drifs().get(drifId);
            int lvl = 1;

            if (drifLevels != null && drifLevels.containsKey(String.valueOf(i))) {
                lvl = drifLevels.get(String.valueOf(i));
            }
            addParsedValue(drif.getBonusType().name(), drif.getBaseValue(), lvl, ctx);
        }
    }

    //Pomocnicze
    private void addParsedValue(String statName, String rawValue, int multiplier, CalculationContext ctx) {
        if (rawValue == null || rawValue.isBlank()) return;

        boolean isPercent = rawValue.contains("%");
        String cleanValue = rawValue.replace("%", "").replace(",", ".").trim();

        try {
            double parsedValue = Double.parseDouble(cleanValue);
            double totalValue = parsedValue * multiplier;

            if (isPercent) {
                ctx.percentStats().merge(statName, totalValue, Double::sum);
            } else {
                ctx.flatStats().merge(statName, totalValue, Double::sum);
            }
        } catch (NumberFormatException ignored) {}
    }

    private String formatPercent(double value) {
        if (value == (long) value) return String.format("%d%%", (long) value);
        return String.format("%s%%", value).replace(",", ".");
    }
}