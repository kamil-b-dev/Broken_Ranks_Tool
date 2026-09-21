package pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model;

import java.util.Map;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_BONUS_TYPE;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_SIZE;

/** Calculated search metrics for an equipment state. */
public record Metrics(
        Map<DRIF_BONUS_TYPE, Integer> counts,
        Map<DRIF_BONUS_TYPE, Integer> searchCounts,
        Map<DRIF_BONUS_TYPE, Map<DRIF_SIZE, Integer>> sizeCounts,
        Map<DRIF_BONUS_TYPE, Double> searchValues,
        int totalPower,
        int overflowPower,
        double capacityUtilization,
        double penaltyLoss) {}
