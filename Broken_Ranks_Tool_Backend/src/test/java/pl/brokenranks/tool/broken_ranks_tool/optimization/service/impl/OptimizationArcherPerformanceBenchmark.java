package pl.brokenranks.tool.broken_ranks_tool.optimization.service.impl;

import static org.junit.jupiter.api.Assertions.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.EntityManagerFactory;
import java.nio.file.Path;
import org.hibernate.SessionFactory;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import pl.brokenranks.tool.broken_ranks_tool.equipment.dto.EquipmentRequest;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.EquipmentStatsCalculatorService;
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.*;
import pl.brokenranks.tool.broken_ranks_tool.optimization.simpleprofile.*;

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
    @Autowired private EquipmentStatsCalculatorService calculator;
    @Autowired private EntityManagerFactory entityManagerFactory;

    @Test
    void optimizesExportedArcherBuild() throws Exception {
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
        System.out.println(
                "ARCHER_ADVANCED_BENCHMARK seconds="
                        + advancedResponse.getSummary().getExecutionTimeSeconds()
                        + " queries="
                        + statistics.getPrepareStatementCount());
        assertTrue(statistics.getPrepareStatementCount() < 50);
        assertEquals(response.getOptimizedSetup(), advancedResponse.getOptimizedSetup());
        assertEquals(response.getCalculationResult(), advancedResponse.getCalculationResult());
    }
}
