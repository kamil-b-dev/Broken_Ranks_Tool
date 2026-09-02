package pl.brokenranks.tool.broken_ranks_tool.optimization.service.impl;

import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import pl.brokenranks.tool.broken_ranks_tool.equipment.dto.EquipmentRequest;
import pl.brokenranks.tool.broken_ranks_tool.optimization.config.OptimizationProperties;
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.OptimizationRequest;
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.OptimizationResponse;
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.OptimizationSummary;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.context.OptimizationContextFactory;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model.BuildState;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model.OptimizationContext;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.result.OptimizationResultAssembler;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.search.pipeline.OptimizationSearchPipeline;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.validation.OptimizationRequestValidator;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.variant.GeneratedOptimizationVariant;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.variant.OptimizationVariantGenerator;
import pl.brokenranks.tool.broken_ranks_tool.optimization.service.ModsOptimizationService;

/** Coordinates optimizer input, search execution, and API response assembly. */
@Service
@RequiredArgsConstructor
public class CustomModsOptimizationServiceImpl implements ModsOptimizationService {

    private final OptimizationProperties properties;
    private final OptimizationContextFactory contextFactory;
    private final OptimizationSearchPipeline searchPipeline;
    private final OptimizationResultAssembler resultAssembler;
    private final OptimizationVariantGenerator variantGenerator;

    /**
     * Builds the best equipment configuration within the requested priorities,
     * quantity targets, caps, capacity limits, and locks.
     * @param request Optimization request from the client.
     * @return Optimized setup, summary, or a business error response when constraints cannot be met.
     */
    @Override
    public OptimizationResponse optimize(OptimizationRequest request) {
        long startTime = System.nanoTime();
        String requestError = OptimizationRequestValidator.validate(request);
        if (requestError != null) {
            return failedResponse(requestError, elapsedSeconds(startTime));
        }

        OptimizationContext context = createContext(request);
        if (context.slots().isEmpty()) {
            return failedResponse(
                    "Brak poprawnie skonfigurowanych przedmiotów do optymalizacji.",
                    elapsedSeconds(startTime));
        }

        OptimizationSearchPipeline.PipelineResult searchResult = searchPipeline.optimize(context);
        if (searchResult == null) {
            return failedResponse(
                    "Nie można spełnić limitów ilościowych przy obecnych blokadach, slotach i pojemności.",
                    elapsedSeconds(startTime));
        }
        return successfulResponse(searchResult, context, startTime);
    }

    /** Retained as a package-level seam for focused maximization tests. */
    BuildState maximizeSelectedBonuses(BuildState state, OptimizationContext context) {
        return searchPipeline.maximizeSelectedBonuses(state, context);
    }

    private OptimizationContext createContext(OptimizationRequest request) {
        return contextFactory.create(
                request,
                properties.beamSearchSteps(),
                properties.maximizationSearchSteps(),
                properties.refinementSearchSteps());
    }

    private OptimizationResponse successfulResponse(
            OptimizationSearchPipeline.PipelineResult searchResult,
            OptimizationContext context,
            long startTime) {
        BuildState state = searchResult.best();
        String validationError = resultAssembler.validateFinalResult(state, context);
        if (validationError != null) {
            return failedResponse(validationError, elapsedSeconds(startTime));
        }

        EquipmentRequest optimizedSetup = resultAssembler.toSetup(state, context);
        List<String> forcedCapWarnings = resultAssembler.forcedCapWarnings(state, context);
        List<GeneratedOptimizationVariant> variants =
                context.request().isGenerateVariants()
                        ? variantGenerator.generate(state, context, searchResult.evaluatedStates())
                        : List.of();
        OptimizationSummary summary =
                resultAssembler.createSummary(
                        state, context, elapsedSeconds(startTime), forcedCapWarnings, variants);
        return new OptimizationResponse(optimizedSetup, summary);
    }

    private OptimizationResponse failedResponse(String message, double seconds) {
        return new OptimizationResponse(
                new EquipmentRequest(),
                new OptimizationSummary(
                        false, message, 0, 0, seconds, List.of(), Map.of(), List.of(), List.of()));
    }

    private double elapsedSeconds(long startTime) {
        return (System.nanoTime() - startTime) / 1_000_000_000.0;
    }
}
