package pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model;

import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.DrifTemplate;

/** Drif assigned to an equipment position. */
public record Placement(DrifTemplate drif, int level, boolean locked) {}
