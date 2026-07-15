package pl.brokenranks.tool.broken_ranks_tool.equipment.service.provider;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import pl.brokenranks.tool.broken_ranks_tool.equipment.dto.EquipmentRequest.SlotData;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.DrifTemplate;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.ItemTemplate;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.OrbTemplate;
import pl.brokenranks.tool.broken_ranks_tool.equipment.repository.DrifTemplateRepository;
import pl.brokenranks.tool.broken_ranks_tool.equipment.repository.ItemTemplateRepository;
import pl.brokenranks.tool.broken_ranks_tool.equipment.repository.OrbTemplateRepository;

import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Przygotowuje wszystkie szablony ekwipunku potrzebne do przeprowadzenia obliczeń.
 * Celem tej klasy jest optymalizacja wydajności poprzez pobranie wszystkich
 * potrzebnych danych w kilku zbiorczych zapytaniach, aby zapobiec problemowi N+1.
 */
@Service
@RequiredArgsConstructor
public class EquipmentDataProvider {

    private final ItemTemplateRepository itemRepository;
    private final OrbTemplateRepository orbRepository;
    private final DrifTemplateRepository drifRepository;

    /**
     * Tworzy kontekst obliczeniowy na podstawie danych z żądania.
     *
     * @param slots Kolekcja danych o slotach z żądania.
     * @return Obiekt kontekstu zawierający mapy szablonów po ich ID.
     */
    public CalculationContext buildContext(Collection<SlotData> slots) {
        List<Long> itemIds = slots.stream().map(SlotData::getItemId).filter(Objects::nonNull).toList();
        List<Long> orbIds = slots.stream()
                .map(SlotData::getOrbIds)
                .filter(Objects::nonNull)
                .flatMap(List::stream)
                .filter(Objects::nonNull)
                .toList();
        List<Long> drifIds = slots.stream()
                .map(SlotData::getDrifIds)
                .filter(Objects::nonNull)
                .flatMap(List::stream)
                .filter(Objects::nonNull)
                .toList();

        return new CalculationContext(
                itemRepository.findAllById(itemIds).stream().collect(Collectors.toMap(ItemTemplate::getId, Function.identity())),
                orbRepository.findAllById(orbIds).stream().collect(Collectors.toMap(OrbTemplate::getId, Function.identity())),
                drifRepository.findAllById(drifIds).stream().collect(Collectors.toMap(DrifTemplate::getId, Function.identity()))
        );
    }

    /**
     * Niemutowalny kontener grupujący wszystkie dane wejściowe potrzebne do obliczeń.
     * Użycie tego obiektu upraszcza przekazywanie kontekstu pomiędzy komponentami kalkulatora.
     *
     * @param items Mapa szablonów przedmiotów dostępnych w tej sesji.
     * @param orbs  Mapa szablonów orbów dostępnych w tej sesji.
     * @param drifs Mapa szablonów drifów dostępnych w tej sesji.
     */
    public record CalculationContext(
            Map<Long, ItemTemplate> items,
            Map<Long, OrbTemplate> orbs,
            Map<Long, DrifTemplate> drifs
    ) {}
}
