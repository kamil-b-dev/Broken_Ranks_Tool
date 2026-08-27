package pl.brokenranks.tool.broken_ranks_tool.equipment.dto;

import java.util.Map;
import java.util.Set;

/**
 * Returns calculated statistics together with the sources required to categorize them in the UI.
 * @param stats Formatted values keyed by statistic or bonus type.
 * @param drifCategories Category keyed by each drif bonus type included in the calculation.
 * @param orbBonusTypes Bonus types of orbs included in the calculation.
 */
public record CalculationResultDto(
        Map<String, String> stats, Map<String, String> drifCategories, Set<String> orbBonusTypes) {}
