package pl.brokenranks.tool.broken_ranks_tool.optimization.service.impl;

import static org.junit.jupiter.api.Assertions.assertNull;

import java.nio.file.Path;
import java.time.Duration;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.rules.EquipmentRulesRegistry;
import pl.brokenranks.tool.broken_ranks_tool.equipment.persistence.repository.ItemTemplateRepository;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.context.OptimizationContextFactory;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.context.OptimizationInitialStateFactory;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.evaluation.OptimizationStateEvaluator;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.result.OptimizationResultAssembler;
import pl.brokenranks.tool.broken_ranks_tool.optimization.reference.CpSatBuildOptimizationSolver;
import pl.brokenranks.tool.broken_ranks_tool.optimization.reference.OptimizedBuildJsonExporter;
import pl.brokenranks.tool.broken_ranks_tool.optimization.reference.profile.FireMageEndgameFixture;
import tools.jackson.databind.ObjectMapper;

/** Manual oracle entry point for the reviewed Fire Mage endgame fixture. */
@SpringBootTest
class FireMageEndgameOracleBenchmark {
    @Autowired private ItemTemplateRepository items;
    @Autowired private OptimizationContextFactory contextFactory;
    @Autowired private OptimizationInitialStateFactory initialStates;
    @Autowired private OptimizationResultAssembler resultAssembler;
    @Autowired private EquipmentRulesRegistry rules;
    @Autowired private ObjectMapper objectMapper;

    @Test
    void searchesReviewedEndgameFixture() throws Exception {
        FireMageEndgameFixture fixture = new FireMageEndgameFixture(items);
        var request = fixture.request();
        var context = contextFactory.create(request, 1, 1, 1);
        var evaluator = new OptimizationStateEvaluator(rules);
        resultAssembler.calibrateCalculatorBaseline(initialStates.create(context), context);
        long seconds = Long.getLong("optimizer.fire-mage.seconds", 300L);
        var plan =
                new CpSatBuildOptimizationSolver.ObjectivePlan(
                        fixture.minimumValues(), fixture.maximizationOrder());
        var result =
                new CpSatBuildOptimizationSolver(rules, initialStates, evaluator)
                        .solve(context, Duration.ofSeconds(seconds), null, plan);

        System.out.printf(
                java.util.Locale.ROOT,
                "FIRE_MAGE_ORACLE status=%s elapsed_ms=%.2f objectives=%s "
                        + "incumbent=%s bound=%s%n",
                result.status(),
                result.elapsed().toNanos() / 1_000_000.0,
                result.objectiveValues(),
                result.incumbentObjective(),
                result.bestObjectiveBound());
        if (result.best() == null) return;

        assertNull(resultAssembler.validateFinalResult(result.best(), context));
        request.getPriorities()
                .keySet()
                .forEach(
                        type ->
                                System.out.printf(
                                        java.util.Locale.ROOT,
                                        "FIRE_MAGE_ORACLE type=%s value=%.6f count=%d%n",
                                        type,
                                        resultAssembler.actualValue(result.best(), type, context),
                                        evaluator.globalCount(result.best(), type, context)));
        Path output =
                Path.of(
                        System.getProperty(
                                "optimizer.fire-mage.output",
                                "target/fire-mage-endgame-candidate.json"));
        Path exported =
                new OptimizedBuildJsonExporter(objectMapper)
                        .export(output, resultAssembler.toSetup(result.best(), context));
        System.out.println("FIRE_MAGE_ORACLE build_json=" + exported);
    }
}
