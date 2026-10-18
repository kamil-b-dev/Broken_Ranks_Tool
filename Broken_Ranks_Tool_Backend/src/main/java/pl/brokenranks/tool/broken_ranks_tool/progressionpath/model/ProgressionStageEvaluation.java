package pl.brokenranks.tool.broken_ranks_tool.progressionpath.model;

import java.util.Map;
import java.util.Set;
import pl.brokenranks.tool.broken_ranks_tool.equipment.dto.CalculationResultDto;

/** Validated statistics for one stage; this is not a proof of an executable path between stages. */
public record ProgressionStageEvaluation(ProgressionStage stage, CalculationResultDto calculation) {
    public ProgressionStageEvaluation {
        if (stage == null || calculation == null) {
            throw new IllegalArgumentException(
                    "Ocena etapu wymaga snapshotu i obliczonych statystyk.");
        }
        calculation =
                new CalculationResultDto(
                        Map.copyOf(calculation.stats()),
                        Map.copyOf(calculation.drifCategories()),
                        Set.copyOf(calculation.orbBonusTypes()));
    }
}
