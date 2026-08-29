package pl.brokenranks.tool.broken_ranks_tool.equipment.service.calculator.input;

import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import pl.brokenranks.tool.broken_ranks_tool.equipment.dto.EquipmentRequest.SlotData;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.DrifTemplate;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.ItemTemplate;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.OrbTemplate;
import pl.brokenranks.tool.broken_ranks_tool.equipment.persistence.repository.DrifTemplateRepository;
import pl.brokenranks.tool.broken_ranks_tool.equipment.persistence.repository.ItemTemplateRepository;
import pl.brokenranks.tool.broken_ranks_tool.equipment.persistence.repository.OrbTemplateRepository;

/** Loads equipment templates in batches to avoid N+1 queries during calculations. */
@Service
@RequiredArgsConstructor
public class EquipmentDataProvider {

    private final ItemTemplateRepository itemRepository;
    private final OrbTemplateRepository orbRepository;
    private final DrifTemplateRepository drifRepository;

    /**
     * Builds a calculation context from the requested equipment slots.
     * @param slots Requested equipment slot data.
     * @return Context containing templates indexed by identifier.
     */
    public CalculationContext buildContext(Collection<SlotData> slots) {
        List<Long> itemIds =
                collectIds(
                        slots,
                        slot -> slot.getItemId() == null ? List.of() : List.of(slot.getItemId()));
        List<Long> orbIds = collectIds(slots, SlotData::getOrbIds);
        List<Long> drifIds = collectIds(slots, SlotData::getDrifIds);

        return new CalculationContext(
                itemRepository.findAllById(itemIds).stream()
                        .collect(
                                Collectors.toMap(
                                        ItemTemplate::getId,
                                        Function.identity(),
                                        (first, ignored) -> first)),
                orbRepository.findAllById(orbIds).stream()
                        .collect(
                                Collectors.toMap(
                                        OrbTemplate::getId,
                                        Function.identity(),
                                        (first, ignored) -> first)),
                drifRepository.findAllById(drifIds).stream()
                        .collect(
                                Collectors.toMap(
                                        DrifTemplate::getId,
                                        Function.identity(),
                                        (first, ignored) -> first)));
    }

    private List<Long> collectIds(
            Collection<SlotData> slots, Function<SlotData, Collection<Long>> idExtractor) {
        return slots.stream()
                .filter(Objects::nonNull)
                .map(idExtractor)
                .filter(Objects::nonNull)
                .flatMap(Collection::stream)
                .filter(Objects::nonNull)
                .distinct()
                .toList();
    }

    /** Immutable container for the templates required by the calculation pipeline. */
    public record CalculationContext(
            Map<Long, ItemTemplate> items,
            Map<Long, OrbTemplate> orbs,
            Map<Long, DrifTemplate> drifs) {}
}
