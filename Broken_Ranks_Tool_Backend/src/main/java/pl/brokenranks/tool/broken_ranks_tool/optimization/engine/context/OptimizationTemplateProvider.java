package pl.brokenranks.tool.broken_ranks_tool.optimization.engine.context;

import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import pl.brokenranks.tool.broken_ranks_tool.equipment.dto.EquipmentRequest;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.DrifTemplate;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.ItemTemplate;
import pl.brokenranks.tool.broken_ranks_tool.equipment.persistence.repository.DrifTemplateRepository;
import pl.brokenranks.tool.broken_ranks_tool.equipment.persistence.repository.ItemTemplateRepository;
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.OptimizationRequest;

/** Loads deterministic template snapshots required by an optimization request. */
@RequiredArgsConstructor
final class OptimizationTemplateProvider {
    private final DrifTemplateRepository drifRepository;
    private final ItemTemplateRepository itemRepository;

    Map<Long, ItemTemplate> loadItems(OptimizationRequest request) {
        List<Long> ids =
                request.getOriginalSlots().values().stream()
                        .filter(Objects::nonNull)
                        .map(EquipmentRequest.SlotData::getItemId)
                        .filter(Objects::nonNull)
                        .sorted()
                        .toList();
        return itemRepository.findAllById(ids).stream()
                .sorted(Comparator.comparing(ItemTemplate::getId))
                .collect(
                        Collectors.toMap(
                                ItemTemplate::getId,
                                Function.identity(),
                                (left, right) -> left,
                                LinkedHashMap::new));
    }

    Map<Long, DrifTemplate> loadDrifs() {
        return drifRepository.findAll().stream()
                .sorted(Comparator.comparing(DrifTemplate::getId))
                .collect(
                        Collectors.toMap(
                                DrifTemplate::getId,
                                Function.identity(),
                                (left, right) -> left,
                                LinkedHashMap::new));
    }
}
