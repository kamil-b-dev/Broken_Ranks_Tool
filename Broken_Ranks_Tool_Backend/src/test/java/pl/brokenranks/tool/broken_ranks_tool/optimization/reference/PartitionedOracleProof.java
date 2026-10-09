package pl.brokenranks.tool.broken_ranks_tool.optimization.reference;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.time.Duration;
import java.util.*;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_BONUS_TYPE;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.rules.EquipmentRulesRegistry;

/** Executes, persists and resumes a recursive proof of a fully identified model. */
public final class PartitionedOracleProof {
    public void run(
            Task task,
            Path manifest,
            boolean resume,
            Map<DRIF_BONUS_TYPE, Integer> counts,
            Integer total,
            ObjectMapper mapper,
            EquipmentRulesRegistry rules)
            throws Exception {
        List<String> axes = recursiveProofAxes();
        String fingerprint =
                OracleProofManifest.fingerprint(
                        mapper,
                        task.context(),
                        rules,
                        task.objectivePlan(),
                        task.provenPrefix(),
                        task.proofIndex(),
                        task.incumbent(),
                        axes,
                        counts,
                        total);
        OracleProofManifest.initialize(manifest, fingerprint, resume);
        Set<String> proven =
                resume
                        ? loadProvenPartitions(manifest, task.proofIndex(), task.incumbent())
                        : new HashSet<>();
        recursiveProof(
                new ProofSearch(task, axes, manifest, proven),
                0,
                new ProofPartition(counts, Map.of(), Map.of(), total));
    }

    public record Task(
            CpSatBuildOptimizationSolver solver,
            pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model.OptimizationContext
                    context,
            pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model.BuildState hint,
            List<Long> provenPrefix,
            int proofIndex,
            long incumbent,
            CpSatBuildOptimizationSolver.ObjectivePlan objectivePlan) {}

    /** Session owns the accumulated proof cache; each recursive partition owns its count maps. */
    private record ProofSearch(
            Task task, List<String> axes, Path manifest, Set<String> provenPartitions) {}

    private record ProofPartition(
            Map<DRIF_BONUS_TYPE, Integer> counts,
            Map<CpSatBuildOptimizationSolver.SizeCount, Integer> sizeCounts,
            Map<CpSatBuildOptimizationSolver.SlotCount, Integer> slotCounts,
            Integer totalCount) {}

    private void recursiveProof(ProofSearch search, int depth, ProofPartition partition)
            throws Exception {
        var solver = search.task().solver();
        var context = search.task().context();
        var hint = search.task().hint();
        var provenPrefix = search.task().provenPrefix();
        int proofIndex = search.task().proofIndex();
        long incumbent = search.task().incumbent();
        var objectivePlan = search.task().objectivePlan();
        var axes = search.axes();
        var manifest = search.manifest();
        var provenPartitions = search.provenPartitions();
        var fixedCounts = partition.counts();
        var fixedSizeCounts = partition.sizeCounts();
        var fixedSlotCounts = partition.slotCounts();
        var fixedTotalCount = partition.totalCount();

        String partitionKey =
                proofPartitionKey(fixedTotalCount, fixedCounts, fixedSizeCounts, fixedSlotCounts);
        if (provenPartitions.contains(partitionKey)) return;
        if (partitionExceedsFixedCount(fixedCounts, fixedSizeCounts, fixedSlotCounts)) {
            var emptyPartition =
                    new CpSatBuildOptimizationSolver.Result(
                            CpSatBuildOptimizationSolver.Status.NO_BETTER_PROVEN,
                            null,
                            Duration.ZERO,
                            0,
                            0,
                            provenPrefix,
                            null,
                            null);
            appendProofResult(
                    manifest,
                    proofIndex,
                    incumbent,
                    fixedTotalCount,
                    fixedCounts,
                    fixedSizeCounts,
                    fixedSlotCounts,
                    emptyPartition);
            provenPartitions.add(partitionKey);
            return;
        }
        double seconds =
                depth == axes.size()
                        ? proofSeconds("optimizer.fire-mage.balanced.proof-leaf-seconds", 60.0)
                        : proofSeconds("optimizer.fire-mage.balanced.proof-node-seconds", 2.0);
        var result =
                solver.proveNoBetter(
                        context,
                        Duration.ofNanos(Math.max(1L, Math.round(seconds * 1_000_000_000.0))),
                        hint,
                        provenPrefix,
                        fixedCounts,
                        fixedSizeCounts,
                        fixedSlotCounts,
                        fixedTotalCount,
                        proofIndex,
                        incumbent,
                        objectivePlan);
        appendProofResult(
                manifest,
                proofIndex,
                incumbent,
                fixedTotalCount,
                fixedCounts,
                fixedSizeCounts,
                fixedSlotCounts,
                result);
        if (result.optimumProven()) provenPartitions.add(partitionKey);
        if (result.status() == CpSatBuildOptimizationSolver.Status.FEASIBLE) {
            throw new IllegalStateException(
                    "Recursive proof found a better build for "
                            + fixedTotalCount
                            + "/"
                            + fixedCounts);
        }
        if (result.optimumProven()) return;
        if (depth == axes.size()) {
            throw new IllegalStateException(
                    "Recursive proof left an unresolved leaf: "
                            + fixedTotalCount
                            + "/"
                            + fixedCounts);
        }

        String axis = axes.get(depth);
        int maximum = axis.equals("TOTAL_COUNT") ? 36 : axis.startsWith("SLOT:") ? 3 : 12;
        for (int value = 0; value <= maximum; value++) {
            Map<DRIF_BONUS_TYPE, Integer> childCounts = new LinkedHashMap<>(fixedCounts);
            Map<CpSatBuildOptimizationSolver.SizeCount, Integer> childSizeCounts =
                    new LinkedHashMap<>(fixedSizeCounts);
            Map<CpSatBuildOptimizationSolver.SlotCount, Integer> childSlotCounts =
                    new LinkedHashMap<>(fixedSlotCounts);
            Integer childTotal = fixedTotalCount;
            if (axis.equals("TOTAL_COUNT")) {
                childTotal = value;
            } else if (axis.startsWith("SIZE:")) {
                String[] parts = axis.split(":");
                if (parts.length != 3) {
                    throw new IllegalArgumentException("Invalid size proof axis: " + axis);
                }
                childSizeCounts.put(
                        new CpSatBuildOptimizationSolver.SizeCount(
                                DRIF_BONUS_TYPE.valueOf(parts[1]),
                                pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums
                                        .DRIF_SIZE.valueOf(parts[2])),
                        value);
            } else if (axis.startsWith("SLOT:")) {
                String[] parts = axis.split(":");
                if (parts.length != 3) {
                    throw new IllegalArgumentException("Invalid slot proof axis: " + axis);
                }
                childSlotCounts.put(
                        new CpSatBuildOptimizationSolver.SlotCount(
                                DRIF_BONUS_TYPE.valueOf(parts[1]), parts[2]),
                        value);
            } else {
                childCounts.put(DRIF_BONUS_TYPE.valueOf(axis), value);
            }
            recursiveProof(
                    search,
                    depth + 1,
                    new ProofPartition(childCounts, childSizeCounts, childSlotCounts, childTotal));
        }
    }

    private double proofSeconds(String property, double fallback) {
        double value = Double.parseDouble(System.getProperty(property, Double.toString(fallback)));
        if (!Double.isFinite(value) || value <= 0.0) {
            throw new IllegalArgumentException(property + " must be a positive finite number");
        }
        return value;
    }

    private boolean partitionExceedsFixedCount(
            Map<DRIF_BONUS_TYPE, Integer> fixedCounts,
            Map<CpSatBuildOptimizationSolver.SizeCount, Integer> fixedSizeCounts,
            Map<CpSatBuildOptimizationSolver.SlotCount, Integer> fixedSlotCounts) {
        for (var fixed : fixedCounts.entrySet()) {
            int sizeSum =
                    fixedSizeCounts.entrySet().stream()
                            .filter(entry -> entry.getKey().type() == fixed.getKey())
                            .mapToInt(Map.Entry::getValue)
                            .sum();
            int slotSum =
                    fixedSlotCounts.entrySet().stream()
                            .filter(entry -> entry.getKey().type() == fixed.getKey())
                            .mapToInt(Map.Entry::getValue)
                            .sum();
            if (sizeSum > fixed.getValue() || slotSum > fixed.getValue()) return true;
        }
        return false;
    }

    private Set<String> loadProvenPartitions(Path manifest, int objectiveIndex, long incumbent)
            throws Exception {
        Set<String> result = new HashSet<>();
        java.util.regex.Pattern row =
                java.util.regex.Pattern.compile(
                        "^(\\d+),(\\d+),([^,]*),\"([^\"]*)\",NO_BETTER_PROVEN,.*$");
        for (String line : Files.readAllLines(manifest, StandardCharsets.UTF_8)) {
            var match = row.matcher(line);
            if (match.matches()
                    && Integer.parseInt(match.group(1)) == objectiveIndex
                    && Long.parseLong(match.group(2)) == incumbent) {
                result.add(match.group(3) + "|" + match.group(4));
            }
        }
        return result;
    }

    private String proofPartitionKey(
            Integer totalCount,
            Map<DRIF_BONUS_TYPE, Integer> fixedCounts,
            Map<CpSatBuildOptimizationSolver.SizeCount, Integer> fixedSizeCounts,
            Map<CpSatBuildOptimizationSolver.SlotCount, Integer> fixedSlotCounts) {
        String counts =
                fixedCounts.entrySet().stream()
                        .map(entry -> entry.getKey() + "=" + entry.getValue())
                        .collect(java.util.stream.Collectors.joining(";"));
        String sizeCounts =
                fixedSizeCounts.entrySet().stream()
                        .map(
                                entry ->
                                        "SIZE:"
                                                + entry.getKey().type()
                                                + ":"
                                                + entry.getKey().size()
                                                + "="
                                                + entry.getValue())
                        .collect(java.util.stream.Collectors.joining(";"));
        String slotCounts =
                fixedSlotCounts.entrySet().stream()
                        .map(
                                entry ->
                                        "SLOT:"
                                                + entry.getKey().type()
                                                + ":"
                                                + entry.getKey().slot()
                                                + "="
                                                + entry.getValue())
                        .collect(java.util.stream.Collectors.joining(";"));
        return (totalCount == null ? "" : totalCount)
                + "|"
                + java.util.stream.Stream.of(counts, sizeCounts, slotCounts)
                        .filter(value -> !value.isEmpty())
                        .collect(java.util.stream.Collectors.joining(";"));
    }

    private void appendProofResult(
            Path manifest,
            int objectiveIndex,
            long incumbent,
            Integer totalCount,
            Map<DRIF_BONUS_TYPE, Integer> fixedCounts,
            Map<CpSatBuildOptimizationSolver.SizeCount, Integer> fixedSizeCounts,
            Map<CpSatBuildOptimizationSolver.SlotCount, Integer> fixedSlotCounts,
            CpSatBuildOptimizationSolver.Result result)
            throws Exception {
        String counts =
                proofPartitionKey(null, fixedCounts, fixedSizeCounts, fixedSlotCounts).substring(1);
        String line =
                String.format(
                        java.util.Locale.ROOT,
                        "%d,%d,%s,\"%s\",%s,%.2f%n",
                        objectiveIndex,
                        incumbent,
                        totalCount == null ? "" : totalCount,
                        counts,
                        result.status(),
                        result.elapsed().toNanos() / 1_000_000.0);
        Files.writeString(
                manifest,
                line,
                StandardCharsets.UTF_8,
                StandardOpenOption.CREATE,
                StandardOpenOption.APPEND);
        System.out.print("FIRE_MAGE_BALANCED_PROOF " + line);
    }

    private List<String> recursiveProofAxes() {
        String configured =
                System.getProperty(
                                "optimizer.fire-mage.balanced.proof-axes",
                                "TOTAL_COUNT,DOUBLE_ATTACK_CHANCE,CRITICAL_CHANCE,DAMAGE_REDUCTION,"
                                        + "DOUBLE_HIT_ROLL_CHANCE,HIT_CHANCE_RANGED,DODGE_CHANCE,"
                                        + "DAMAGE_REDUCTION_CHANCE,PASIVE_DAMAGE_REDUCTION,"
                                        + "PERCENTAGE_DAMAGE_REDUCTION")
                        .trim();
        List<String> result = new ArrayList<>();
        for (String axis : configured.split(",")) {
            String normalized = axis.trim();
            if (!normalized.isEmpty()) result.add(normalized);
        }
        return List.copyOf(result);
    }
}
