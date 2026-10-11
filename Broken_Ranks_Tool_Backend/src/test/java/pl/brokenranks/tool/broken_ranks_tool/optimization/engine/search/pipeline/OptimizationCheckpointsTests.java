package pl.brokenranks.tool.broken_ranks_tool.optimization.engine.search.pipeline;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model.OptimizationEngineFixture.*;

import java.util.List;
import org.junit.jupiter.api.Test;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_BONUS_TYPE;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.rules.EquipmentRulesRegistry;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.evaluation.OptimizationStateEvaluator;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model.*;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.result.OptimizationResultAssembler;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.search.construction.*;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.search.level.OptimizationLevelAllocator;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.search.maximization.OptimizationSelectedBonusMaximizer;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.search.neighborhood.*;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.search.refinement.OptimizationDeterministicRefiner;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.search.requirement.OptimizationRequirementSatisfier;

class OptimizationCheckpointsTests {
    private final OptimizationContext context = context(request(DRIF_BONUS_TYPE.CRITICAL_CHANCE));
    private final OptimizationResultAssembler assembler = mock(OptimizationResultAssembler.class);
    private final OptimizationStateEvaluator evaluator =
            new OptimizationStateEvaluator(new EquipmentRulesRegistry());

    private BuildState state(int level) {
        BuildState state = new BuildState();
        put(state, "helmet", new Placement(drif(1, DRIF_BONUS_TYPE.CRITICAL_CHANCE), level, false));
        return state;
    }

    private int level(BuildState state) {
        return state.slots().get("helmet").getFirst().level();
    }

    private OptimizationCheckpoints checkpoints() {
        when(assembler.actualValue(any(), any(), any()))
                .thenAnswer(call -> (double) level(call.getArgument(0)));
        when(assembler.validateFinalResult(any(), any()))
                .thenAnswer(call -> level(call.getArgument(0)) > 6 ? "invalid" : null);
        return new OptimizationCheckpoints(
                assembler, new OptimizationActualStateComparator(evaluator, assembler), context);
    }

    @Test
    void snapshotsSurviveMutationAndLaterInvalidOrWorseStates() {
        var checkpoints = checkpoints();
        BuildState original = state(6);
        checkpoints.remember(original);
        original.setPlacement(
                "helmet", 0, new Placement(drif(1, DRIF_BONUS_TYPE.CRITICAL_CHANCE), 1, false));
        checkpoints.remember(original);
        checkpoints.remember(state(99));
        checkpoints.remember(null);
        checkpoints.remember(state(6));
        assertEquals(List.of(6, 1), checkpoints.seeds().stream().map(this::level).toList());
        checkpoints
                .seeds()
                .getFirst()
                .setPlacement(
                        "helmet",
                        0,
                        new Placement(drif(1, DRIF_BONUS_TYPE.CRITICAL_CHANCE), 2, false));
        assertEquals(6, level(checkpoints.seeds().getFirst()));
    }

    @Test
    void calculatorRejectionNeverBecomesAFallback() {
        var checkpoints = checkpoints();
        doThrow(new IllegalArgumentException("invalid equipment"))
                .when(assembler)
                .actualValue(any(), any(), any());
        checkpoints.remember(state(6));
        assertTrue(checkpoints.seeds().isEmpty());
    }

    @Test
    void pipelineFeedsTheEarlierValidProfileToNeighborhoodAfterAnInPlaceRegression() {
        checkpoints();
        var greedy = mock(OptimizationGreedySearch.class);
        var filler = mock(OptimizationResidualCapacityFiller.class);
        var beam = mock(OptimizationBeamSearch.class);
        var levels = mock(OptimizationLevelAllocator.class);
        var targets = mock(OptimizationRequirementSatisfier.class);
        var refiner = mock(OptimizationDeterministicRefiner.class);
        var maximizer = mock(OptimizationSelectedBonusMaximizer.class);
        var neighborhood = mock(OptimizationLargeNeighborhoodSearch.class);
        when(greedy.buildInitialCandidate(context)).thenReturn(state(6));
        when(beam.selectBest(any(), any())).thenAnswer(call -> call.getArgument(0));
        when(levels.maximizeDrifSizes(any(), any())).thenAnswer(call -> call.getArgument(0));
        when(levels.allocateByPriority(any(), any())).thenAnswer(call -> call.getArgument(0));
        when(targets.removeRedundantForcedTargetDrifs(any(), any()))
                .thenAnswer(call -> call.getArgument(0));
        when(refiner.refine(any(), any())).thenAnswer(call -> call.getArgument(0));
        when(filler.fill(any(), any()))
                .thenAnswer(
                        call -> {
                            BuildState candidate = call.getArgument(0);
                            candidate.setPlacement(
                                    "helmet", 0, state(1).slots().get("helmet").getFirst());
                            return candidate;
                        });
        when(maximizer.maximize(any(), any())).thenAnswer(call -> call.getArgument(0));
        when(neighborhood.improve(org.mockito.ArgumentMatchers.<List<BuildState>>any(), any()))
                .thenAnswer(
                        call -> {
                            List<BuildState> seeds = call.getArgument(0);
                            assertEquals(List.of(6, 1), seeds.stream().map(this::level).toList());
                            return new OptimizationLargeNeighborhoodSearch.SearchResult(
                                    seeds.getFirst(), seeds);
                        });
        var pipeline =
                new OptimizationSearchPipeline(
                        greedy,
                        filler,
                        beam,
                        levels,
                        targets,
                        refiner,
                        maximizer,
                        neighborhood,
                        evaluator,
                        assembler);
        assertEquals(6, level(pipeline.optimize(context).best()));
    }
}
