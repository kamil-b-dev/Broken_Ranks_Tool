package pl.brokenranks.tool.broken_ranks_tool.optimization.engine.result;

import static pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model.OptimizationSearchModel.*;
import static pl.brokenranks.tool.broken_ranks_tool.optimization.engine.rules.OptimizationRequestConstraints.TARGET_TOLERANCE;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeSet;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.OptimizationSummary;

/** Describes user-visible statistic and placement differences between optimizer states. */
@RequiredArgsConstructor
final class OptimizationVariantDiffAnalyzer {
    private final OptimizationCalculatorAdapter calculatorAdapter;

    List<OptimizationSummary.StatChange> statChanges(
            BuildState main, BuildState variant, OptimizationContext context) {
        Map<String, String> mainStats = calculatorAdapter.actualStats(main, context);
        Map<String, String> variantStats = calculatorAdapter.actualStats(variant, context);
        Set<String> drifStats =
                context.drifs().values().stream()
                        .map(drif -> drif.getBonusType().name())
                        .collect(Collectors.toSet());
        Set<String> keys = new TreeSet<>(mainStats.keySet());
        keys.addAll(variantStats.keySet());
        return keys.stream()
                .filter(drifStats::contains)
                .filter(key -> !sameValue(mainStats.get(key), variantStats.get(key)))
                .map(
                        key ->
                                new OptimizationSummary.StatChange(
                                        key,
                                        mainStats.getOrDefault(key, "0"),
                                        variantStats.getOrDefault(key, "0")))
                .toList();
    }

    List<OptimizationSummary.PlacementChange> placementChanges(
            BuildState main, BuildState variant, OptimizationContext context) {
        List<OptimizationSummary.PlacementChange> changes = new ArrayList<>();
        for (SlotContext slot : context.slots()) {
            List<Placement> from = main.slots().getOrDefault(slot.key(), List.of());
            List<Placement> to = variant.slots().getOrDefault(slot.key(), List.of());
            for (int position = 0; position < Math.max(from.size(), to.size()); position++) {
                Placement left = placementAt(from, position);
                Placement right = placementAt(to, position);
                if (samePlacement(left, right)) continue;
                changes.add(
                        new OptimizationSummary.PlacementChange(
                                slot.key(),
                                slot.item().getName(),
                                name(left),
                                level(left),
                                name(right),
                                level(right)));
            }
        }
        return changes;
    }

    private boolean sameValue(String left, String right) {
        if (left == null || right == null) return left == right;
        return Math.abs(calculatorAdapter.parseValue(left) - calculatorAdapter.parseValue(right))
                <= TARGET_TOLERANCE;
    }

    private Placement placementAt(List<Placement> placements, int index) {
        return index < placements.size() ? placements.get(index) : null;
    }

    private boolean samePlacement(Placement left, Placement right) {
        if (left == null || right == null) return left == right;
        return left.drif().getId().equals(right.drif().getId()) && left.level() == right.level();
    }

    private String name(Placement placement) {
        return placement != null ? placement.drif().getBonusType().getDescription() : null;
    }

    private Integer level(Placement placement) {
        return placement != null ? placement.level() : null;
    }
}
