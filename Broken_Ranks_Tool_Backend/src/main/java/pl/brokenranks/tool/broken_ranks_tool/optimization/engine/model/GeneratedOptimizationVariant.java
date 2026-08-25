package pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model;

import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_BONUS_TYPE;

import static pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model.OptimizationSearchModel.BuildState;

/** Search result prepared for presentation as an alternative optimization variant. */
public record GeneratedOptimizationVariant(DRIF_BONUS_TYPE focus, BuildState state) { }
