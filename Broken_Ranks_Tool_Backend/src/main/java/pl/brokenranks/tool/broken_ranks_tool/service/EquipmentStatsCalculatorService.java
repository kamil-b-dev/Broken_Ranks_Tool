package pl.brokenranks.tool.broken_ranks_tool.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import pl.brokenranks.tool.broken_ranks_tool.dto.EquipmentRequest;
import pl.brokenranks.tool.broken_ranks_tool.entity.templates.DrifTemplate;
import pl.brokenranks.tool.broken_ranks_tool.entity.templates.ItemTemplate;
import pl.brokenranks.tool.broken_ranks_tool.entity.templates.OrbTemplate;
import pl.brokenranks.tool.broken_ranks_tool.repository.DrifTemplateRepository;
import pl.brokenranks.tool.broken_ranks_tool.repository.ItemTemplateRepository;
import pl.brokenranks.tool.broken_ranks_tool.repository.OrbTemplateRepository;

import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@Service
@RequiredArgsConstructor
public class EquipmentStatsCalculatorService {

    private final ItemTemplateRepository itemRepository;
    private final OrbTemplateRepository orbRepository;
    private final DrifTemplateRepository drifRepository;

    public Map<String, String> calculateTotalStats(EquipmentRequest request) {

        Map<String, Double> flatStats = new HashMap<>();
        Map<String, Double> percentStats = new HashMap<>();

        // 1. ZBIERAMY WSZYSTKIE ID DO HURTOWEGO POBRANIA Z BAZY
        List<Long> allItemIds = extractAllItemIds(request);
        List<Long> allOrbIds = extractAllOrbIds(request);
        List<Long> allDrifIds = extractAllDrifIds(request);

        // 2. POBIERAMY Z BAZY I MAPUJEMY (Używamy Function.identity() dla czystego kodu)
        Map<Long, ItemTemplate> itemMap = itemRepository.findAllById(allItemIds).stream()
                .collect(Collectors.toMap(ItemTemplate::getId, Function.identity()));

        Map<Long, OrbTemplate> orbMap = orbRepository.findAllById(allOrbIds).stream()
                .collect(Collectors.toMap(OrbTemplate::getId, Function.identity()));

        Map<Long, DrifTemplate> drifMap = drifRepository.findAllById(allDrifIds).stream()
                .collect(Collectors.toMap(DrifTemplate::getId, Function.identity()));

        // 3. PRZELICZAMY KAŻDY SLOT OSOBNO
        processSlot(request.getHelmetId(), request.getHelmetOrbId(), request.getHelmetOrbLevel(), request.getHelmetDrifs(), request.getHelmetDrifLevels(), itemMap, orbMap, drifMap, flatStats, percentStats);
        processSlot(request.getArmorId(), request.getArmorOrbId(), request.getArmorOrbLevel(), request.getArmorDrifs(), request.getArmorDrifLevels(), itemMap, orbMap, drifMap, flatStats, percentStats);
        processSlot(request.getCapeId(), request.getCapeOrbId(), request.getCapeOrbLevel(), request.getCapeDrifs(), request.getCapeDrifLevels(), itemMap, orbMap, drifMap, flatStats, percentStats);
        processSlot(request.getLegsId(), request.getLegsOrbId(), request.getLegsOrbLevel(), request.getLegsDrifs(), request.getLegsDrifLevels(), itemMap, orbMap, drifMap, flatStats, percentStats);
        processSlot(request.getBootsId(), request.getBootsOrbId(), request.getBootsOrbLevel(), request.getBootsDrifs(), request.getBootsDrifLevels(), itemMap, orbMap, drifMap, flatStats, percentStats);
        processSlot(request.getGlovesId(), request.getGlovesOrbId(), request.getGlovesOrbLevel(), request.getGlovesDrifs(), request.getGlovesDrifLevels(), itemMap, orbMap, drifMap, flatStats, percentStats);
        processSlot(request.getBeltId(), request.getBeltOrbId(), request.getBeltOrbLevel(), request.getBeltDrifs(), request.getBeltDrifLevels(), itemMap, orbMap, drifMap, flatStats, percentStats);
        processSlot(request.getWeaponId(), request.getWeaponOrbId(), request.getWeaponOrbLevel(), request.getWeaponDrifs(), request.getWeaponDrifLevels(), itemMap, orbMap, drifMap, flatStats, percentStats);
        processSlot(request.getShieldId(), request.getShieldOrbId(), request.getShieldOrbLevel(), request.getShieldDrifs(), request.getShieldDrifLevels(), itemMap, orbMap, drifMap, flatStats, percentStats);
        processSlot(request.getRing1Id(), request.getRing1OrbId(), request.getRing1OrbLevel(), request.getRing1Drifs(), request.getRing1DrifLevels(), itemMap, orbMap, drifMap, flatStats, percentStats);
        processSlot(request.getRing2Id(), request.getRing2OrbId(), request.getRing2OrbLevel(), request.getRing2Drifs(), request.getRing2DrifLevels(), itemMap, orbMap, drifMap, flatStats, percentStats);
        processSlot(request.getNecklaceId(), request.getNecklaceOrbId(), request.getNecklaceOrbLevel(), request.getNecklaceDrifs(), request.getNecklaceDrifLevels(), itemMap, orbMap, drifMap, flatStats, percentStats);

        // 4. SKŁADAMY WYNIK KOŃCOWY
        Map<String, String> finalStats = new HashMap<>();

        flatStats.forEach((statName, value) ->
                finalStats.put(statName, String.valueOf(Math.round(value))));

        percentStats.forEach((statName, value) ->
                finalStats.put(statName, formatPercent(value)));

        return finalStats;
    }

    private void processSlot(
            Long itemId, Long orbId, Integer orbLevel,
            List<Long> drifIds, Map<String, Integer> drifLevels,
            Map<Long, ItemTemplate> itemMap, Map<Long, OrbTemplate> orbMap, Map<Long, DrifTemplate> drifMap,
            Map<String, Double> flatStats, Map<String, Double> percentStats
    ) {
        // --- 1. PRZEDMIOT ---
        if (itemId != null && itemMap.containsKey(itemId)) {
            ItemTemplate item = itemMap.get(itemId);
            // Zakładam, że item.getStats() zwraca Map<String, Integer> zgodnie z Twoim konwerterem
            if (item.getStats() != null) {
                item.getStats().forEach((statName, value) ->
                        flatStats.merge(statName, ((Number) value).doubleValue(), Double::sum));
            }
        }

        // --- 2. ORB ---
        if (orbId != null && orbMap.containsKey(orbId)) {
            OrbTemplate orb = orbMap.get(orbId);
            int lvl = (orbLevel != null) ? orbLevel : 1;

            String bonusStr = switch (lvl) {
                case 1 -> orb.getBonusLvl1();
                case 2 -> orb.getBonusLvl2();
                case 3 -> orb.getBonusLvl3();
                default -> "0";
            };

            addParsedValue(orb.getBonusType().name(), bonusStr, 1, flatStats, percentStats);
        }

        // --- 3. DRIFY ---
        if (drifIds != null) {
            for (int i = 0; i < drifIds.size(); i++) {
                Long drifId = drifIds.get(i);
                if (drifId == null || !drifMap.containsKey(drifId)) continue;

                DrifTemplate drif = drifMap.get(drifId);

                int dLvl = 1;
                if (drifLevels != null) {
                    Integer levelFromMap = drifLevels.get(String.valueOf(i));
                    if (levelFromMap != null) dLvl = levelFromMap;
                }

                addParsedValue(drif.getBonusType().name(), drif.getBaseValue(), dLvl, flatStats, percentStats);
            }
        }
    }

    private void addParsedValue(String statName, String rawValue, int multiplier, Map<String, Double> flatStats, Map<String, Double> percentStats) {
        if (rawValue == null || rawValue.isBlank()) return;

        boolean isPercent = rawValue.contains("%");

        String cleanValue = rawValue.replace("%", "").replace(",", ".").trim();

        try {
            double parsedValue = Double.parseDouble(cleanValue);
            double totalValue = parsedValue * multiplier;

            if (isPercent) {
                percentStats.merge(statName, totalValue, Double::sum);
            } else {
                flatStats.merge(statName, totalValue, Double::sum);
            }
        } catch (NumberFormatException ignored) {
        }
    }

    private String formatPercent(double value) {
        if (value == (long) value) {
            return String.format("%d%%", (long) value);
        }
        return String.format("%s%%", value).replace(",", ".");
    }

    private List<Long> extractAllItemIds(EquipmentRequest req) {
        return Stream.of(req.getHelmetId(), req.getArmorId(), req.getCapeId(), req.getLegsId(), req.getBootsId(), req.getGlovesId(), req.getBeltId(), req.getRing1Id(), req.getRing2Id(), req.getNecklaceId(), req.getShieldId(), req.getWeaponId())
                .filter(Objects::nonNull).toList();
    }

    private List<Long> extractAllOrbIds(EquipmentRequest req) {
        return Stream.of(req.getHelmetOrbId(), req.getArmorOrbId(), req.getCapeOrbId(), req.getLegsOrbId(), req.getBootsOrbId(), req.getGlovesOrbId(), req.getBeltOrbId(), req.getRing1OrbId(), req.getRing2OrbId(), req.getNecklaceOrbId(), req.getShieldOrbId(), req.getWeaponOrbId())
                .filter(Objects::nonNull).toList();
    }

    private List<Long> extractAllDrifIds(EquipmentRequest req) {
        return Stream.of(req.getHelmetDrifs(), req.getArmorDrifs(), req.getCapeDrifs(), req.getLegsDrifs(), req.getBootsDrifs(), req.getGlovesDrifs(), req.getBeltDrifs(), req.getRing1Drifs(), req.getRing2Drifs(), req.getNecklaceDrifs(), req.getShieldDrifs(), req.getWeaponDrifs())
                .filter(Objects::nonNull).flatMap(list -> list == null ? Stream.empty() : list.stream()).filter(Objects::nonNull).toList();
    }
}