package pl.brokenranks.tool.broken_ranks_tool.equipment.service.impl;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.DrifTemplate;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.ItemTemplate;
import pl.brokenranks.tool.broken_ranks_tool.equipment.repository.DrifTemplateRepository;
import pl.brokenranks.tool.broken_ranks_tool.equipment.repository.ItemTemplateRepository;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.EquipmentFacade;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.validator.EquipmentValidator;

import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class EquipmentFacadeImpl implements EquipmentFacade {

    private final ItemTemplateRepository itemRepository;
    private final DrifTemplateRepository drifRepository;
    private final EquipmentValidator validator;

    @Override
    public Map<Long, ItemTemplate> getItemTemplates(Collection<Long> ids) {
        return itemRepository.findAllById(ids).stream()
                .collect(Collectors.toMap(ItemTemplate::getId, Function.identity()));
    }

    @Override
    public List<DrifTemplate> getAllDrifs() {
        return drifRepository.findAll();
    }

    @Override
    public int calculateItemCapacity(ItemTemplate item, int itemStars) {
        return validator.calculateItemCapacity(item, itemStars);
    }

    @Override
    public boolean isValidDrifSizeForTier(DrifTemplate drif, ItemTemplate item) {
        return validator.isValidDrifSizeForTier(drif, item);
    }

    @Override
    public boolean isElementalDrifPositionValid(DrifTemplate drif, String slotKey) {
        return validator.isElementalDrifPositionValid(drif, slotKey);
    }
}
