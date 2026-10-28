package pl.brokenranks.tool.broken_ranks_tool.optimization.engine.evaluation;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static pl.brokenranks.tool.broken_ranks_tool.optimization.engine.evaluation.OptimizationBeamSelectionTests.*;

import com.sun.management.ThreadMXBean;
import java.lang.management.ManagementFactory;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import org.junit.jupiter.api.Test;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.rules.EquipmentRulesRegistry;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model.BuildState;
import tools.jackson.databind.json.JsonMapper;

/** Manual comparison of full sorting and bounded beam selection with the production cache limit. */
class OptimizationBeamSelectionPerformanceBenchmark {
    private final OptimizationStateEvaluator evaluator =
            new OptimizationStateEvaluator(new EquipmentRulesRegistry());
    private final ThreadMXBean threads = (ThreadMXBean) ManagementFactory.getThreadMXBean();

    @Test
    void comparesSelectionWorkAndChecksTheExactSelectedOrder() throws Exception {
        threads.setThreadAllocatedMemoryEnabled(true);
        threads.setThreadCpuTimeEnabled(true);
        var warmup = candidates(512);
        for (int index = 0; index < 6; index++) {
            select(warmup, false);
            select(warmup, true);
        }
        var report = new TreeMap<Integer, List<Map<String, Object>>>();
        for (int count : new int[] {256, 2048, 10000}) {
            var states = candidates(count);
            var samples = new ArrayList<Map<String, Object>>();
            for (int batch = 0; batch < 3; batch++) {
                Sample full;
                Sample bounded;
                if (batch % 2 == 0) {
                    full = select(states, false);
                    bounded = select(states, true);
                } else {
                    bounded = select(states, true);
                    full = select(states, false);
                }
                assertEquals(full.signatures(), bounded.signatures());
                samples.add(Map.of("fullSort", full, "boundedSelection", bounded));
                System.out.println(
                        "BEAM_SELECTION_BENCHMARK states="
                                + count
                                + " full="
                                + full
                                + " bounded="
                                + bounded);
            }
            report.put(count, samples);
        }
        JsonMapper.builder()
                .build()
                .writeValue(
                        java.nio.file.Path.of("target/beam-selection-benchmark.json").toFile(),
                        report);
    }

    private Sample select(List<BuildState> states, boolean bounded) {
        var context = contextForSelection();
        long threadId = Thread.currentThread().threadId();
        long allocated = threads.getThreadAllocatedBytes(threadId);
        long cpu = threads.getCurrentThreadCpuTime();
        long started = System.nanoTime();
        List<BuildState> selected;
        if (bounded) selected = evaluator.bestStates(states, 24, context);
        else {
            selected = new ArrayList<>(states);
            selected.sort(evaluator.stateComparator(context));
            selected = selected.subList(0, Math.min(24, selected.size()));
        }
        double wallMs = (System.nanoTime() - started) / 1_000_000.0;
        double cpuMs = (threads.getCurrentThreadCpuTime() - cpu) / 1_000_000.0;
        long bytes = threads.getThreadAllocatedBytes(threadId) - allocated;
        var metrics = context.calculatorSession().metrics().report(context);
        return new Sample(
                wallMs,
                cpuMs,
                bytes,
                metrics.evaluatedStates(),
                metrics.evaluationCacheHits(),
                selected.stream().map(BuildState::signature).toList());
    }

    private record Sample(
            double wallMs,
            double cpuMs,
            long bytes,
            long evaluations,
            long cacheHits,
            List<String> signatures) {}
}
