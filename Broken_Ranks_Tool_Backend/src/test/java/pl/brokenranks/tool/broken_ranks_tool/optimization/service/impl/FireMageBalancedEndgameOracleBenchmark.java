package pl.brokenranks.tool.broken_ranks_tool.optimization.service.impl;

import static org.junit.jupiter.api.Assertions.assertNull;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
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
            new pl.brokenranks.tool.broken_ranks_tool.optimization.reference
                            .PartitionedOracleProof()
                    .run(
                            new pl.brokenranks.tool.broken_ranks_tool.optimization.reference
                                    .PartitionedOracleProof.Task(
                                    solver,
                                    context,
                                    hint,
                                    provenPrefix,
                                    proofIndex,
                                    proofIncumbent,
                                    fixture.objectivePlan()),
                            manifest,
                            Boolean.getBoolean("optimizer.fire-mage.balanced.proof-resume"),
                            fixedCounts,
                            fixedTotalCount,
                            objectMapper,
                            rules);
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
