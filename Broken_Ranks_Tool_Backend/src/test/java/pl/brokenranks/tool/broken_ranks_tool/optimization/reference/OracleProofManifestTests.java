package pl.brokenranks.tool.broken_ranks_tool.optimization.reference;

import static org.junit.jupiter.api.Assertions.*;
import static pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model.OptimizationEngineFixture.*;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_BONUS_TYPE;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.rules.EquipmentRulesRegistry;

class OracleProofManifestTests {
    @TempDir Path directory;

    @Test
    void rejectsOldOrDifferentProofsWithoutChangingTheirFiles() throws Exception {
        var path = directory.resolve("proof.csv");
        OracleProofManifest.initialize(path, "one", false);
        var before = Files.readString(path);
        OracleProofManifest.initialize(path, "one", true);
        assertThrows(
                IllegalStateException.class,
                () -> OracleProofManifest.initialize(path, "two", true));
        assertEquals(before, Files.readString(path));
        Files.writeString(path, "objective_index,incumbent\n0,1\n");
        assertThrows(
                IllegalStateException.class,
                () -> OracleProofManifest.initialize(path, "one", true));
    }

    @Test
    void bindsPrefixMinimumAndCatalogToTheProblem() throws Exception {
        var type = DRIF_BONUS_TYPE.DAMAGE_MAGIC;
        var stone = drif(1, type);
        var context = context(request(type), slot("helmet", 8, 1, 0, false, Set.of(), stone));
        var rules = new EquipmentRulesRegistry();
        var mapper = new tools.jackson.databind.json.JsonMapper();
        var plan = new CpSatBuildOptimizationSolver.ObjectivePlan(Map.of(type, 2.0), List.of(type));
        String original =
                OracleProofManifest.fingerprint(
                        mapper,
                        context,
                        rules,
                        plan,
                        List.of(1L),
                        1,
                        2L,
                        List.of("TOTAL_COUNT"),
                        Map.of(),
                        null);
        assertEquals(
                original,
                OracleProofManifest.fingerprint(
                        mapper,
                        context,
                        rules,
                        plan,
                        List.of(1L),
                        1,
                        2L,
                        List.of("TOTAL_COUNT"),
                        Map.of(),
                        null));
        assertNotEquals(
                original,
                OracleProofManifest.fingerprint(
                        mapper,
                        context,
                        rules,
                        plan,
                        List.of(2L),
                        1,
                        2L,
                        List.of("TOTAL_COUNT"),
                        Map.of(),
                        null));
        var changedPlan =
                new CpSatBuildOptimizationSolver.ObjectivePlan(Map.of(type, 3.0), List.of(type));
        assertNotEquals(
                original,
                OracleProofManifest.fingerprint(
                        mapper,
                        context,
                        rules,
                        changedPlan,
                        List.of(1L),
                        1,
                        2L,
                        List.of("TOTAL_COUNT"),
                        Map.of(),
                        null));
        stone.setBaseValue("3%");
        assertNotEquals(
                original,
                OracleProofManifest.fingerprint(
                        mapper,
                        context,
                        rules,
                        plan,
                        List.of(1L),
                        1,
                        2L,
                        List.of("TOTAL_COUNT"),
                        Map.of(),
                        null));
    }
}
