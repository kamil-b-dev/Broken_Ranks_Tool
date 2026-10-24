package pl.brokenranks.tool.broken_ranks_tool.equipment.dto;

import java.util.List;
import java.util.Map;

/** On-demand trace of the same authoritative calculation used by ordinary results. */
public record CalculationExplanationDto(
        Map<String, String> stats,
        Map<String, List<StatContributionDto>> contributions,
        Map<String, Integer> caps) {}
