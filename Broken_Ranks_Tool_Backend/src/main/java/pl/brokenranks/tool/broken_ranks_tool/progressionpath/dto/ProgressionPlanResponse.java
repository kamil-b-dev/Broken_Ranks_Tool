package pl.brokenranks.tool.broken_ranks_tool.progressionpath.dto;

import java.util.List;
import java.util.Set;
import pl.brokenranks.tool.broken_ranks_tool.equipment.dto.CalculationResultDto;
import pl.brokenranks.tool.broken_ranks_tool.progressionpath.model.ProgressionDrif;
import pl.brokenranks.tool.broken_ranks_tool.progressionpath.model.ProgressionDrif.Position;
import pl.brokenranks.tool.broken_ranks_tool.progressionpath.model.ProgressionStage;

/** A complete verified statistical path; search metadata never claims economic optimality. */
public record ProgressionPlanResponse(
        String outcome,
        List<StageResult> stages,
        List<ProgressionDrif> remainingDrifs,
        List<String> warnings,
        SearchReport searchReport,
        Set<String> resSlots) {
    public ProgressionPlanResponse(
            String outcome,
            List<StageResult> stages,
            List<ProgressionDrif> remainingDrifs,
            List<String> warnings,
            SearchReport searchReport) {
        this(outcome, stages, remainingDrifs, warnings, searchReport, Set.of());
    }

    public record StageResult(
            ProgressionStage stage,
            CalculationResultDto calculation,
            List<Action> actions,
            List<String> equipmentChanges,
            List<Action> orbActions) {
        public StageResult(
                ProgressionStage stage,
                CalculationResultDto calculation,
                List<Action> actions,
                List<String> equipmentChanges) {
            this(stage, calculation, actions, equipmentChanges, List.of());
        }
    }

    public record Action(
            String type,
            String instanceId,
            Position from,
            Position to,
            Long beforeTemplateId,
            Integer beforeLevel,
            Long templateId,
            Integer level) {}

    public record SearchReport(
            String stopReason,
            int evaluatedCandidates,
            int beamWidth,
            long elapsedMillis,
            boolean proofComplete) {}
}
