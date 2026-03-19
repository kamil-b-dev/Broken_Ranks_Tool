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

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Stream;

@Service
@RequiredArgsConstructor
public class EquipmentStatsCalculatorService {

    private final ItemTemplateRepository itemRepository;
    private final OrbTemplateRepository orbRepository;
    private final DrifTemplateRepository drifRepository;

    public Map<String, Integer> calculateTotalStats(EquipmentRequest request) {
        Map<String, Integer> totalStats = new HashMap<>();

        // 1. Zbieramy ID Przedmiotów
        List<Long> itemIds = Stream.of(
                request.getHelmetId(), request.getArmorId(), request.getCapeId(),
                request.getLegsId(), request.getBootsId(), request.getGlovesId(),
                request.getBeltId(), request.getRing1Id(), request.getRing2Id(),
                request.getNecklaceId(), request.getShieldId(), request.getWeaponId()
        ).filter(Objects::nonNull).toList();

        // 2. Zbieramy ID Orbów
        List<Long> orbIds = Stream.of(
                request.getHelmetOrbId(), request.getArmorOrbId(), request.getCapeOrbId(),
                request.getLegsOrbId(), request.getBootsOrbId(), request.getGlovesOrbId(),
                request.getBeltOrbId(), request.getRing1OrbId(), request.getRing2OrbId(),
                request.getNecklaceOrbId(), request.getShieldOrbId(), request.getWeaponOrbId()
        ).filter(Objects::nonNull).toList();

        // 3. Zbieramy ID Drifów (Z list do jednej płaskiej listy)
        List<Long> drifIds = Stream.of(
                        request.getHelmetDrifs(), request.getArmorDrifs(), request.getCapeDrifs(),
                        request.getLegsDrifs(), request.getBootsDrifs(), request.getGlovesDrifs(),
                        request.getBeltDrifs(), request.getRing1Drifs(), request.getRing2Drifs(),
                        request.getNecklaceDrifs(), request.getShieldDrifs(), request.getWeaponDrifs()
                )
                .filter(Objects::nonNull) // Ignoruj puste listy (nulle)
                .flatMap(List::stream)    // Spłaszczamy (List<Long> -> Stream<Long>)
                .filter(Objects::nonNull) // Ignoruj nulle w środku
                .toList();

        // --- POBIERANIE Z BAZY ---

        // PRZEDMIOTY
        if (!itemIds.isEmpty()) {
            List<ItemTemplate> items = itemRepository.findAllById(itemIds);
            for (ItemTemplate item : items) {
                addStatsToTotal(totalStats, item.getStats());
            }
        }

        // ORBY
        if (!orbIds.isEmpty()) {
            List<OrbTemplate> orbs = orbRepository.findAllById(orbIds);
            for (OrbTemplate orb : orbs) {
                // POPRAWKA TUTAJ: Dodano .name()
                // Jeśli Twój Enum nazywa się np. STRENGTH, to name() zwróci "STRENGTH".
                // Jeśli chcesz mieć ładną nazwę (np. "Siła"), musisz użyć metody z Enuma, np. orb.getBonusType().getValue() (jeśli taką masz).
                String name = orb.getBonusType().name();

                int val = extractInt(orb.getBonusLvl1());
                totalStats.merge(name, val, Integer::sum);
            }
        }

        // DRIFY
        if (!drifIds.isEmpty()) {
            List<DrifTemplate> drifs = drifRepository.findAllById(drifIds);
            for (DrifTemplate drif : drifs) {
                // POPRAWKA TUTAJ: Dodano .name()
                String name = drif.getBonusType().name();

                int val = extractInt(drif.getBaseValue());
                totalStats.merge(name, val, Integer::sum);
            }
        }

        return totalStats;
    }

    // Pomocnicza do map
    private void addStatsToTotal(Map<String, Integer> total, Map<String, Integer> source) {
        if (source == null) return;
        source.forEach((k, v) -> total.merge(k, v, Integer::sum));
    }

    // Pomocnicza do wyciągania liczb ze stringów (np. "Siła +5" -> 5)
    private int extractInt(String val) {
        if (val == null) return 0;
        // Zostawiamy tylko cyfry i minus (dla ujemnych statystyk)
        String clean = val.replaceAll("[^0-9-]", "");
        if (clean.isEmpty() || clean.equals("-")) return 0;
        return Integer.parseInt(clean);
    }
}