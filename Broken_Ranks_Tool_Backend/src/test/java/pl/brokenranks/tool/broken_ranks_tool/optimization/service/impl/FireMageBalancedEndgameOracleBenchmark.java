package pl.brokenranks.tool.broken_ranks_tool.optimization.service.impl;

import static org.junit.jupiter.api.Assertions.assertNull;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_BONUS_TYPE;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.rules.EquipmentRulesRegistry;
import pl.brokenranks.tool.broken_ranks_tool.equipment.persistence.repository.ItemTemplateRepository;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.context.OptimizationContextFactory;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.context.OptimizationInitialStateFactory;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.evaluation.OptimizationStateEvaluator;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.result.OptimizationResultAssembler;
import pl.brokenranks.tool.broken_ranks_tool.optimization.reference.BuildStateJsonHintLoader;
import pl.brokenranks.tool.broken_ranks_tool.optimization.reference.CpSatBuildOptimizationSolver;
import pl.brokenranks.tool.broken_ranks_tool.optimization.reference.OptimizedBuildJsonExporter;
import pl.brokenranks.tool.broken_ranks_tool.optimization.reference.profile.FireMageBalancedEndgameFixture;
import pl.brokenranks.tool.broken_ranks_tool.optimization.referencebuild.OptimizationReferenceBuildRepository;

/** Manual oracle entry point for the balanced Fire Mage endgame fixture. */
@SpringBootTest
@EnabledIfSystemProperty(named = "optimizer.fire-mage.balanced.enabled", matches = "true")
class FireMageBalancedEndgameOracleBenchmark {
    @Autowired private ItemTemplateRepository items;
    @Autowired private OptimizationContextFactory contextFactory;
    @Autowired private OptimizationInitialStateFactory initialStates;
    @Autowired private OptimizationResultAssembler resultAssembler;
    @Autowired private EquipmentRulesRegistry rules;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private OptimizationReferenceBuildRepository referenceBuilds;

    @Test
    void searchesBalancedEndgameFixture() throws Exception {
        FireMageBalancedEndgameFixture fixture = new FireMageBalancedEndgameFixture(items);
        var request = fixture.request();
        var context = contextFactory.create(request, 1, 1, 1);
        var evaluator = new OptimizationStateEvaluator(rules);
        resultAssembler.calibrateCalculatorBaseline(initialStates.create(context), context);
        long seconds = Long.getLong("optimizer.fire-mage.balanced.seconds", 300L);
        List<Long> provenPrefix =
                Arrays.stream(
                                System.getProperty("optimizer.fire-mage.balanced.proven-prefix", "")
                                        .split(","))
                        .map(String::trim)
                        .filter(value -> !value.isEmpty())
                        .map(Long::valueOf)
                        .toList();
        var solver = new CpSatBuildOptimizationSolver(rules, initialStates, evaluator);
        if (Boolean.getBoolean("optimizer.fire-mage.balanced.print-count-partitions")) {
            System.out.printf(
                    "FIRE_MAGE_BALANCED_PARTITIONS regular_slots=%d%n",
                    context.slots().stream()
                            .filter(slot -> !slot.special())
                            .mapToInt(slot -> slot.maxDrifs())
                            .sum());
            fixture.defensiveTypes()
                    .forEach(
                            type ->
                                    System.out.printf(
                                            "FIRE_MAGE_BALANCED_PARTITIONS type=%s counts=%s%n",
                                            type,
                                            solver.countsWithUpperBoundAbove(
                                                    context, type, type.getMaxCap() * 0.575)));
            request.getForcedPercentageTargets()
                    .forEach(
                            (type, minimum) ->
                                    System.out.printf(
                                            "FIRE_MAGE_BALANCED_REQUIRED type=%s minimum=%s counts=%s%n",
                                            type,
                                            minimum,
                                            solver.countsWithUpperBoundAbove(
                                                    context, type, Math.nextDown(minimum))));
            System.out.printf(
                    "FIRE_MAGE_BALANCED_REQUIRED type=%s minimum=%s counts=%s%n",
                    DRIF_BONUS_TYPE.DAMAGE_MAGIC,
                    99.25,
                    solver.countsWithUpperBoundAbove(
                            context, DRIF_BONUS_TYPE.DAMAGE_MAGIC, Math.nextDown(99.25)));
            return;
        }
        String hintPath = System.getProperty("optimizer.fire-mage.balanced.hint", "").trim();
        var hint =
                !hintPath.isEmpty()
                        ? new BuildStateJsonHintLoader(objectMapper)
                                .load(Files.readString(Path.of(hintPath)), context)
                        : referenceBuilds
                                .findBySlugAndVersion("fire-mage-balanced", 1)
                                .map(
                                        reference -> {
                                            try {
                                                return new BuildStateJsonHintLoader(objectMapper)
                                                        .load(reference.getBuildJson(), context);
                                            } catch (Exception exception) {
                                                throw new IllegalStateException(
                                                        "Cannot load the stored balanced build as a hint",
                                                        exception);
                                            }
                                        })
                                .orElse(null);
        Integer proofIndex = Integer.getInteger("optimizer.fire-mage.balanced.proof-index");
        Long proofIncumbent = Long.getLong("optimizer.fire-mage.balanced.proof-incumbent");
        List<Integer> totalCountPartitions = totalCountPartitions();
        Integer fixedTotalCount =
                Integer.getInteger("optimizer.fire-mage.balanced.fixed-total-count");
        Map<DRIF_BONUS_TYPE, Integer> fixedCounts = fixedCounts();
        if (Boolean.getBoolean("optimizer.fire-mage.balanced.recursive-proof")) {
            if (proofIndex == null || proofIncumbent == null) {
                throw new IllegalArgumentException(
                        "Recursive proof requires proof-index and proof-incumbent");
            }
            Path manifest =
                    Path.of(
                            System.getProperty(
                                    "optimizer.fire-mage.balanced.proof-manifest",
                                    "target/fire-mage-balanced-proof.csv"));
            Files.createDirectories(manifest.toAbsolutePath().getParent());
            boolean resume = Boolean.getBoolean("optimizer.fire-mage.balanced.proof-resume");
            Set<String> provenPartitions =
                    resume && Files.exists(manifest)
                            ? loadProvenPartitions(manifest, proofIndex, proofIncumbent)
                            : new HashSet<>();
            if (!resume || !Files.exists(manifest)) {
                Files.writeString(
                        manifest,
                        "objective_index,incumbent,total_count,fixed_counts,status,elapsed_ms\n",
                        StandardCharsets.UTF_8);
            }
            recursiveProof(
                    new ProofSearch(
                            new ProofTask(
                                    solver,
                                    context,
                                    hint,
                                    provenPrefix,
                                    proofIndex,
                                    proofIncumbent,
                                    fixture.objectivePlan()),
                            recursiveProofAxes(),
                            manifest,
                            provenPartitions),
                    0,
                    new ProofPartition(fixedCounts, Map.of(), Map.of(), fixedTotalCount));
            return;
        }
        if (!totalCountPartitions.isEmpty()) {
            if (proofIndex == null || proofIncumbent == null) {
                throw new IllegalArgumentException(
                        "Total-count partitions require proof-index and proof-incumbent");
            }
            DRIF_BONUS_TYPE countPartitionType = countPartitionType();
            List<Integer> countPartitionValues = countPartitionValues(countPartitionType);
            for (Integer totalCount : totalCountPartitions) {
                for (Integer countValue : countPartitionValues) {
                    Map<DRIF_BONUS_TYPE, Integer> partitionCounts =
                            new LinkedHashMap<>(fixedCounts);
                    if (countPartitionType != null) {
                        partitionCounts.put(countPartitionType, countValue);
                    }
                    var partition =
                            solver.proveNoBetter(
                                    context,
                                    Duration.ofSeconds(seconds),
                                    hint,
                                    provenPrefix,
                                    partitionCounts,
                                    totalCount,
                                    proofIndex,
                                    proofIncumbent,
                                    fixture.objectivePlan());
                    System.out.printf(
                            java.util.Locale.ROOT,
                            "FIRE_MAGE_BALANCED_PARTITION total_count=%d %s status=%s elapsed_ms=%.2f%n",
                            totalCount,
                            countPartitionType == null ? "" : countPartitionType + "=" + countValue,
                            partition.status(),
                            partition.elapsed().toNanos() / 1_000_000.0);
                    if (partition.status() == CpSatBuildOptimizationSolver.Status.FEASIBLE) {
                        throw new IllegalStateException(
                                "Partition "
                                        + totalCount
                                        + "/"
                                        + countValue
                                        + " contains a better build");
                    }
                }
            }
            return;
        }
        var result =
                proofIndex == null || proofIncumbent == null
                        ? solver.solve(
                                context,
                                Duration.ofSeconds(seconds),
                                hint,
                                fixture.objectivePlan(),
                                provenPrefix)
                        : solver.proveNoBetter(
                                context,
                                Duration.ofSeconds(seconds),
                                hint,
                                provenPrefix,
                                fixedCounts,
                                fixedTotalCount,
                                proofIndex,
                                proofIncumbent,
                                fixture.objectivePlan());

        System.out.printf(
                java.util.Locale.ROOT,
                "FIRE_MAGE_BALANCED_ORACLE status=%s elapsed_ms=%.2f objectives=%s "
                        + "incumbent=%s bound=%s%n",
                result.status(),
                result.elapsed().toNanos() / 1_000_000.0,
                result.objectiveValues(),
                result.incumbentObjective(),
                result.bestObjectiveBound());
        if (result.best() == null) return;

        assertNull(resultAssembler.validateFinalResult(result.best(), context));
        System.out.println(
                "FIRE_MAGE_BALANCED_ORACLE exact_objectives="
                        + solver.objectiveValues(context, result.best(), fixture.objectivePlan()));
        request.getPriorities()
                .keySet()
                .forEach(
                        type ->
                                System.out.printf(
                                        java.util.Locale.ROOT,
                                        "FIRE_MAGE_BALANCED_ORACLE type=%s value=%.6f count=%d%n",
                                        type,
                                        resultAssembler.actualValue(result.best(), type, context),
                                        evaluator.globalCount(result.best(), type, context)));
        Path output =
                Path.of(
                        System.getProperty(
                                "optimizer.fire-mage.balanced.output",
                                "target/fire-mage-balanced-endgame-candidate.json"));
        Path exported =
                new OptimizedBuildJsonExporter(objectMapper)
                        .export(output, resultAssembler.toSetup(result.best(), context));
        System.out.println("FIRE_MAGE_BALANCED_ORACLE build_json=" + exported);
    }

    private record ProofTask(
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
            ProofTask task, List<String> axes, Path manifest, Set<String> provenPartitions) {}

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

    private Map<DRIF_BONUS_TYPE, Integer> fixedCounts() {
        String configured =
                System.getProperty("optimizer.fire-mage.balanced.fixed-counts", "").trim();
        if (configured.isEmpty()) return Map.of();
        Map<DRIF_BONUS_TYPE, Integer> result = new LinkedHashMap<>();
        for (String assignment : configured.split(",")) {
            String[] parts = assignment.trim().split("=");
            if (parts.length != 2) {
                throw new IllegalArgumentException("Invalid fixed count: " + assignment);
            }
            result.put(DRIF_BONUS_TYPE.valueOf(parts[0].trim()), Integer.parseInt(parts[1].trim()));
        }
        return result;
    }

    private List<Integer> totalCountPartitions() {
        return Arrays.stream(
                        System.getProperty(
                                        "optimizer.fire-mage.balanced.total-count-partitions", "")
                                .split(","))
                .map(String::trim)
                .filter(value -> !value.isEmpty())
                .map(Integer::valueOf)
                .toList();
    }

    private DRIF_BONUS_TYPE countPartitionType() {
        String configured =
                System.getProperty("optimizer.fire-mage.balanced.count-partition-type", "").trim();
        return configured.isEmpty() ? null : DRIF_BONUS_TYPE.valueOf(configured);
    }

    private List<Integer> countPartitionValues(DRIF_BONUS_TYPE type) {
        if (type == null) return List.of(0);
        List<Integer> values =
                Arrays.stream(
                                System.getProperty(
                                                "optimizer.fire-mage.balanced.count-partition-values",
                                                "")
                                        .split(","))
                        .map(String::trim)
                        .filter(value -> !value.isEmpty())
                        .map(Integer::valueOf)
                        .toList();
        if (values.isEmpty()) {
            throw new IllegalArgumentException("Count-partition values cannot be empty");
        }
        return values;
    }
}
