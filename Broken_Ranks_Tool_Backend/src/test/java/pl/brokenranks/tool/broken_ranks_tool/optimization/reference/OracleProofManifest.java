package pl.brokenranks.tool.broken_ranks_tool.optimization.reference;

import com.google.ortools.sat.CpSolver;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.util.*;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.rules.EquipmentRulesRegistry;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model.OptimizationContext;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

/** Binds resumable partition proofs to their complete inputs and compiled model implementation. */
public final class OracleProofManifest {
    private OracleProofManifest() {}

    public static String fingerprint(
            ObjectMapper mapper,
            OptimizationContext context,
            EquipmentRulesRegistry rules,
            CpSatBuildOptimizationSolver.ObjectivePlan plan,
            List<Long> prefix,
            int index,
            long incumbent,
            List<String> axes,
            Map<?, ?> rootCounts,
            Integer rootTotal)
            throws Exception {
        var digest = MessageDigest.getInstance("SHA-256");
        Map<String, Object> inputs = new TreeMap<>();
        inputs.put("schema", 1);
        inputs.put("request", context.request());
        inputs.put("items", context.items());
        inputs.put("drifs", context.drifs());
        inputs.put("slots", context.slots());
        inputs.put("baseline", context.calculatorBaseline());
        inputs.put("rules", rules);
        inputs.put(
                "penalties",
                java.util.stream.IntStream.rangeClosed(0, 12)
                        .mapToDouble(rules::getDrifPenalty)
                        .toArray());
        inputs.put("objectives", plan);
        inputs.put("provenPrefix", prefix);
        inputs.put("proofIndex", index);
        inputs.put("incumbent", incumbent);
        inputs.put("axes", axes);
        inputs.put("rootCounts", rootCounts);
        inputs.put("rootTotal", rootTotal);
        digest.update(mapper.writeValueAsBytes(canonical(mapper.valueToTree(inputs))));
        // Include all application/rule and test-oracle classes, plus the OR-Tools Java artifact.
        // Conservative invalidation is preferable to reusing a proof from a changed model.
        for (Class<?> implementation :
                List.of(
                        EquipmentRulesRegistry.class,
                        CpSatBuildOptimizationSolver.class,
                        CpSolver.class)) {
            Path location =
                    Path.of(
                            implementation
                                    .getProtectionDomain()
                                    .getCodeSource()
                                    .getLocation()
                                    .toURI());
            if (Files.isDirectory(location)) {
                try (var files = Files.walk(location)) {
                    for (Path file :
                            files.filter(Files::isRegularFile)
                                    .filter(path -> path.toString().endsWith(".class"))
                                    .sorted()
                                    .toList()) {
                        digest.update(
                                location.relativize(file)
                                        .toString()
                                        .replace('\\', '/')
                                        .getBytes(StandardCharsets.UTF_8));
                        digest.update(Files.readAllBytes(file));
                    }
                }
            } else digest.update(Files.readAllBytes(location));
        }
        return HexFormat.of().formatHex(digest.digest());
    }

    private static Object canonical(JsonNode node) {
        if (node.isObject()) {
            Map<String, Object> result = new TreeMap<>();
            node.properties()
                    .forEach(entry -> result.put(entry.getKey(), canonical(entry.getValue())));
            return result;
        }
        if (node.isArray()) {
            List<Object> result = new ArrayList<>();
            node.forEach(value -> result.add(canonical(value)));
            return result;
        }
        return node;
    }

    public static void initialize(Path manifest, String fingerprint, boolean resume)
            throws Exception {
        String header = "# problem-sha256=" + fingerprint;
        if (resume && Files.exists(manifest)) {
            try (var lines = Files.lines(manifest, StandardCharsets.UTF_8)) {
                if (!lines.findFirst().orElse("").equals(header)) {
                    throw new IllegalStateException(
                            "Cannot resume: proof manifest belongs to another problem or has no fingerprint. Use a new manifest path.");
                }
            }
            return;
        }
        Files.createDirectories(manifest.toAbsolutePath().getParent());
        Files.writeString(
                manifest,
                header + "\nobjective_index,incumbent,total_count,fixed_counts,status,elapsed_ms\n",
                StandardCharsets.UTF_8);
    }
}
