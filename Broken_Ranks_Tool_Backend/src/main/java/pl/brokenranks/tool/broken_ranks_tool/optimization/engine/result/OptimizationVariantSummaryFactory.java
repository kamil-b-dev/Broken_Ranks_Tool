package pl.brokenranks.tool.broken_ranks_tool.optimization.engine.result;

import static pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model.OptimizationSearchModel.*;
import static pl.brokenranks.tool.broken_ranks_tool.optimization.engine.rules.OptimizationRequestConstraints.TARGET_TOLERANCE;

import java.util.ArrayList;
import java.util.List;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_BONUS_TYPE;
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.OptimizationSummary;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.variant.GeneratedOptimizationVariant;

/** Selects and maps alternative optimizer states for the response summary. */
final class OptimizationVariantSummaryFactory {

    private static final int MAX_VARIANT_CHANGES = 5;
    private final OptimizationCalculatorAdapter calculatorAdapter;
    private final OptimizationSetupMapper setupMapper;
    private final OptimizationVariantSelectionPolicy selectionPolicy =
            new OptimizationVariantSelectionPolicy();
    private final OptimizationVariantDiffAnalyzer diffAnalyzer;

    OptimizationVariantSummaryFactory(
            OptimizationCalculatorAdapter calculatorAdapter, OptimizationSetupMapper setupMapper) {
        this.calculatorAdapter = calculatorAdapter;
        this.setupMapper = setupMapper;
        this.diffAnalyzer = new OptimizationVariantDiffAnalyzer(calculatorAdapter);
    }

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
                    diffAnalyzer.placementChanges(finalState, variant, context);
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
                diffAnalyzer.statChanges(finalState, candidate.state(), context),
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

}
