package pl.brokenranks.tool.broken_ranks_tool.optimization.reference;

import static org.junit.jupiter.api.Assertions.*;

import java.nio.file.Files;
import java.nio.file.Path;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.*;

class RealBuildOracleInputTests {
    @TempDir Path directory;

    @Test
    void retainsSizeConstraintsIncludingForbiddenSizes() throws Exception {
        var request = read("BUILD_FROM_SCRATCH", "ADVANCED");
        var sizes = request.getDrifSizeQuantities().get(DRIF_BONUS_TYPE.DAMAGE_MAGIC);
        assertEquals(1, sizes.get(DRIF_SIZE.SUBDRIF).getMin());
        assertEquals(1, sizes.get(DRIF_SIZE.SUBDRIF).getMax());
        assertEquals(0, sizes.get(DRIF_SIZE.ARCYDRIF).getMax());
        assertEquals(10, request.getPriorities().get(DRIF_BONUS_TYPE.DAMAGE_MAGIC));
    }

    @Test
    void rejectsUnsupportedModesInsteadOfSolvingAnotherProblem() {
        assertThrows(IllegalArgumentException.class, () -> read("ADVISOR", "ADVANCED"));
        assertThrows(IllegalArgumentException.class, () -> read("BUILD_FROM_SCRATCH", "SIMPLE"));
    }

    private pl.brokenranks.tool.broken_ranks_tool.optimization.dto.OptimizationRequest read(
            String mode, String configuration) throws Exception {
        var build = directory.resolve("build.json");
        var config = directory.resolve("config.json");
        Files.writeString(
                build,
                """
                {"build":{"requestData":{"slots":{},"characterStats":{}},"lockedSlots":[],"lockedDrifs":{}}}
                """);
        Files.writeString(
                config,
                """
                {"settings":{"mode":"%s","configurationMode":"%s"},"priorities":[{"key":"DAMAGE_MAGIC","weight":10,"min":1,"max":2,"sizeRanges":{"SUBDRIF":{"min":1,"max":1},"ARCYDRIF":{"min":0,"max":0}}}]}
                """
                        .formatted(mode, configuration));
        return new RealBuildOracleInput(new tools.jackson.databind.json.JsonMapper())
                .read(build, config);
    }
}
