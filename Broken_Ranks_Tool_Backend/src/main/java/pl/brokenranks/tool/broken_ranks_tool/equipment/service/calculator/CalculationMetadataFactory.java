package pl.brokenranks.tool.broken_ranks_tool.equipment.service.calculator;

import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.stereotype.Component;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.calculator.input.EquipmentDataProvider.CalculationContext;

/** Builds response metadata describing modifier categories present in a calculation. */
@Component
public class CalculationMetadataFactory {

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
