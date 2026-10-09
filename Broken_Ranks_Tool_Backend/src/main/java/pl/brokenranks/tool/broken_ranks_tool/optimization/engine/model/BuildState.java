package pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

/** Mutable candidate equipment state with a lazily cached stable signature. */
public final class BuildState {
    private final Map<String, List<Placement>> slots = new HashMap<>();
    private final Map<String, List<Placement>> slotViews = new HashMap<>();
    private final Map<String, List<Placement>> readOnlySlots =
            Collections.unmodifiableMap(slotViews);
    private String cachedSignature;

    public Map<String, List<Placement>> slots() {
        return readOnlySlots;
    }

    /** Replaces a slot with an owned copy, including null entries for empty sockets. */
    public void putSlot(String slotKey, List<Placement> placements) {
        Objects.requireNonNull(slotKey, "slotKey");
        List<Placement> owned = new ArrayList<>(placements);
        slots.put(slotKey, owned);
        slotViews.put(slotKey, Collections.unmodifiableList(owned));
        cachedSignature = null;
    }

    public BuildState copy() {
        BuildState copy = new BuildState();
        slots.forEach(copy::putSlot);
        copy.cachedSignature = cachedSignature;
        return copy;
    }

    public String signature() {
        if (cachedSignature == null) {
            cachedSignature =
                    slots.entrySet().stream()
                            .sorted(Map.Entry.comparingByKey())
                            .map(
                                    entry ->
                                            entry.getKey()
                                                    + ":"
                                                    + entry.getValue().stream()
                                                            .map(
                                                                    placement ->
                                                                            placement == null
                                                                                    ? "_"
                                                                                    : placement
                                                                                                    .drif()
                                                                                                    .getId()
                                                                                            + "@"
                                                                                            + placement
                                                                                                    .level())
                                                            .collect(Collectors.joining(",")))
                            .collect(Collectors.joining("|"));
        }
        return cachedSignature;
    }

    public void setPlacement(String slotKey, int index, Placement placement) {
        slots.get(slotKey).set(index, placement);
        cachedSignature = null;
    }
}
