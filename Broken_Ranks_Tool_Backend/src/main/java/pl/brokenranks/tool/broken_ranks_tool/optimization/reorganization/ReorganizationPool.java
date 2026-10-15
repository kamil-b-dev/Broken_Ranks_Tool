package pl.brokenranks.tool.broken_ranks_tool.optimization.reorganization;

import java.util.*;
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.OptimizationResponse.ReorganizationDrifUsage;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model.*;

/** Keeps equipped and backpack occurrences separate while grouping interchangeable search choices. */
final class ReorganizationPool {
    record Stone(long templateId, int level) {
        static Stone of(Placement placement) {
            return new Stone(placement.drif().getId(), placement.level());
        }
    }

    record Source(Stone stone, String entryId, String slotKey, Integer index) {}

    record Position(SlotContext slot, int index) {}

    final List<Source> sources = new ArrayList<>();
    final Map<Stone, Integer> supply = new LinkedHashMap<>();
    final List<Position> positions = new ArrayList<>();
    final BuildState fixed = new BuildState();
    final BuildState original = new BuildState();

    ReorganizationPool(OptimizationContext context) {
        for (SlotContext slot : context.slots()) {
            List<Placement> fixedPlacements = new ArrayList<>();
            List<Placement> originalPlacements = new ArrayList<>();
            List<Long> ids =
                    slot.original().getDrifIds() == null ? List.of() : slot.original().getDrifIds();
            boolean fixedSlot =
                    slot.special()
                            || context.request().getLockedSlots() != null
                                    && context.request().getLockedSlots().contains(slot.key());
            int length = slot.special() ? ids.size() : slot.maxDrifs();
            for (int index = 0; index < length; index++) {
                boolean locked = fixedSlot || slot.lockedIndices().contains(index);
                Placement placement =
                        index >= ids.size() || ids.get(index) == null
                                ? null
                                : new Placement(
                                        context.drifs().get(ids.get(index)),
                                        slot.original().getDrifLevels() == null
                                                ? 1
                                                : slot.original()
                                                        .getDrifLevels()
                                                        .getOrDefault(String.valueOf(index), 1),
                                        locked);
                originalPlacements.add(placement);
                fixedPlacements.add(locked ? placement : null);
                if (!locked) {
                    positions.add(new Position(slot, index));
                    if (placement != null)
                        sources.add(new Source(Stone.of(placement), null, slot.key(), index));
                }
            }
            fixed.putSlot(slot.key(), fixedPlacements);
            original.putSlot(slot.key(), originalPlacements);
        }
        if (context.request().getBackpackDrifs() != null) {
            context.request().getBackpackDrifs().stream()
                    .sorted(
                            Comparator.comparing(
                                    pl.brokenranks.tool.broken_ranks_tool.optimization.dto
                                                    .OptimizationRequest.BackpackDrif
                                            ::getId))
                    .forEach(
                            entry ->
                                    sources.add(
                                            new Source(
                                                    new Stone(
                                                            entry.getTemplateId(),
                                                            entry.getLevel()),
                                                    entry.getId(),
                                                    null,
                                                    null)));
        }
        sources.forEach(source -> supply.merge(source.stone(), 1, Integer::sum));
    }

    Map<Stone, Integer> available(BuildState state) {
        Map<Stone, Integer> remaining = new LinkedHashMap<>(supply);
        for (Position position : positions) {
            Placement placement = state.slots().get(position.slot().key()).get(position.index());
            if (placement != null) remaining.merge(Stone.of(placement), -1, Integer::sum);
        }
        return remaining;
    }

    /** Retains occurrences already in their destination before assigning identical spare copies. */
    List<ReorganizationDrifUsage> usages(BuildState state) {
        Map<Position, Source> assigned = new LinkedHashMap<>();
        Set<Source> used = new HashSet<>();
        for (Position position : positions) {
            Placement placement = state.slots().get(position.slot().key()).get(position.index());
            if (placement == null) continue;
            sources.stream()
                    .filter(
                            source ->
                                    source.entryId() == null
                                            && position.slot().key().equals(source.slotKey())
                                            && position.index() == source.index()
                                            && source.stone().equals(Stone.of(placement)))
                    .findFirst()
                    .ifPresent(
                            source -> {
                                assigned.put(position, source);
                                used.add(source);
                            });
        }
        for (Position position : positions) {
            Placement placement = state.slots().get(position.slot().key()).get(position.index());
            if (placement == null || assigned.containsKey(position)) continue;
            Source source =
                    sources.stream()
                            .filter(
                                    candidate ->
                                            !used.contains(candidate)
                                                    && candidate
                                                            .stone()
                                                            .equals(Stone.of(placement)))
                            .findFirst()
                            .orElseThrow(
                                    () ->
                                            new IllegalStateException(
                                                    "Reorganizacja przekroczyła posiadaną pulę drifów."));
            used.add(source);
            assigned.put(position, source);
        }
        return assigned.entrySet().stream()
                .map(
                        entry ->
                                new ReorganizationDrifUsage(
                                        entry.getValue().entryId(),
                                        entry.getValue().slotKey(),
                                        entry.getValue().index(),
                                        entry.getKey().slot().key(),
                                        entry.getKey().index()))
                .toList();
    }
}
