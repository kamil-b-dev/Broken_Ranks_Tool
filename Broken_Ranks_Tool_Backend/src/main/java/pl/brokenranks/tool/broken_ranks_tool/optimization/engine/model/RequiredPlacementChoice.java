package pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model;

import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.DrifTemplate;

/** Candidate placement selected to satisfy a required bonus. */
public record RequiredPlacementChoice(
        SlotContext slot, DrifTemplate drif, int level, double gain) {}
