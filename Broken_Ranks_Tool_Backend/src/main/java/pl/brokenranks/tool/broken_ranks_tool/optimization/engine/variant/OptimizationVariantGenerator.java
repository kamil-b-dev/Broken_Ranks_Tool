package pl.brokenranks.tool.broken_ranks_tool.optimization.engine.variant;

import static pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model.OptimizationSearchModel.*;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_BONUS_TYPE;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.evaluation.OptimizationStateEvaluator;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model.GeneratedOptimizationVariant;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.result.OptimizationResultAssembler;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.search.neighborhood.OptimizationLargeNeighborhoodSearch;

/** Selects intentional trade-offs from states already verified by the main search. */
public final class OptimizationVariantGenerator {

    private static final int MAX_ALTERNATIVES = 4;
    private static final int CANDIDATES_PER_FOCUS = 8;
    private static final int FALLBACK_SEARCH_STATES = 3_000;

    private final OptimizationLargeNeighborhoodSearch neighborhoodSearch;
    private final OptimizationVariantContextFactory contextFactory =
            new OptimizationVariantContextFactory();
    private final OptimizationVariantFrontierPolicy frontierPolicy;

    public OptimizationVariantGenerator(
            OptimizationLargeNeighborhoodSearch neighborhoodSearch,
            OptimizationStateEvaluator stateEvaluator,
            OptimizationResultAssembler resultAssembler) {
        this.neighborhoodSearch = neighborhoodSearch;
        this.frontierPolicy =
                new OptimizationVariantFrontierPolicy(stateEvaluator, resultAssembler);
    }

    /**
     * Builds a Pareto frontier from calculator-verified states visited by the main LNS.
     * No additional neighborhood search is started solely for UI alternatives.
     */
    public List<GeneratedOptimizationVariant> generate(
            BuildState mainState, OptimizationContext context, List<BuildState> evaluatedStates) {
        if (context.request().getMaximizeBonuses() == null
                || context.request().getMaximizeBonuses().isEmpty()
                || evaluatedStates == null
                || evaluatedStates.isEmpty()) return List.of();

        List<DRIF_BONUS_TYPE> focuses =
                context.request().getMaximizeBonuses().stream()
                        .sorted(
                                Comparator.comparingInt(
                                                (DRIF_BONUS_TYPE type) ->
                                                        context.request()
                                                                .getPriorities()
                                                                .getOrDefault(type, 0))
                                        .reversed()
                                        .thenComparing(Enum::name))
                        .limit(MAX_ALTERNATIVES)
                        .toList();
        List<DRIF_BONUS_TYPE> trackedTypes =
                context.request().getPriorities().keySet().stream()
                        .sorted(Comparator.comparing(Enum::name))
                        .toList();
        Map<String, OptimizationVariantProfile> unique = new LinkedHashMap<>();
        unique.put(mainState.signature(), frontierPolicy.profile(mainState, trackedTypes, context));
        for (BuildState state : evaluatedStates) {
            if (!frontierPolicy.isEligible(state, context)) continue;
            unique.computeIfAbsent(
                    state.signature(),
                    ignored -> frontierPolicy.profile(state, trackedTypes, context));
        }

        OptimizationVariantProfile main = unique.get(mainState.signature());
        List<DRIF_BONUS_TYPE> missingFocuses =
                focuses.stream()
                        .filter(
                                focus ->
                                        !frontierPolicy.hasAcceptableCandidate(
                                                new ArrayList<>(unique.values()),
                                                main,
                                                focus,
                                                trackedTypes,
                                                context))
                        .toList();
        if (!missingFocuses.isEmpty()) {
            BuildState fallbackStart = contextFactory.withoutOptimizerPrelocks(mainState, context);
            for (DRIF_BONUS_TYPE focus : missingFocuses) {
                OptimizationContext profileContext = contextFactory.focusedContext(context, focus);
                OptimizationLargeNeighborhoodSearch.SearchResult fallback =
                        neighborhoodSearch.improve(
                                fallbackStart, profileContext, FALLBACK_SEARCH_STATES);
                for (BuildState state : fallback.evaluatedStates()) {
                    if (!frontierPolicy.isEligible(state, context)) continue;
                    unique.computeIfAbsent(
                            state.signature(),
                            ignored -> frontierPolicy.profile(state, trackedTypes, context));
                }
            }
        }

        List<OptimizationVariantProfile> profiles = new ArrayList<>(unique.values());
        List<OptimizationVariantProfile> frontier =
                profiles.stream()
                        .filter(
                                candidate ->
                                        profiles.stream()
                                                .noneMatch(
                                                        other ->
                                                                frontierPolicy.dominates(
                                                                        other, candidate, focuses)))
                        .toList();
        Map<String, GeneratedOptimizationVariant> selected = new LinkedHashMap<>();

        for (DRIF_BONUS_TYPE focus : focuses) {
            frontier.stream()
                    .filter(
                            candidate ->
                                    !candidate.state().signature().equals(mainState.signature()))
                    .filter(candidate -> frontierPolicy.improves(candidate, main, focus))
                    .filter(
                            candidate ->
                                    frontierPolicy.acceptableLoss(
                                            candidate, main, focus, trackedTypes, context))
                    .sorted(
                            Comparator.comparingDouble(
                                            (OptimizationVariantProfile candidate) ->
                                                    candidate.values().get(focus))
                                    .reversed()
                                    .thenComparing(candidate -> candidate.state().signature()))
                    .limit(CANDIDATES_PER_FOCUS)
                    .map(candidate -> new GeneratedOptimizationVariant(focus, candidate.state()))
                    .forEach(
                            variant ->
                                    selected.putIfAbsent(
                                            variant.focus().name()
                                                    + "|"
                                                    + variant.state().signature(),
                                            variant));
        }
        return new ArrayList<>(selected.values());
    }
}
