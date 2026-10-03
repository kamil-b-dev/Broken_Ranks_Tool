package pl.brokenranks.tool.broken_ranks_tool.equipment.service.calculator;

import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.stereotype.Component;
import pl.brokenranks.tool.broken_ranks_tool.equipment.dto.EquipmentRequest.SlotData;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.calculator.input.EquipmentDataProvider.CalculationContext;

/** Builds response metadata describing modifier categories present in a calculation. */
@Component
public class CalculationMetadataFactory {

    /** Source metadata describes the requested stones, including when a larger catalog is reused. */
    public CalculationMetadata create(CalculationContext context, Collection<SlotData> slots) {
        return create(
                new CalculationContext(
                        context.items(),
                        requestedTemplates(context.orbs(), slots, SlotData::getOrbIds),
                        requestedTemplates(context.drifs(), slots, SlotData::getDrifIds)));
    }

    private <T> Map<Long, T> requestedTemplates(
            Map<Long, T> catalog, Collection<SlotData> slots, Function<SlotData, List<Long>> ids) {
        return slots.stream()
                .filter(slot -> slot.getItemId() != null)
                .map(ids)
                .filter(Objects::nonNull)
                .flatMap(Collection::stream)
                .filter(Objects::nonNull)
                .distinct()
                .filter(catalog::containsKey)
                .collect(Collectors.toMap(Function.identity(), catalog::get));
    }

    public CalculationMetadata create(CalculationContext context) {
        Map<String, String> drifCategories =
                context.drifs().values().stream()
                        .filter(drif -> drif.getBonusType() != null && drif.getCategory() != null)
                        .collect(
                                Collectors.toMap(
                                        drif -> drif.getBonusType().name(),
                                        drif -> drif.getCategory().name(),
                                        (first, ignored) -> first));
        Set<String> orbBonusTypes =
                context.orbs().values().stream()
                        .filter(orb -> orb.getBonusType() != null)
                        .map(orb -> orb.getBonusType().name())
                        .collect(Collectors.toSet());
        return new CalculationMetadata(drifCategories, orbBonusTypes);
    }

    public record CalculationMetadata(
            Map<String, String> drifCategories, Set<String> orbBonusTypes) {}
}
