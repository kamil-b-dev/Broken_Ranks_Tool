package pl.brokenranks.tool.broken_ranks_tool.optimization.service.impl;

import static org.junit.jupiter.api.Assertions.assertNotNull;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.junit.jupiter.api.Assumptions;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_BONUS_TYPE;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.rules.EquipmentRulesRegistry;
import pl.brokenranks.tool.broken_ranks_tool.equipment.dto.EquipmentRequest;
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.BuildConfigurationMode;
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.OptimizationMode;
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.OptimizationRequest;
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.OptimizationResponse;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.context.OptimizationContextFactory;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.context.OptimizationInitialStateFactory;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.evaluation.OptimizationStateEvaluator;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model.BuildState;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model.OptimizationContext;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model.Placement;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.result.OptimizationResultAssembler;
import pl.brokenranks.tool.broken_ranks_tool.optimization.reference.CpSatBuildOptimizationSolver;
import pl.brokenranks.tool.broken_ranks_tool.optimization.reference.ExactBuildOptimizationSolver;
import pl.brokenranks.tool.broken_ranks_tool.optimization.reference.ExactOptimizationSolver;
import pl.brokenranks.tool.broken_ranks_tool.optimization.reference.OptimizedBuildJsonExporter;

/**
 * Manual exact-search adapter for exported real builds. It is skipped unless both file paths are
 * supplied. Example:
 *
 * <pre>
 * mvnw -Poracle-tests -Doptimizer.build=build.json -Doptimizer.config=priorytet.json test
 * </pre>
 */
@SpringBootTest
class OptimizationRealBuildExactBenchmark {

    @Autowired private ObjectMapper objectMapper;
    @Autowired private OptimizationContextFactory contextFactory;
    @Autowired private OptimizationInitialStateFactory initialStates;
    @Autowired private OptimizationResultAssembler resultAssembler;
    @Autowired private EquipmentRulesRegistry rules;
    @Autowired private CustomModsOptimizationServiceImpl heuristic;

    @Test
    void searchesAnExportedBuildWhenPathsAreProvided() throws Exception {
        String buildPath = System.getProperty("optimizer.build");
        String configPath = System.getProperty("optimizer.config");
        Assumptions.assumeTrue(
                buildPath != null && configPath != null,
                "Set -Doptimizer.build and -Doptimizer.config to run the real-build solver");

        OptimizationRequest request =
                request(Path.of(buildPath).toAbsolutePath(), Path.of(configPath).toAbsolutePath());
        OptimizationContext context = contextFactory.create(request, 1, 1, 1);
        OptimizationStateEvaluator evaluator = new OptimizationStateEvaluator(rules);
        ExactBuildOptimizationSolver solver =
                new ExactBuildOptimizationSolver(rules, evaluator, initialStates, resultAssembler);
        long maxStates = Long.getLong("optimizer.exact.max-states", 1_000_000L);
        long seconds = Long.getLong("optimizer.exact.seconds", 30L);

        resultAssembler.calibrateCalculatorBaseline(initialStates.create(context), context);
        OptimizationResponse heuristicResponse = heuristic.optimize(request);
        BuildState heuristicState = toState(heuristicResponse.getOptimizedSetup(), context);
        System.out.println(
                "OPTIMIZER_INITIAL counts="
                        + request.getPriorities().keySet().stream()
                                .collect(
                                        java.util.stream.Collectors.toMap(
                                                type -> type,
                                                type ->
                                                        evaluator.globalCount(
                                                                initialStates.create(context),
                                                                type,
                                                                context),
                                                (left, right) -> left,
                                                LinkedHashMap::new)));
        if (Boolean.parseBoolean(System.getProperty("optimizer.cp-sat", "true"))) {
            var cpSat =
                    new CpSatBuildOptimizationSolver(rules, initialStates, evaluator)
                            .solve(
                                    context,
                                    Duration.ofSeconds(seconds),
                                    heuristicState,
                                    provenObjectives(),
                                    fixedCounts(),
                                    Integer.getInteger("optimizer.cp-sat.objective-limit", 5));
            System.out.printf(
                    java.util.Locale.ROOT,
                    "OPTIMIZER_CP_SAT status=%s elapsed_ms=%.2f branches=%d conflicts=%d "
                            + "objectives=%s incumbent=%s bound=%s%n",
                    cpSat.status(),
                    cpSat.elapsed().toNanos() / 1_000_000.0,
                    cpSat.branches(),
                    cpSat.conflicts(),
                    cpSat.objectiveValues(),
                    cpSat.incumbentObjective(),
                    cpSat.bestObjectiveBound());
            if (cpSat.best() != null) {
                System.out.printf(
                        "OPTIMIZER_CP_SAT better_than_heuristic=%s optimum_proven=%s%n",
                        evaluator.isBetterState(cpSat.best(), heuristicState, context),
                        cpSat.optimumProven());
                System.out.println(
                        "OPTIMIZER_CP_SAT counts="
                                + request.getPriorities().keySet().stream()
                                        .collect(
                                                java.util.stream.Collectors.toMap(
                                                        type -> type,
                                                        type ->
                                                                evaluator.globalCount(
                                                                        cpSat.best(),
                                                                        type,
                                                                        context),
                                                        (left, right) -> left,
                                                        LinkedHashMap::new)));
                printPlacements(cpSat.best(), context);
                printComparison(heuristicState, cpSat.best(), context, evaluator);
                Path output = outputPath(Path.of(buildPath));
                new OptimizedBuildJsonExporter(objectMapper)
                        .export(
                                Path.of(buildPath),
                                output,
                                resultAssembler.toSetup(cpSat.best(), context));
                System.out.println("OPTIMIZER_CP_SAT build_json=" + output.toAbsolutePath());
            }
            if (Boolean.getBoolean("optimizer.cp-sat.verify-unrestricted")
                    && cpSat.best() != null
                    && !fixedCounts().isEmpty()) {
                var unrestricted =
                        new CpSatBuildOptimizationSolver(rules, initialStates, evaluator)
                                .solve(
                                        context,
                                        Duration.ofSeconds(seconds),
                                        cpSat.best(),
                                        provenObjectives(),
                                        Map.of(),
                                        5);
                System.out.printf(
                        java.util.Locale.ROOT,
                        "OPTIMIZER_CP_SAT_UNRESTRICTED status=%s elapsed_ms=%.2f "
                                + "objectives=%s incumbent=%s bound=%s optimum_proven=%s%n",
                        unrestricted.status(),
                        unrestricted.elapsed().toNanos() / 1_000_000.0,
                        unrestricted.objectiveValues(),
                        unrestricted.incumbentObjective(),
                        unrestricted.bestObjectiveBound(),
                        unrestricted.optimumProven());
            }
            String proofIndex = System.getProperty("optimizer.cp-sat.prove-objective-index");
            String proofIncumbent = System.getProperty("optimizer.cp-sat.prove-incumbent");
            if (proofIndex != null && proofIncumbent != null && cpSat.best() != null) {
                var proof =
                        new CpSatBuildOptimizationSolver(rules, initialStates, evaluator)
                                .proveNoBetter(
                                        context,
                                        Duration.ofSeconds(seconds),
                                        cpSat.best(),
                                        provenObjectives(),
                                        Integer.parseInt(proofIndex),
                                        Long.parseLong(proofIncumbent));
                System.out.printf(
                        "OPTIMIZER_CP_SAT_PROOF status=%s objectives=%s "
                                + "incumbent=%s bound=%s%n",
                        proof.status(),
                        proof.objectiveValues(),
                        proof.incumbentObjective(),
                        proof.bestObjectiveBound());
            }
            assertNotNull(heuristicResponse.getOptimizedSetup());
            return;
        }
        var exact =
                solver.solve(
                        context,
                        new ExactOptimizationSolver.Limits(Duration.ofSeconds(seconds), maxStates),
                        heuristicState);

        System.out.printf(
                java.util.Locale.ROOT,
                "OPTIMIZER_REAL_EXACT status=%s examined=%d search_space=%d elapsed_ms=%.2f "
                        + "alternatives=%s%n",
                exact.status(),
                exact.examinedStates(),
                exact.searchSpace(),
                exact.elapsed().toNanos() / 1_000_000.0,
                exact.alternatives());
        assertNotNull(heuristicResponse.getOptimizedSetup());
        if (exact.best() != null && exact.status() == ExactOptimizationSolver.Status.OPTIMAL) {
            System.out.printf(
                    "OPTIMIZER_REAL_EXACT heuristic_is_optimal=%s%n",
                    !evaluator.isBetterState(exact.best(), heuristicState, context));
        } else {
            System.out.println("OPTIMIZER_REAL_EXACT proof_unavailable=true");
        }
    }

    private void printPlacements(BuildState state, OptimizationContext context) {
        context.slots()
                .forEach(
                        slot -> {
                            String key = slot.key();
                            List<Placement> placements = state.slots().getOrDefault(key, List.of());
                            String rendered =
                                    placements.stream()
                                            .filter(java.util.Objects::nonNull)
                                            .map(
                                                    placement ->
                                                            "%s/%s/L%d"
                                                                    .formatted(
                                                                            placement
                                                                                    .drif()
                                                                                    .getBonusType(),
                                                                            placement
                                                                                    .drif()
                                                                                    .getSize(),
                                                                            placement.level()))
                                            .collect(java.util.stream.Collectors.joining(", "));
                            System.out.printf(
                                    "OPTIMIZER_CP_SAT slot=%s item=%s drifs=[%s]%n",
                                    key,
                                    slot.item() != null ? slot.item().getName() : "-",
                                    rendered);
                        });
    }

    private void printComparison(
            BuildState heuristicState,
            BuildState oracleState,
            OptimizationContext context,
            OptimizationStateEvaluator evaluator) {
        context.request()
                .getPriorities()
                .keySet()
                .forEach(
                        type -> {
                            System.out.printf(
                                    java.util.Locale.ROOT,
                                    "OPTIMIZER_COMPARISON type=%s heuristic_value=%.6f "
                                            + "oracle_value=%.6f delta=%.6f heuristic_count=%d "
                                            + "oracle_count=%d cap=%s%n",
                                    type,
                                    resultAssembler.actualValue(heuristicState, type, context),
                                    resultAssembler.actualValue(oracleState, type, context),
                                    resultAssembler.actualValue(oracleState, type, context)
                                            - resultAssembler.actualValue(
                                                    heuristicState, type, context),
                                    evaluator.globalCount(heuristicState, type, context),
                                    evaluator.globalCount(oracleState, type, context),
                                    type.getMaxCap());
                            if (context.request().getMaximizeBonuses().contains(type)) {
                                System.out.printf(
                                        java.util.Locale.ROOT,
                                        "OPTIMIZER_COMPARISON_MAXIMIZED type=%s scale=%.6f "
                                                + "heuristic_progress=%.6f oracle_progress=%.6f%n",
                                        type,
                                        evaluator.maximizationScale(type, context),
                                        resultAssembler.actualValue(heuristicState, type, context)
                                                / evaluator.maximizationScale(type, context),
                                        resultAssembler.actualValue(oracleState, type, context)
                                                / evaluator.maximizationScale(type, context));
                            }
                        });
    }

    private List<Long> provenObjectives() {
        String value = System.getProperty("optimizer.cp-sat.proven-objectives", "").trim();
        if (value.isEmpty()) return List.of();
        return java.util.Arrays.stream(value.split(","))
                .map(String::trim)
                .map(Long::parseLong)
                .toList();
    }

    private Path outputPath(Path buildPath) {
        String configured = System.getProperty("optimizer.output", "").trim();
        return configured.isEmpty()
                ? OptimizedBuildJsonExporter.defaultDestination(buildPath)
                : Path.of(configured).toAbsolutePath().normalize();
    }

    private Map<DRIF_BONUS_TYPE, Integer> fixedCounts() {
        String value = System.getProperty("optimizer.cp-sat.fixed-counts", "").trim();
        if (value.isEmpty()) return Map.of();
        Map<DRIF_BONUS_TYPE, Integer> result = new LinkedHashMap<>();
        for (String assignment : value.split(",")) {
            String[] parts = assignment.trim().split("=");
            if (parts.length != 2) {
                throw new IllegalArgumentException("Invalid fixed count: " + assignment);
            }
            result.put(DRIF_BONUS_TYPE.valueOf(parts[0].trim()), Integer.parseInt(parts[1].trim()));
        }
        return result;
    }

    private OptimizationRequest request(Path buildPath, Path configPath) throws Exception {
        JsonNode buildRoot = objectMapper.readTree(Files.readString(buildPath)).path("build");
        JsonNode requestData = buildRoot.path("requestData");
        JsonNode configRoot = objectMapper.readTree(Files.readString(configPath));
        Map<String, EquipmentRequest.SlotData> slots =
                objectMapper.convertValue(
                        requestData.path("slots"),
                        new TypeReference<Map<String, EquipmentRequest.SlotData>>() {});
        Map<String, Integer> characterStats =
                objectMapper.convertValue(
                        requestData.path("characterStats"),
                        new TypeReference<Map<String, Integer>>() {});

        Map<DRIF_BONUS_TYPE, Integer> priorities = new LinkedHashMap<>();
        Map<DRIF_BONUS_TYPE, OptimizationRequest.QuantityRange> quantities = new LinkedHashMap<>();
        Set<DRIF_BONUS_TYPE> caps = new LinkedHashSet<>();
        Set<DRIF_BONUS_TYPE> maximized = new LinkedHashSet<>();
        Map<DRIF_BONUS_TYPE, Double> percentages = new LinkedHashMap<>();
        for (JsonNode priority : configRoot.path("priorities")) {
            DRIF_BONUS_TYPE type = DRIF_BONUS_TYPE.valueOf(priority.path("key").asText());
            priorities.put(type, priority.path("weight").asInt());
            quantities.put(
                    type,
                    new OptimizationRequest.QuantityRange(
                            priority.path("min").asInt(), priority.path("max").asInt()));
            if (priority.path("forceCap").asBoolean()) caps.add(type);
            if (priority.path("maximize").asBoolean()) maximized.add(type);
            if (priority.path("forcePercentage").asBoolean()) {
                percentages.put(type, priority.path("forcedPercentage").asDouble());
            }
        }

        OptimizationRequest request = new OptimizationRequest();
        request.setMode(OptimizationMode.BUILD_FROM_SCRATCH);
        request.setConfigurationMode(BuildConfigurationMode.ADVANCED);
        request.setOriginalSlots(slots);
        request.setCharacterStats(characterStats);
        request.setPriorities(priorities);
        request.setTargetQuantities(quantities);
        request.setDrifSizeQuantities(Map.of());
        request.setForceCapBonuses(caps);
        request.setMaximizeBonuses(maximized);
        request.setForcedPercentageTargets(percentages);
        request.setLockedSlots(stringSet(buildRoot.path("lockedSlots")));
        request.setLockedDrifs(lockedDrifs(buildRoot.path("lockedDrifs")));
        request.setMaxVariantLossPercent(100);
        return request;
    }

    private Set<String> stringSet(JsonNode node) {
        Set<String> values = new LinkedHashSet<>();
        node.forEach(value -> values.add(value.asText()));
        return values;
    }

    private Map<String, Set<Integer>> lockedDrifs(JsonNode node) {
        Map<String, Set<Integer>> result = new LinkedHashMap<>();
        node.properties()
                .forEach(
                        entry -> {
                            Set<Integer> indexes = new LinkedHashSet<>();
                            entry.getValue().forEach(value -> indexes.add(value.asInt()));
                            result.put(entry.getKey(), indexes);
                        });
        return result;
    }

    private BuildState toState(EquipmentRequest setup, OptimizationContext context) {
        BuildState state = new BuildState();
        context.slots()
                .forEach(
                        slot -> {
                            EquipmentRequest.SlotData data = setup.getSlots().get(slot.key());
                            List<Placement> placements = new ArrayList<>();
                            for (int index = 0; index < slot.maxDrifs(); index++) {
                                Long id =
                                        data.getDrifIds() != null
                                                        && index < data.getDrifIds().size()
                                                ? data.getDrifIds().get(index)
                                                : null;
                                if (id == null) {
                                    placements.add(null);
                                    continue;
                                }
                                int level =
                                        data.getDrifLevels().getOrDefault(String.valueOf(index), 1);
                                placements.add(
                                        new Placement(context.drifs().get(id), level, false));
                            }
                            state.putSlot(slot.key(), placements);
                        });
        return state;
    }
}
