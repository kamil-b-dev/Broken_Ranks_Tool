package pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model.OptimizationEngineFixture.drif;

import com.sun.management.ThreadMXBean;
import java.lang.management.ManagementFactory;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_BONUS_TYPE;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_SIZE;
import tools.jackson.databind.json.JsonMapper;

/** Manual measurement of copying, one-socket mutation, and signature generation. */
class BuildStatePerformanceBenchmark {
    private static volatile long observed;

    @Test
    void measuresNeighborCreationAndChecksSignatures() throws Exception {
        var stone = drif(1, DRIF_BONUS_TYPE.CRITICAL_CHANCE);
        stone.setSize(DRIF_SIZE.ARCYDRIF);
        var other = drif(2, DRIF_BONUS_TYPE.DAMAGE_MAGIC);
        other.setSize(DRIF_SIZE.ARCYDRIF);
        var defense = drif(3, DRIF_BONUS_TYPE.DEFENSE_MENTAL);
        defense.setSize(DRIF_SIZE.ARCYDRIF);
        var state = new BuildState();
        for (String key :
                List.of(
                        "weapon",
                        "helmet",
                        "armor",
                        "legs",
                        "boots",
                        "gloves",
                        "cape",
                        "belt",
                        "ring1",
                        "ring2",
                        "necklace",
                        "shield")) {
            state.putSlot(
                    key,
                    List.of(
                            new Placement(stone, 6, false),
                            new Placement(other, 6, false),
                            new Placement(defense, 6, false)));
        }
        String original = state.signature();
        Placement[] alternatives = new Placement[21];
        for (int index = 0; index < alternatives.length; index++)
            alternatives[index] = new Placement(stone, index + 1, false);
        long expectedChecksum = 0;
        for (int index = 0; index < 50_000; index++) {
            expectedChecksum +=
                    original.replace("helmet:1@6,", "helmet:1@" + (index % 21 + 1) + ",")
                            .hashCode();
        }
        run(state, alternatives, 5000);
        var threads = (ThreadMXBean) ManagementFactory.getThreadMXBean();
        threads.setThreadAllocatedMemoryEnabled(true);
        threads.setThreadCpuTimeEnabled(true);
        long threadId = Thread.currentThread().threadId();
        var samples = new ArrayList<Map<String, Double>>();
        for (int batch = 0; batch < 5; batch++) {
            long allocated = threads.getThreadAllocatedBytes(threadId);
            long cpu = threads.getCurrentThreadCpuTime();
            long started = System.nanoTime();
            long checksum = run(state, alternatives, 50_000);
            samples.add(
                    Map.of(
                            "wallMicrosPerState",
                            (System.nanoTime() - started) / 50_000_000.0,
                            "cpuMicrosPerState",
                            (threads.getCurrentThreadCpuTime() - cpu) / 50_000_000.0,
                            "bytesPerState",
                            (threads.getThreadAllocatedBytes(threadId) - allocated) / 50_000.0));
            assertEquals(expectedChecksum, checksum);
        }
        assertEquals(original, state.signature());
        samples.sort(Comparator.comparingDouble(sample -> sample.get("cpuMicrosPerState")));
        System.out.println("BUILD_STATE_BENCHMARK median=" + samples.get(2));
        JsonMapper.builder()
                .build()
                .writeValue(
                        Path.of("target/build-state-benchmark.json").toFile(),
                        Map.of(
                                "samples",
                                samples,
                                "signature",
                                original,
                                "checksum",
                                expectedChecksum));
    }

    private long run(BuildState state, Placement[] alternatives, int count) {
        long checksum = 0;
        for (int index = 0; index < count; index++) {
            var candidate = state.copy();
            candidate.setPlacement("helmet", 0, alternatives[index % alternatives.length]);
            checksum += candidate.signature().hashCode();
        }
        observed = checksum;
        return checksum;
    }
}
