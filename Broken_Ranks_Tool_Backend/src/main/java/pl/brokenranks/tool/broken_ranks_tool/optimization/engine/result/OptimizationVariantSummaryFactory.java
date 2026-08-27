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
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_BONUS_TYPE;
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.OptimizationSummary;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model.GeneratedOptimizationVariant;

/** Selects and maps alternative optimizer states for the response summary. */
@RequiredArgsConstructor
final class OptimizationVariantSummaryFactory {

    private static final int MAX_VARIANT_CHANGES = 5;
    private final OptimizationCalculatorAdapter calculatorAdapter;
    private final OptimizationSetupMapper setupMapper;
    private final OptimizationVariantSelectionPolicy selectionPolicy =
            new OptimizationVariantSelectionPolicy();

    List<OptimizationSummary.OptimizationVariant> create(
            BuildState finalState,
            List<GeneratedOptimizationVariant> variants,
            OptimizationContext context) {
        OptimizationSummary.OptimizationVariant mainVariant = mainVariant(finalState, context);
        if (context.request().getMaximizeBonuses() == null
                || context.request().getMaximizeBonuses().isEmpty()) return List.of(mainVariant);

        List<OptimizationVariantSelectionPolicy.Candidate> candidates =
                variantCandidates(finalState, variants, context);
        List<OptimizationSummary.OptimizationVariant> result = new ArrayList<>();
        result.add(mainVariant);
        selectionPolicy.select(candidates).stream()
                .map(candidate -> alternativeVariant(finalState, candidate, context))
                .forEach(result::add);
        return result;
    }

    private OptimizationSummary.OptimizationVariant mainVariant(
            BuildState finalState, OptimizationContext context) {
        return new OptimizationSummary.OptimizationVariant(
                true,
                "Wynik główny",
                0.0,
                0.0,
                0.0,
                0.0,
                0,
                0.0,
                List.of(),
                List.of(),
                setupMapper.toSetup(finalState, context));
    }

    private List<OptimizationVariantSelectionPolicy.Candidate> variantCandidates(
            BuildState finalState,
            List<GeneratedOptimizationVariant> variants,
            OptimizationContext context) {
        List<OptimizationVariantSelectionPolicy.Candidate> candidates = new ArrayList<>();
        for (GeneratedOptimizationVariant generated : variants) {
            BuildState variant = generated.state();
            if (variant.signature().equals(finalState.signature())) continue;
            DRIF_BONUS_TYPE focus = generated.focus();
            double finalValue = calculatorAdapter.actualValue(finalState, focus, context);
            double variantValue = calculatorAdapter.actualValue(variant, focus, context);
            if (variantValue <= finalValue + TARGET_TOLERANCE) continue;
            List<OptimizationSummary.PlacementChange> changes =
                    placementChanges(finalState, variant, context);
            if (!changes.isEmpty() && changes.size() <= MAX_VARIANT_CHANGES) {
                candidates.add(
                        new OptimizationVariantSelectionPolicy.Candidate(
                                focus,
                                finalValue,
                                variantValue,
                                totalLoss(finalState, variant, focus, context),
                                changes,
                                variant.signature(),
                                variant));
            }
        }
        return candidates;
    }

    private OptimizationSummary.OptimizationVariant alternativeVariant(
            BuildState finalState,
            OptimizationVariantSelectionPolicy.Candidate candidate,
            OptimizationContext context) {
        return new OptimizationSummary.OptimizationVariant(
                false,
                candidate.type().getDescription(),
                candidate.finalValue(),
                candidate.variantValue(),
                candidate.gain(),
                candidate.totalLoss(),
                candidate.changes().size(),
                candidate.score(),
                candidate.changes(),
                statChanges(finalState, candidate.state(), context),
                setupMapper.toSetup(candidate.state(), context));
    }

    private double totalLoss(
            BuildState main,
            BuildState variant,
            DRIF_BONUS_TYPE focus,
            OptimizationContext context) {
        return context.request().getPriorities().keySet().stream()
                .filter(type -> type != focus)
                .mapToDouble(
                        type ->
                                Math.max(
                                        0.0,
                                        calculatorAdapter.actualValue(main, type, context)
                                                - calculatorAdapter.actualValue(
                                                        variant, type, context)))
                .sum();
    }

    private List<OptimizationSummary.StatChange> statChanges(
            BuildState finalState, BuildState variant, OptimizationContext context) {
        Map<String, String> finalStats = calculatorAdapter.actualStats(finalState, context);
        Map<String, String> variantStats = calculatorAdapter.actualStats(variant, context);
        Set<String> drifStatKeys =
                context.drifs().values().stream()
                        .map(drif -> drif.getBonusType().name())
                        .collect(Collectors.toSet());
        Set<String> keys = new TreeSet<>();
        keys.addAll(finalStats.keySet());
        keys.addAll(variantStats.keySet());
        return keys.stream()
                .filter(drifStatKeys::contains)
                .filter(key -> !sameStatValue(finalStats.get(key), variantStats.get(key)))
                .map(
                        key ->
                                new OptimizationSummary.StatChange(
                                        key,
                                        finalStats.getOrDefault(key, "0"),
                                        variantStats.getOrDefault(key, "0")))
                .toList();
    }

    private boolean sameStatValue(String left, String right) {
        if (left == null || right == null) return left == right;
        return Math.abs(calculatorAdapter.parseValue(left) - calculatorAdapter.parseValue(right))
                <= TARGET_TOLERANCE;
    }

    private List<OptimizationSummary.PlacementChange> placementChanges(
            BuildState finalState, BuildState variant, OptimizationContext context) {
        List<OptimizationSummary.PlacementChange> changes = new ArrayList<>();
        for (SlotContext slot : context.slots()) {
            appendSlotChanges(
                    changes,
                    finalState.slots().getOrDefault(slot.key(), List.of()),
                    variant.slots().getOrDefault(slot.key(), List.of()),
                    slot);
        }
        return changes;
    }

    private void appendSlotChanges(
            List<OptimizationSummary.PlacementChange> changes,
            List<Placement> finalPlacements,
            List<Placement> variantPlacements,
            SlotContext slot) {
        int positions = Math.max(finalPlacements.size(), variantPlacements.size());
        for (int position = 0; position < positions; position++) {
            Placement from = placementAt(finalPlacements, position);
            Placement to = placementAt(variantPlacements, position);
            if (samePlacement(from, to)) continue;
            changes.add(
                    new OptimizationSummary.PlacementChange(
                            slot.key(),
                            slot.item().getName(),
                            modifierName(from),
                            level(from),
                            modifierName(to),
                            level(to)));
        }
    }

    private Placement placementAt(List<Placement> placements, int position) {
        return position < placements.size() ? placements.get(position) : null;
    }

    private boolean samePlacement(Placement left, Placement right) {
        if (left == null || right == null) return left == right;
        return left.drif().getId().equals(right.drif().getId()) && left.level() == right.level();
    }

    private String modifierName(Placement placement) {
        return placement != null ? placement.drif().getBonusType().getDescription() : null;
    }

    private Integer level(Placement placement) {
        return placement != null ? placement.level() : null;
    }
}
