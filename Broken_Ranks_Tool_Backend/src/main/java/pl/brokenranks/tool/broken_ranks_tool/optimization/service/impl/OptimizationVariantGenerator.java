package pl.brokenranks.tool.broken_ranks_tool.optimization.service.impl;

import lombok.RequiredArgsConstructor;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_BONUS_TYPE;
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.OptimizationRequest;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

import static pl.brokenranks.tool.broken_ranks_tool.optimization.service.impl.OptimizationRequestConstraints.*;
import static pl.brokenranks.tool.broken_ranks_tool.optimization.service.impl.OptimizationSearchModel.*;

/** Generates intentional trade-off profiles for the highest-priority maximized modifiers. */
@RequiredArgsConstructor
final class OptimizationVariantGenerator {

    private static final int MAX_ALTERNATIVES = 4;
    private static final int CANDIDATES_PER_FOCUS = 8;
    private static final int SEARCH_STATES_PER_PROFILE = 6_000;
    private static final double MAX_RELATIVE_LOSS = 0.05;

    private final OptimizationLargeNeighborhoodSearch neighborhoodSearch;
    private final OptimizationStateEvaluator stateEvaluator;
    private final OptimizationResultAssembler resultAssembler;

    List<GeneratedVariant> generate(BuildState mainState, OptimizationContext context) {
        if (context.request().getMaximizeBonuses() == null) return List.of();
        BuildState variantStart = withoutPrelocks(mainState, context);
        List<DRIF_BONUS_TYPE> focuses = context.request().getMaximizeBonuses().stream()
                .sorted(Comparator.comparingInt((DRIF_BONUS_TYPE type) ->
                                context.request().getPriorities().getOrDefault(type, 0))
                        .reversed().thenComparing(Enum::name))
                .limit(MAX_ALTERNATIVES)
                .toList();
        List<GeneratedVariant> result = new ArrayList<>();
        Set<String> signatures = new LinkedHashSet<>();
        signatures.add(mainState.signature());

        for (DRIF_BONUS_TYPE focus : focuses) {
            OptimizationContext profileContext = profileContext(context, focus);
            OptimizationLargeNeighborhoodSearch.SearchResult search = neighborhoodSearch.improve(
                    variantStart, profileContext, SEARCH_STATES_PER_PROFILE);
            search.evaluatedStates().stream()
                    .filter(candidate -> acceptable(candidate, mainState, context, focus))
                    .sorted(Comparator.comparingDouble((BuildState candidate) ->
                            resultAssembler.actualValue(candidate, focus, context)).reversed())
                    .filter(candidate -> signatures.add(candidate.signature()))
                    .limit(CANDIDATES_PER_FOCUS)
                    .map(candidate -> new GeneratedVariant(focus, candidate))
                    .forEach(result::add);
        }
        return result;
    }

    /** Releases optimizer-created prelocks while preserving explicit user locks. */
    private BuildState withoutPrelocks(BuildState mainState, OptimizationContext context) {
        BuildState released = mainState.copy();
        Set<String> lockedSlots = context.request().getLockedSlots() != null
                ? context.request().getLockedSlots() : Set.of();
        for (SlotContext slot : context.slots()) {
            List<Placement> placements = released.slots.get(slot.key());
            if (placements == null) continue;
            for (int index = 0; index < placements.size(); index++) {
                Placement placement = placements.get(index);
                if (placement == null || !placement.locked()) continue;
                boolean userLocked = lockedSlots.contains(slot.key())
                        || slot.lockedIndices().contains(index);
                if (!userLocked) {
                    released.setPlacement(slot.key(), index,
                            new Placement(placement.drif(), placement.level(), false));
                }
            }
        }
        return released;
    }

    private boolean acceptable(BuildState candidate, BuildState mainState,
                               OptimizationContext context, DRIF_BONUS_TYPE focus) {
        if (candidate.signature().equals(mainState.signature())
                || !stateEvaluator.minimumsSatisfied(candidate, context)) return false;
        double mainFocus = resultAssembler.actualValue(mainState, focus, context);
        double candidateFocus = resultAssembler.actualValue(candidate, focus, context);
        if (candidateFocus <= mainFocus + TARGET_TOLERANCE) return false;

        for (DRIF_BONUS_TYPE type : context.request().getMaximizeBonuses()) {
            if (type == focus) continue;
            double mainValue = resultAssembler.actualValue(mainState, type, context);
            double candidateValue = resultAssembler.actualValue(candidate, type, context);
            double allowedLoss = Math.max(1.0, Math.abs(mainValue)) * MAX_RELATIVE_LOSS;
            if (candidateValue < mainValue - allowedLoss - TARGET_TOLERANCE) return false;
        }
        for (DRIF_BONUS_TYPE type : context.request().getPriorities().keySet()) {
            if (!isForcedCap(type, context.request())) continue;
            Double target = targetFor(type, context.request());
            if (target != null && resultAssembler.actualValue(candidate, type, context)
                    < target - TARGET_TOLERANCE) return false;
        }
        return true;
    }

    private OptimizationContext profileContext(OptimizationContext source,
                                               DRIF_BONUS_TYPE focus) {
        OptimizationRequest request = copyRequest(source.request());
        request.setMaximizeBonuses(Set.of(focus));
        return new OptimizationContext(request, source.items(), source.drifs(), source.slots(),
                source.slotsByDrifBonus(), source.sortedPriorities(), source.sortedQuantities(),
                new SearchBudget(1), new SearchBudget(1), new SearchBudget(1),
                new EnumMap<>(source.calculatorBaseline()),
                new EnumMap<>(DRIF_BONUS_TYPE.class), source.calculatorCache(),
                new HashMap<>(), source.drifValueCache());
    }

    private OptimizationRequest copyRequest(OptimizationRequest source) {
        OptimizationRequest copy = new OptimizationRequest();
        copy.setOriginalSlots(source.getOriginalSlots());
        copy.setPriorities(source.getPriorities());
        copy.setTargetQuantities(source.getTargetQuantities());
        copy.setLockedSlots(source.getLockedSlots());
        copy.setLockedDrifs(source.getLockedDrifs());
        copy.setForceCapBonuses(source.getForceCapBonuses());
        copy.setMaximizeBonuses(source.getMaximizeBonuses() != null
                ? new LinkedHashSet<>(source.getMaximizeBonuses()) : Set.of());
        copy.setForceMaximizationByDrifBonus(source.isForceMaximizationByDrifBonus());
        copy.setGenerateVariants(source.isGenerateVariants());
        return copy;
    }

    record GeneratedVariant(DRIF_BONUS_TYPE focus, BuildState state) { }
}
