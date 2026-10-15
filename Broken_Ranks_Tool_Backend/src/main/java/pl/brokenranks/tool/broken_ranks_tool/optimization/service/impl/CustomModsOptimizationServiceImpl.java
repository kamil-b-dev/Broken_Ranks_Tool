package pl.brokenranks.tool.broken_ranks_tool.optimization.service.impl;

import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import pl.brokenranks.tool.broken_ranks_tool.equipment.dto.EquipmentRequest;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.calculator.input.OrbSelectionNormalizer;
import pl.brokenranks.tool.broken_ranks_tool.optimization.advisor.AdvisorOptimizationService;
import pl.brokenranks.tool.broken_ranks_tool.optimization.config.OptimizationProperties;
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.OptimizationMode;
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.OptimizationOutcome;
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.OptimizationRequest;
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.OptimizationResponse;
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.OptimizationSummary;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.context.OptimizationContextFactory;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model.BuildState;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model.OptimizationContext;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.result.BackpackDrifSubstitution;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.result.OptimizationResultAssembler;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.search.pipeline.OptimizationSearchPipeline;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.validation.OptimizationInputValidator;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.validation.OptimizationRequestValidator;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.variant.GeneratedOptimizationVariant;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.variant.OptimizationVariantGenerator;
import pl.brokenranks.tool.broken_ranks_tool.optimization.reorganization.ReorganizationSearch;
import pl.brokenranks.tool.broken_ranks_tool.optimization.service.ModsOptimizationService;
import pl.brokenranks.tool.broken_ranks_tool.optimization.simpleprofile.SimpleProfileConfigurationResolver;

/** Coordinates optimizer input, search execution, and API response assembly. */
@Service
@RequiredArgsConstructor
public class CustomModsOptimizationServiceImpl implements ModsOptimizationService {

    private final OptimizationProperties properties;
    private final OptimizationInputValidator inputValidator;
    private final OptimizationContextFactory contextFactory;
    private final OptimizationSearchPipeline searchPipeline;
    private final OptimizationResultAssembler resultAssembler;
    private final OptimizationVariantGenerator variantGenerator;
    private final AdvisorOptimizationService advisor;
    private final ReorganizationSearch reorganization;

    /**
     * Builds the best equipment configuration within the requested priorities,
     * quantity targets, caps, capacity limits, and locks.
     * @param request Optimization request from the client.
     * @return Optimized setup, summary, or a business error response when constraints cannot be met.
     */
    @Override
    public OptimizationResponse optimize(OptimizationRequest request) {
        long startTime = System.nanoTime();
        String profileError =
                request == null ? null : SimpleProfileConfigurationResolver.resolve(request);
        if (profileError != null) {
            return failedResponse(profileError, elapsedSeconds(startTime));
        }
        String requestError = OptimizationRequestValidator.validate(request);
        if (requestError != null) {
            return failedResponse(requestError, elapsedSeconds(startTime));
        }

        request.setOriginalSlots(OrbSelectionNormalizer.normalizeSlots(request.getOriginalSlots()));
        if (request.getMode() == OptimizationMode.ADVISOR) return advisor.optimize(request);

        OptimizationContext context = createContext(request);
        String inputError = inputValidator.validate(context);
        if (inputError == null && request.getMode() == OptimizationMode.REORGANIZE)
            inputError = reorganization.validateSupply(context);
        if (inputError != null) {
            return failedResponse(inputError, elapsedSeconds(startTime));
        }
        if (context.slots().isEmpty()) {
            return failedResponse(
                    "Brak poprawnie skonfigurowanych przedmiotów do optymalizacji.",
                    elapsedSeconds(startTime));
        }

        OptimizationSearchPipeline.PipelineResult searchResult =
                request.getMode() == OptimizationMode.REORGANIZE
                        ? reorganization.optimize(context)
                        : searchPipeline.optimize(context);
        if (searchResult == null) {
            OptimizationResponse failed =
                    failedResponse(
                            "Nie znaleziono układu spełniającego ustawienia w tym przebiegu. Sprawdź limity liczby i rozmiarów drifów oraz blokady.",
                            elapsedSeconds(startTime));
            failed.getSummary().setOutcome(OptimizationOutcome.NO_BUILD_FOUND);
            failed.getSummary()
                    .setSearchReport(context.calculatorSession().metrics().report(context));
            return failed;
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
            OptimizationResponse failed =
                    failedResponse(validationError, elapsedSeconds(startTime));
            failed.getSummary().setOutcome(OptimizationOutcome.NO_BUILD_FOUND);
            failed.getSummary()
                    .setSearchReport(context.calculatorSession().metrics().report(context));
            return failed;
        }

        EquipmentRequest targetSetup = null;
        List<OptimizationResponse.BackpackDrifUsage> backpackUsages = null;
        if (context.request().isBackpackOnly()) {
            targetSetup = resultAssembler.toSetup(state, context);
            long substitutionStarted = System.nanoTime();
            var substitution = BackpackDrifSubstitution.apply(state, context, resultAssembler);
            state = substitution.state();
            backpackUsages = substitution.usages();
            context.calculatorSession()
                    .metrics()
                    .recordStage("backpackSubstitution", substitutionStarted, context);
        }
        EquipmentRequest optimizedSetup = resultAssembler.toSetup(state, context);
        List<String> forcedCapWarnings = resultAssembler.forcedCapWarnings(state, context);
        long variantsStarted = System.nanoTime();
        List<GeneratedOptimizationVariant> variants =
                context.request().isGenerateVariants()
                        ? variantGenerator.generate(state, context, searchResult.evaluatedStates())
                        : List.of();
        context.calculatorSession().metrics().recordStage("variants", variantsStarted, context);
        long finalStarted = System.nanoTime();
        OptimizationSummary summary =
                resultAssembler.createSummary(
                        state, context, elapsedSeconds(startTime), forcedCapWarnings, variants);
        context.calculatorSession()
                .metrics()
                .recordStage("finalVerification", finalStarted, context);
        summary.setOutcome(
                summary.isSuccess()
                        ? OptimizationOutcome.VALID_BUILD
                        : OptimizationOutcome.VALID_BUILD_SOFT_TARGETS_UNMET);
        summary.setSearchReport(context.calculatorSession().metrics().report(context));
        OptimizationResponse response =
                new OptimizationResponse(
                        optimizedSetup,
                        summary,
                        summary.getNextVariants().getFirst().calculationResult());
        response.setTargetSetup(targetSetup);
        response.setBackpackDrifUsages(backpackUsages);
        if (context.request().getMode() == OptimizationMode.REORGANIZE) {
            response.setReorganizationDrifUsages(reorganization.usages(state, context));
        }
        if (backpackUsages != null) {
            summary.setMessage(
                    backpackUsages.isEmpty()
                            ? "Nie znaleziono pasujących drifów w plecaku; zachowano docelowy układ."
                            : "Użyto "
                                    + backpackUsages.size()
                                    + " drifów z plecaka z zachowaniem ich poziomów. Docelowy układ wskazuje dalsze ulepszenia.");
        }
        return response;
    }

    private OptimizationResponse failedResponse(String message, double seconds) {
        OptimizationResponse response =
                new OptimizationResponse(
                        new EquipmentRequest(),
                        new OptimizationSummary(
                                false, message, 0, 0, seconds, List.of(), Map.of(), List.of(),
                                List.of()));
        response.getSummary().setOutcome(OptimizationOutcome.INVALID_INPUT);
        return response;
    }

    private double elapsedSeconds(long startTime) {
        return (System.nanoTime() - startTime) / 1_000_000_000.0;
    }
}
