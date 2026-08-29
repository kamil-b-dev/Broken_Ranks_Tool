package pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model;

import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.DrifTemplate;

/** Candidate drif placement together with its search gain. */
public record PlacementChoice(DrifTemplate drif, int level, double gain) {}
