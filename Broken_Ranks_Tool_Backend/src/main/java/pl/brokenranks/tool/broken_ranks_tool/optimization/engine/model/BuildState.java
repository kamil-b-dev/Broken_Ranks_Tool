package pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

/** Mutable candidate equipment state with a lazily cached stable signature. */
public final class BuildState {
    private final Map<String, List<Placement>> slots = new HashMap<>();
    private final Map<String, List<Placement>> slotViews = new HashMap<>();
    private final Map<String, List<Placement>> readOnlySlots =
            Collections.unmodifiableMap(slotViews);
    private String cachedSignature;
    private List<String> sortedSlotKeys;

    public Map<String, List<Placement>> slots() {
        return readOnlySlots;
    }

    /** Replaces a slot with an owned copy, including null entries for empty sockets. */
    public void putSlot(String slotKey, List<Placement> placements) {
        Objects.requireNonNull(slotKey, "slotKey");
        List<Placement> owned = new ArrayList<>(placements);
        if (slots.put(slotKey, owned) == null) sortedSlotKeys = null;
        slotViews.put(slotKey, Collections.unmodifiableList(owned));
        cachedSignature = null;
    }

    public BuildState copy() {
        BuildState copy = new BuildState();
        slots.forEach(copy::putSlot);
        copy.cachedSignature = cachedSignature;
        copy.sortedSlotKeys = sortedSlotKeys;
        return copy;
    }

    public String signature() {
        if (cachedSignature == null) {
            if (sortedSlotKeys == null) {
                sortedSlotKeys = slots.keySet().stream().sorted().toList();
            }
            StringBuilder signature = new StringBuilder(128);
            for (String key : sortedSlotKeys) {
                if (!signature.isEmpty()) signature.append('|');
                signature.append(key).append(':');
                List<Placement> placements = slots.get(key);
                for (int index = 0; index < placements.size(); index++) {
                    if (index > 0) signature.append(',');
                    Placement placement = placements.get(index);
                    if (placement == null) signature.append('_');
                    else {
                        Long id = placement.drif().getId();
                        if (id == null) signature.append("null");
                        else signature.append(id.longValue());
                        signature.append('@').append(placement.level());
                    }
                }
            }
            cachedSignature = signature.toString();
        }
        return cachedSignature;
    }

    public void setPlacement(String slotKey, int index, Placement placement) {
        slots.get(slotKey).set(index, placement);
        cachedSignature = null;
    }
}
