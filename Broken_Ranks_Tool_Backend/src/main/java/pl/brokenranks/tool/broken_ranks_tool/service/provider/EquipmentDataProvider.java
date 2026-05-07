package pl.brokenranks.tool.broken_ranks_tool.service.provider;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import pl.brokenranks.tool.broken_ranks_tool.dto.EquipmentRequest.SlotData;
import pl.brokenranks.tool.broken_ranks_tool.entity.templates.DrifTemplate;
import pl.brokenranks.tool.broken_ranks_tool.entity.templates.ItemTemplate;
import pl.brokenranks.tool.broken_ranks_tool.entity.templates.OrbTemplate;
import pl.brokenranks.tool.broken_ranks_tool.repository.DrifTemplateRepository;
import pl.brokenranks.tool.broken_ranks_tool.repository.ItemTemplateRepository;
import pl.brokenranks.tool.broken_ranks_tool.repository.OrbTemplateRepository;

import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class EquipmentDataProvider {

    private final ItemTemplateRepository itemRepository;
    private final OrbTemplateRepository orbRepository;
    private final DrifTemplateRepository drifRepository;

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

    public record CalculationContext(
            Map<Long, ItemTemplate> items,
            Map<Long, OrbTemplate> orbs,
            Map<Long, DrifTemplate> drifs
    ) {}
}