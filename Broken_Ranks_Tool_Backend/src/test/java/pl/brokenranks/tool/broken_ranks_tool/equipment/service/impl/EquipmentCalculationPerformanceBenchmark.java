package pl.brokenranks.tool.broken_ranks_tool.equipment.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;

import com.sun.management.ThreadMXBean;
import java.lang.management.ManagementFactory;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import pl.brokenranks.tool.broken_ranks_tool.equipment.dto.EquipmentRequest;
import pl.brokenranks.tool.broken_ranks_tool.equipment.persistence.repository.DrifTemplateRepository;
import pl.brokenranks.tool.broken_ranks_tool.equipment.persistence.repository.ItemTemplateRepository;
import pl.brokenranks.tool.broken_ranks_tool.equipment.persistence.repository.OrbTemplateRepository;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.EquipmentStatsCalculatorService;
import tools.jackson.databind.ObjectMapper;

/** Manual CPU/allocation benchmark; excluded from default Surefire test naming patterns. */
@SpringBootTest(properties = "spring.jpa.show-sql=false")
class EquipmentCalculationPerformanceBenchmark {
    @Autowired private EquipmentStatsCalculatorService calculator;
    @Autowired private ItemTemplateRepository items;
    @Autowired private DrifTemplateRepository drifs;
    @Autowired private OrbTemplateRepository orbs;
    @Autowired private ObjectMapper mapper;

    @Test
    void measuresPreparedArcherCalculations() throws Exception {
        var build =
                mapper.readTree(
                        getClass().getResourceAsStream("/optimization/archer-12-12-build.json"));
        var setup =
                mapper.treeToValue(build.path("build").path("requestData"), EquipmentRequest.class);
        var prepared =
                calculator.prepareNumericCalculation(
                        items.findAll().stream()
                                .collect(
                                        Collectors.toMap(
                                                item -> item.getId(), Function.identity())),
                        orbs.findAll().stream()
                                .collect(Collectors.toMap(orb -> orb.getId(), Function.identity())),
                        drifs.findAll().stream()
                                .collect(
                                        Collectors.toMap(
                                                drif -> drif.getId(), Function.identity())));
        var expected = calculator.calculateWithSources(setup).stats();
        assertEquals(expected, prepared.apply(setup).formatted());
        assertEquals(expected, calculator.calculateExplanation(setup).stats());
        for (int index = 0; index < 1000; index++) prepared.apply(setup);
        var threads = (ThreadMXBean) ManagementFactory.getThreadMXBean();
        threads.setThreadAllocatedMemoryEnabled(true);
        threads.setThreadCpuTimeEnabled(true);
        long threadId = Thread.currentThread().threadId();
        int iterations = 2000;
        var samples = new ArrayList<Map<String, Double>>();
        for (int batch = 0; batch < 5; batch++) {
            long allocated = threads.getThreadAllocatedBytes(threadId);
            long cpu = threads.getCurrentThreadCpuTime();
            long started = System.nanoTime();
            for (int index = 0; index < iterations; index++) {
                assertEquals(expected, prepared.apply(setup).formatted());
            }
            samples.add(
                    Map.of(
                            "wallMicrosPerCalculation",
                                    (System.nanoTime() - started) / 1000.0 / iterations,
                            "cpuMicrosPerCalculation",
                                    (threads.getCurrentThreadCpuTime() - cpu) / 1000.0 / iterations,
                            "bytesPerCalculation",
                                    (threads.getThreadAllocatedBytes(threadId) - allocated)
                                            / (double) iterations));
        }
        samples.sort(Comparator.comparingDouble(sample -> sample.get("cpuMicrosPerCalculation")));
        System.out.println("CALCULATOR_BENCHMARK median=" + samples.get(2));
        mapper.writeValue(
                java.nio.file.Path.of("target/calculator-benchmark.json").toFile(),
                Map.of("samples", samples, "stats", expected));
    }
}
