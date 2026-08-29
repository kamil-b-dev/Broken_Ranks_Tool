package pl.brokenranks.tool.broken_ranks_tool.optimization.engine.result;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;
import org.junit.jupiter.api.Test;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_BONUS_TYPE;
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.OptimizationSummary.PlacementChange;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model.BuildState;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.result.OptimizationVariantSelectionPolicy.Candidate;

class OptimizationVariantSelectionPolicyTests {
    private final OptimizationVariantSelectionPolicy policy =
            new OptimizationVariantSelectionPolicy();

    @Test
    void removesDominatedCandidatesAndKeepsBehaviorallyDifferentAlternatives() {
        Candidate best = candidate(10, 15, 1, change("helmet", "A", "B"), "best");
        Candidate dominated = candidate(10, 13, 2, change("helmet", "A", "B"), "dominated");
        Candidate diverse = candidate(10, 14, 0.25, change("weapon", "C", "D"), "diverse");

        List<Candidate> selected = policy.select(List.of(dominated, diverse, best));

        assertEquals(2, selected.size());
        assertTrue(selected.contains(best));
        assertTrue(selected.contains(diverse));
    }

    @Test
    void filtersCandidatesThatChangeTheSamePlacements() {
        Candidate stronger = candidate(10, 15, 1, change("helmet", "A", "B"), "a");
        Candidate similar = candidate(10, 16, 3, change("helmet", "A", "B"), "b");

        assertEquals(List.of(stronger), policy.select(List.of(stronger, similar)));
    }

    private Candidate candidate(
            double finalValue,
            double variantValue,
            double loss,
            PlacementChange change,
            String signature) {
        return new Candidate(
                DRIF_BONUS_TYPE.CRITICAL_CHANCE,
                finalValue,
                variantValue,
                loss,
                List.of(change),
                signature,
                new BuildState());
    }

    private PlacementChange change(String slot, String from, String to) {
        return new PlacementChange(slot, slot, from, 1, to, 1);
    }
}
