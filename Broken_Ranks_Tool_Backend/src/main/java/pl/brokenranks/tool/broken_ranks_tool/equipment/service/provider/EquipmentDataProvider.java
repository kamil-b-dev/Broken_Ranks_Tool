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
 * Serwis odpowiedzialny za dostarczanie i agregację danych o ekwipunku z bazy danych.
 * Optymalizuje pobieranie danych, aby uniknąć problemu N+1 zapytań.
 */
@Service
@RequiredArgsConstructor
public class EquipmentDataProvider {

    private final ItemTemplateRepository itemRepository;
    private final OrbTemplateRepository orbRepository;
    private final DrifTemplateRepository drifRepository;

    /**
     * Buduje kontekst obliczeniowy, pobierając wszystkie niezbędne szablony
     * (przedmioty, orby, drify) za pomocą jednego zapytania dla każdego typu.
     *
     * @param slots Kolekcja danych o slotach z żądania.
     * @return Obiekt {@link CalculationContext} zawierający mapy szablonów po ich ID.
     */
    public CalculationContext buildContext(Collection<SlotData> slots) {
        List<Long> itemIds = slots.stream().map(SlotData::getItemId).filter(Objects::nonNull).toList();
        List<Long> orbIds = slots.stream().map(SlotData::getOrbId).filter(Objects::nonNull).toList();
        List<Long> drifIds = slots.stream().map(SlotData::getDrifIds).filter(Objects::nonNull).flatMap(List::stream).filter(Objects::nonNull).toList();

        return new CalculationContext(
                itemRepository.findAllById(itemIds).stream().collect(Collectors.toMap(ItemTemplate::getId, Function.identity())),
                orbRepository.findAllById(orbIds).stream().collect(Collectors.toMap(OrbTemplate::getId, Function.identity())),
                drifRepository.findAllById(drifIds).stream().collect(Collectors.toMap(DrifTemplate::getId, Function.identity()))
        );
    }

    /**
     * Rekord przechowujący kontekst obliczeniowy - mapy z szablonami ekwipunku.
     * Używany do przekazywania wszystkich potrzebnych danych w jednym obiekcie.
     *
     * @param items Mapa szablonów przedmiotów (ID -> ItemTemplate).
     * @param orbs  Mapa szablonów orbów (ID -> OrbTemplate).
     * @param drifs Mapa szablonów drifów (ID -> DrifTemplate).
     */
    public record CalculationContext(
            Map<Long, ItemTemplate> items,
            Map<Long, OrbTemplate> orbs,
            Map<Long, DrifTemplate> drifs
    ) {}
}
