package pl.brokenranks.tool.broken_ranks_tool.progressionpath.model;

import pl.brokenranks.tool.broken_ranks_tool.progressionpath.model.ProgressionDrif.Position;

/** Resource operations, with no assumption about their economic cost. */
public sealed interface ProgressionDrifOperation {
    /** Adds a newly obtained stone to storage, without reusing an existing instance ID. */
    record Acquire(ProgressionDrif drif) implements ProgressionDrifOperation {}

    /** Moves a stone from the expected location to an empty socket or to storage. */
    record Move(String instanceId, Position from, Position to)
            implements ProgressionDrifOperation {}

    /** Increases size and/or level of the same stone, preserving its bonus type and identity. */
    record Upgrade(String instanceId, long templateId, int level)
            implements ProgressionDrifOperation {}
}
