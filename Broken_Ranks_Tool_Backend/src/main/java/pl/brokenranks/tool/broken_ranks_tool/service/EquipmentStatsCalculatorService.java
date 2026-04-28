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

    private record StarModifiers(double statsMod, double orbMod, double drifMod) {}

    //KONTEKST
    private record CalculationContext(
            Map<Long, ItemTemplate> items,
            Map<Long, OrbTemplate> orbs,
            Map<Long, DrifTemplate> drifs,
            Map<String, Double> flatStats,
            Map<String, Double> percentStats
    ) {
        public void addValue(String statName, String rawValue, double multiplier) {
            if (rawValue == null || rawValue.isBlank()) return;

            boolean isPercent = rawValue.contains("%");
            String cleanValue = rawValue.replace("%", "").replace(",", ".").trim();

            try {
                double parsedValue = Double.parseDouble(cleanValue);
                double totalValue = parsedValue * multiplier;

                if (isPercent) {
                    this.percentStats().merge(statName, totalValue, Double::sum);
                } else {
                    this.flatStats().merge(statName, totalValue, Double::sum);
                }
            } catch (NumberFormatException ignored) {}
        }
    }

    //GŁÓWNA METODA
    public Map<String, String> calculateTotalStats(EquipmentRequest request) {
        if (request.getSlots() == null || request.getSlots().isEmpty()) {
            return Collections.emptyMap();
        }

        Collection<SlotData> allSlots = request.getSlots().values();
        CalculationContext ctx = buildContext(allSlots);

        if (request.getCharacterStats() != null) {
            request.getCharacterStats().forEach((stat, val) ->
                    ctx.flatStats().merge(stat, val.doubleValue(), Double::sum)
            );
        }

        allSlots.forEach(slot -> processSlot(slot, ctx));

        Map<String, String> finalStats = new HashMap<>();
        ctx.flatStats().forEach((stat, val) -> finalStats.put(stat, String.valueOf(Math.round(val))));
        ctx.percentStats().forEach((stat, val) -> finalStats.put(stat, formatPercent(val)));

        return finalStats;
    }

    //LOGIKA OBLICZEŃ
    private void processSlot(SlotData slot, CalculationContext ctx) {
        int stars = (slot.getItemStars() != null) ? slot.getItemStars() : 1;

        StarModifiers mods = getStarModifiers(stars);

        processItem(slot, mods.statsMod(), ctx);
        processOrb(slot, mods.orbMod(), ctx);
        processDrifs(slot, mods.drifMod(), ctx);
    }

    private void processItem(SlotData slot, double statMod, CalculationContext ctx) {
        if (slot.getItemId() == null || !ctx.items().containsKey(slot.getItemId())) return;

        ItemTemplate item = ctx.items().get(slot.getItemId());
        if (item.getStats() == null || item.getStats().isEmpty()) return;

        if (statMod == 0.0) {
            item.getStats().forEach((stat, val) ->
                    ctx.flatStats().merge(stat, ((Number) val).doubleValue(), Double::sum));
            return;
        }

        Map<String, Integer> baseStats = new HashMap<>();
        Map<String, Integer> baseResists = new HashMap<>();

        item.getStats().forEach((k, v) -> {
            if (k.toLowerCase().contains("odp")) {
                baseResists.put(k, ((Number) v).intValue());
            } else {
                baseStats.put(k, ((Number) v).intValue());
            }
        });

        distributeRandomly(baseStats, statMod, ctx);
        distributeRandomly(baseResists, statMod, ctx);
    }

    private void processOrb(SlotData slot, double orbMod, CalculationContext ctx) {
        if (slot.getOrbId() == null || !ctx.orbs().containsKey(slot.getOrbId())) return;
        OrbTemplate orb = ctx.orbs().get(slot.getOrbId());
        int lvl = (slot.getOrbLevel() != null) ? slot.getOrbLevel() : 1;

        String bonusStr = switch (lvl) {
            case 1 -> orb.getBonusLvl1();
            case 2 -> orb.getBonusLvl2();
            case 3 -> orb.getBonusLvl3();
            default -> "0";
        };

        double finalMultiplier = 1.0 * (1.0 + orbMod);
        ctx.addValue(orb.getBonusType().name(), bonusStr, finalMultiplier);
    }

    private void processDrifs(SlotData slot, double drifMod, CalculationContext ctx) {
        if (slot.getDrifIds() == null) return;

        List<Long> drifIds = slot.getDrifIds();
        Map<String, Integer> drifLevels = slot.getDrifLevels();

        for (int i = 0; i < drifIds.size(); i++) {
            Long drifId = drifIds.get(i);
            if (drifId == null || !ctx.drifs().containsKey(drifId)) continue;

            DrifTemplate drif = ctx.drifs().get(drifId);
            int lvl = (drifLevels != null && drifLevels.containsKey(String.valueOf(i)))
                    ? drifLevels.get(String.valueOf(i)) : 1;

            double finalMultiplier = (double) lvl * (1.0 + drifMod);
            ctx.addValue(drif.getBonusType().name(), drif.getBaseValue(), finalMultiplier);
        }
    }

    //POMOCNICZE
    private void distributeRandomly(Map<String, Integer> baseValues, double multiplier, CalculationContext ctx) {
        if (baseValues.isEmpty()) return;

        int totalBase = baseValues.values().stream().mapToInt(Integer::intValue).sum();
        int bonusPool = (int) Math.round(totalBase * multiplier);

        Map<String, Integer> finalValues = new HashMap<>(baseValues);
        List<String> keys = new ArrayList<>(baseValues.keySet());
        Random random = new Random();

        for (int i = 0; i < bonusPool; i++) {
            String randomKey = keys.get(random.nextInt(keys.size()));
            finalValues.put(randomKey, finalValues.get(randomKey) + 1);
        }

        finalValues.forEach((stat, val) -> ctx.flatStats().merge(stat, (double) val, Double::sum));
    }

    private StarModifiers getStarModifiers(int stars) {
        return switch (stars) {
            case 1 -> new StarModifiers(0.00, 0.00, 0.00);
            case 2 -> new StarModifiers(0.03, 0.00, 0.00);
            case 3 -> new StarModifiers(0.06, 0.00, 0.00);
            case 4 -> new StarModifiers(0.10, 0.05, 0.00);
            case 5 -> new StarModifiers(0.15, 0.10, 0.00);
            case 6 -> new StarModifiers(0.20, 0.20, 0.00);
            case 7 -> new StarModifiers(0.25, 0.30, 0.03);
            case 8 -> new StarModifiers(0.35, 0.50, 0.08);
            case 9 -> new StarModifiers(0.50, 0.75, 0.15);
            default -> new StarModifiers(0.00, 0.00, 0.00);
        };
    }

    private CalculationContext buildContext(Collection<SlotData> slots) {
        List<Long> itemIds = slots.stream().map(SlotData::getItemId).filter(Objects::nonNull).toList();
        List<Long> orbIds = slots.stream().map(SlotData::getOrbId).filter(Objects::nonNull).toList();
        List<Long> drifIds = slots.stream().map(SlotData::getDrifIds).filter(Objects::nonNull).flatMap(List::stream).filter(Objects::nonNull).toList();

        return new CalculationContext(
                itemRepository.findAllById(itemIds).stream().collect(Collectors.toMap(ItemTemplate::getId, Function.identity())),
                orbRepository.findAllById(orbIds).stream().collect(Collectors.toMap(OrbTemplate::getId, Function.identity())),
                drifRepository.findAllById(drifIds).stream().collect(Collectors.toMap(DrifTemplate::getId, Function.identity())),
                new HashMap<>(),
                new HashMap<>()
        );
    }

    private String formatPercent(double value) {
        if (value == (long) value) return String.format("%d%%", (long) value);
        return String.format("%s%%", value).replace(",", ".");
    }
}