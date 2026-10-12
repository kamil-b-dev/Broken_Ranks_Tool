package pl.brokenranks.tool.broken_ranks_tool.optimization.service.impl;

import static org.junit.jupiter.api.Assertions.*;

import jakarta.persistence.EntityManagerFactory;
import java.nio.file.Path;
import org.hibernate.SessionFactory;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_BONUS_TYPE;
import pl.brokenranks.tool.broken_ranks_tool.equipment.dto.EquipmentRequest;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.EquipmentStatsCalculatorService;
import pl.brokenranks.tool.broken_ranks_tool.optimization.advisor.AdvisorOptimizationService;
import pl.brokenranks.tool.broken_ranks_tool.optimization.cache.BoundedSearchCache;
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.*;
import pl.brokenranks.tool.broken_ranks_tool.optimization.simpleprofile.*;
import tools.jackson.databind.ObjectMapper;

/** Manual regression benchmark for the exported 12/12 Archer build. */
@SpringBootTest(
        properties = {
            "spring.jpa.show-sql=false",
            "spring.jpa.properties.hibernate.generate_statistics=true",
            "logging.level.org.hibernate.engine.internal.StatisticalLoggingSessionEventListener=OFF"
        })
class OptimizationArcherPerformanceBenchmark {
    @Autowired private ObjectMapper mapper;
    @Autowired private CustomModsOptimizationServiceImpl optimizer;
    @Autowired private AdvisorOptimizationService advisor;
    @Autowired private EquipmentStatsCalculatorService calculator;
    @Autowired private EntityManagerFactory entityManagerFactory;

    @Test
    void optimizesExportedArcherBuild() throws Exception {
        System.out.println(
                "ARCHER_BENCHMARK max_heap_mb=" + Runtime.getRuntime().maxMemory() / 1024 / 1024);
        int repetitions = Integer.getInteger("optimizer.memory.repetitions", 1);
        assertTrue(repetitions > 0);
        for (int index = 0; index < repetitions; index++) {
            optimizeExportedArcherBuild();
        }
    }

    private void optimizeExportedArcherBuild() throws Exception {
        var buildPath = System.getProperty("optimizer.build");
        var build =
                buildPath != null
                        ? mapper.readTree(Path.of(buildPath).toFile())
                        : mapper.readTree(
                                getClass()
                                        .getResourceAsStream(
                                                "/optimization/archer-12-12-build.json"));
        var setup =
                mapper.treeToValue(build.path("build").path("requestData"), EquipmentRequest.class);
        var request = new OptimizationRequest();
        request.setOriginalSlots(setup.getSlots());
        request.setCharacterStats(setup.getCharacterStats());
        request.setConfigurationMode(BuildConfigurationMode.SIMPLE);
        request.setSimpleProfile(SimpleBuildProfile.ARCHER);
        var options = new SimpleProfileOptions();
        options.setDamageDrifs(12);
        options.setAccuracyDrifs(12);
        options.setPercentageDamageReduction(true);
        options.setDamageReductionChance(true);
        request.setSimpleOptions(options);
        var statistics = entityManagerFactory.unwrap(SessionFactory.class).getStatistics();
        statistics.clear();
        var response = optimizer.optimize(request);
        assertBoundedCaches(response);
        System.out.println(
                "ARCHER_BENCHMARK seconds="
                        + response.getSummary().getExecutionTimeSeconds()
                        + " queries="
                        + statistics.getPrepareStatementCount());
        assertTrue(
                statistics.getPrepareStatementCount() < 50,
                "Search must reuse prepared catalog templates instead of querying per candidate");
        mapper.writeValue(Path.of("target/archer-result.json").toFile(), response);
        assertFalse(
                response.getOptimizedSetup().getSlots().isEmpty(),
                response.getSummary().getMessage());
        assertEquals(
                calculator.calculateWithSources(response.getOptimizedSetup()),
                response.getCalculationResult());
        var advanced = mapper.convertValue(request, OptimizationRequest.class);
        advanced.setConfigurationMode(BuildConfigurationMode.ADVANCED);
        advanced.setSimpleProfile(null);
        advanced.setSimpleOptions(null);
        statistics.clear();
        var advancedResponse = optimizer.optimize(advanced);
        assertBoundedCaches(advancedResponse);
        System.out.println(
                "ARCHER_ADVANCED_BENCHMARK seconds="
                        + advancedResponse.getSummary().getExecutionTimeSeconds()
                        + " queries="
                        + statistics.getPrepareStatementCount());
        assertTrue(statistics.getPrepareStatementCount() < 50);
        assertEquals(response.getOptimizedSetup(), advancedResponse.getOptimizedSetup());
        assertEquals(response.getCalculationResult(), advancedResponse.getCalculationResult());
        advanced.setGenerateVariants(true);
        var variantsResponse = optimizer.optimize(advanced);
        assertBoundedCaches(variantsResponse);
        assertEquals(response.getOptimizedSetup(), variantsResponse.getOptimizedSetup());
        assertEquals(response.getCalculationResult(), variantsResponse.getCalculationResult());
        for (var variant : variantsResponse.getSummary().getNextVariants()) {
            assertEquals(
                    calculator.calculateWithSources(variant.setup()), variant.calculationResult());
        }
        var advisorRequest = new OptimizationRequest();
        advisorRequest.setMode(OptimizationMode.ADVISOR);
        advisorRequest.setOriginalSlots(response.getOptimizedSetup().getSlots());
        advisorRequest.setCharacterStats(response.getOptimizedSetup().getCharacterStats());
        var advisorOptions = new AdvisorOptions();
        advisorOptions.setGoal(DRIF_BONUS_TYPE.CRITICAL_CHANCE);
        advisorOptions.setStrategy(AdvisorOptions.Strategy.BEST_RESULT);
        advisorOptions.setMaxActions(10);
        advisorOptions.setTimeBudgetMs(6000);
        advisorOptions.setPurchaseScope(AdvisorOptions.PurchaseScope.ANY);
        advisorOptions.getAllowedChanges().setItems(true);
        advisorOptions.getAllowedChanges().setDrifs(true);
        advisorOptions.getAllowedChanges().setDrifUpgrades(true);
        advisorRequest.setAdvisor(advisorOptions);
        var advisorResponse = advisor.optimize(advisorRequest);
        assertNotNull(advisorResponse.getAdvisorReport());
        assertTrue(advisorResponse.getAdvisorReport().evaluatedStates() > 0);
        assertEquals(response.getCalculationResult(), advisorResponse.getCalculationResult());
        for (var variant : advisorResponse.getSummary().getNextVariants()) {
            assertEquals(
                    calculator.calculateWithSources(variant.setup()), variant.calculationResult());
        }
        System.out.println(
                "ADVISOR_MEMORY_BENCHMARK evaluated_states="
                        + advisorResponse.getAdvisorReport().evaluatedStates()
                        + " status="
                        + advisorResponse.getAdvisorReport().status());
    }

    private void assertBoundedCaches(OptimizationResponse response) {
        var report = response.getSummary().getSearchReport();
        assertNotNull(report);
        assertTrue(report.peakEvaluationCacheEntries() <= 2 * BoundedSearchCache.MAX_EVALUATIONS);
        assertTrue(report.peakCalculatorCacheEntries() <= 2 * BoundedSearchCache.MAX_CALCULATIONS);
    }
}
