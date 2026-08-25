package pl.brokenranks.tool.broken_ranks_tool.optimization.engine.variant;

import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.evaluation.OptimizationStateEvaluator;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.result.OptimizationResultAssembler;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.search.neighborhood.OptimizationLargeNeighborhoodSearch;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model.GeneratedOptimizationVariant;

import lombok.RequiredArgsConstructor;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_BONUS_TYPE;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static pl.brokenranks.tool.broken_ranks_tool.optimization.engine.rules.OptimizationRequestConstraints.*;
import static pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model.OptimizationSearchModel.*;

/** Selects intentional trade-offs from states already verified by the main search. */
@RequiredArgsConstructor
public final class OptimizationVariantGenerator {

    private static final int MAX_ALTERNATIVES = 4;
    private static final int CANDIDATES_PER_FOCUS = 8;
    private static final int FALLBACK_SEARCH_STATES = 3_000;

    private final OptimizationLargeNeighborhoodSearch neighborhoodSearch;
    private final OptimizationStateEvaluator stateEvaluator;
    private final OptimizationResultAssembler resultAssembler;
    private final OptimizationVariantContextFactory contextFactory =
            new OptimizationVariantContextFactory();

    /**
     * Builds a Pareto frontier from calculator-verified states visited by the main LNS.
     * No additional neighborhood search is started solely for UI alternatives.
     */
    public List<GeneratedOptimizationVariant> generate(BuildState mainState, OptimizationContext context,
                                    List<BuildState> evaluatedStates) {
        if (context.request().getMaximizeBonuses() == null
                || context.request().getMaximizeBonuses().isEmpty()
                || evaluatedStates == null || evaluatedStates.isEmpty()) return List.of();

        List<DRIF_BONUS_TYPE> focuses = context.request().getMaximizeBonuses().stream()
                .sorted(Comparator.comparingInt((DRIF_BONUS_TYPE type) ->
                                context.request().getPriorities().getOrDefault(type, 0))
                        .reversed().thenComparing(Enum::name))
                .limit(MAX_ALTERNATIVES)
                .toList();
        List<DRIF_BONUS_TYPE> trackedTypes = context.request().getPriorities().keySet().stream()
                .sorted(Comparator.comparing(Enum::name))
                .toList();
        Map<String, CandidateProfile> unique = new LinkedHashMap<>();
        unique.put(mainState.signature(), profile(mainState, trackedTypes, context));
        for (BuildState state : evaluatedStates) {
            if (state == null || !stateEvaluator.minimumsSatisfied(state, context)
                    || !forcedCapsSatisfied(state, context)) continue;
            unique.computeIfAbsent(state.signature(),
                    ignored -> profile(state, trackedTypes, context));
        }

        CandidateProfile main = unique.get(mainState.signature());
        List<DRIF_BONUS_TYPE> missingFocuses = focuses.stream()
                .filter(focus -> !hasAcceptableCandidate(
                        new ArrayList<>(unique.values()), main, focus, trackedTypes, context))
                .toList();
        if (!missingFocuses.isEmpty()) {
            BuildState fallbackStart = contextFactory.withoutOptimizerPrelocks(mainState, context);
            for (DRIF_BONUS_TYPE focus : missingFocuses) {
                OptimizationContext profileContext = contextFactory.focusedContext(context, focus);
                OptimizationLargeNeighborhoodSearch.SearchResult fallback =
                        neighborhoodSearch.improve(
                                fallbackStart, profileContext, FALLBACK_SEARCH_STATES);
                for (BuildState state : fallback.evaluatedStates()) {
                    if (state == null || !stateEvaluator.minimumsSatisfied(state, context)
                            || !forcedCapsSatisfied(state, context)) continue;
                    unique.computeIfAbsent(state.signature(),
                            ignored -> profile(state, trackedTypes, context));
                }
            }
        }

        List<CandidateProfile> profiles = new ArrayList<>(unique.values());
        List<CandidateProfile> frontier = profiles.stream()
                .filter(candidate -> profiles.stream()
                        .noneMatch(other -> dominates(other, candidate, focuses)))
                .toList();
        Map<String, GeneratedOptimizationVariant> selected = new LinkedHashMap<>();

        for (DRIF_BONUS_TYPE focus : focuses) {
            frontier.stream()
                    .filter(candidate -> !candidate.state().signature().equals(mainState.signature()))
                    .filter(candidate -> candidate.values().get(focus)
                            > main.values().get(focus) + TARGET_TOLERANCE)
                    .filter(candidate -> acceptableLoss(
                            candidate, main, focus, trackedTypes, context))
                    .sorted(Comparator
                            .comparingDouble((CandidateProfile candidate) ->
                                    candidate.values().get(focus)).reversed()
                            .thenComparing(candidate -> candidate.state().signature()))
                    .limit(CANDIDATES_PER_FOCUS)
                    .map(candidate -> new GeneratedOptimizationVariant(focus, candidate.state()))
                    .forEach(variant -> selected.putIfAbsent(
                            variant.focus().name() + "|" + variant.state().signature(), variant));
        }
        return new ArrayList<>(selected.values());
    }

    private boolean hasAcceptableCandidate(List<CandidateProfile> profiles,
                                           CandidateProfile main, DRIF_BONUS_TYPE focus,
                                           List<DRIF_BONUS_TYPE> trackedTypes,
                                           OptimizationContext context) {
        return profiles.stream().anyMatch(candidate -> candidate != main
                && candidate.values().get(focus) > main.values().get(focus) + TARGET_TOLERANCE
                && acceptableLoss(candidate, main, focus, trackedTypes, context));
    }

    private CandidateProfile profile(BuildState state, List<DRIF_BONUS_TYPE> trackedTypes,
                                     OptimizationContext context) {
        Map<DRIF_BONUS_TYPE, Double> values = new LinkedHashMap<>();
        for (DRIF_BONUS_TYPE type : trackedTypes) {
            values.put(type, resultAssembler.actualValue(state, type, context));
        }
        return new CandidateProfile(state, values);
    }

    private boolean forcedCapsSatisfied(BuildState state, OptimizationContext context) {
        for (DRIF_BONUS_TYPE type : context.request().getPriorities().keySet()) {
            if (!isForcedTarget(type, context.request())) continue;
            Double target = targetFor(type, context.request());
            if (target != null && resultAssembler.actualValue(state, type, context)
                    < target - TARGET_TOLERANCE) return false;
        }
        return true;
    }

    private boolean dominates(CandidateProfile left, CandidateProfile right,
                              List<DRIF_BONUS_TYPE> focuses) {
        if (left == right) return false;
        boolean noWorse = focuses.stream().allMatch(type ->
                left.values().get(type) >= right.values().get(type) - TARGET_TOLERANCE);
        boolean better = focuses.stream().anyMatch(type ->
                left.values().get(type) > right.values().get(type) + TARGET_TOLERANCE);
        return noWorse && better;
    }

    private boolean acceptableLoss(CandidateProfile candidate, CandidateProfile main,
                                   DRIF_BONUS_TYPE focus,
                                   List<DRIF_BONUS_TYPE> trackedTypes,
                                   OptimizationContext context) {
        for (DRIF_BONUS_TYPE type : trackedTypes) {
            if (type == focus) continue;
            double mainValue = main.values().get(type);
            double allowedLoss = Math.max(1.0, Math.abs(mainValue))
                    * maxVariantRelativeLoss(context.request());
            if (candidate.values().get(type) < mainValue - allowedLoss - TARGET_TOLERANCE) return false;
        }
        return true;
    }

    private record CandidateProfile(BuildState state, Map<DRIF_BONUS_TYPE, Double> values) { }

}
