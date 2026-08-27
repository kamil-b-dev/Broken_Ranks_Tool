package pl.brokenranks.tool.broken_ranks_tool.optimization.engine.variant;

import static pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model.OptimizationSearchModel.BuildState;

import java.util.Map;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_BONUS_TYPE;

record OptimizationVariantProfile(BuildState state, Map<DRIF_BONUS_TYPE, Double> values) {}
