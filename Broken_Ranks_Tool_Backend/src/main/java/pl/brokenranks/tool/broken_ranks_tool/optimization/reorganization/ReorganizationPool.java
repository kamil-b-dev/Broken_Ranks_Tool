package pl.brokenranks.tool.broken_ranks_tool.optimization.reorganization;

import java.util.*;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_BONUS_TYPE;
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.OptimizationResponse.ReorganizationDrifUsage;
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.ReorganizationOptions.Upgrade;
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
    final BuildState baseline;
    final Map<Stone, Integer> required = new LinkedHashMap<>();
    final List<Source> mandatory = new ArrayList<>();
    final Map<Source, String> targetSlots = new LinkedHashMap<>();
    final Map<DRIF_BONUS_TYPE, Double> minimums = new EnumMap<>(DRIF_BONUS_TYPE.class);

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
        baseline = original.copy();
        var options = context.request().getReorganization();
        for (var upgrade : options == null ? List.<Upgrade>of() : options.requestedUpgrades()) {
            for (int i = 0; i < sources.size(); i++) {
                Source source = sources.get(i);
                if (upgrade.getSourceSlotKey().equals(source.slotKey())
                        && Objects.equals(upgrade.getSourceDrifIndex(), source.index())) {
                    Stone target =
                            new Stone(upgrade.getTargetTemplateId(), upgrade.getTargetLevel());
                    Source upgraded = new Source(target, null, source.slotKey(), source.index());
                    mandatory.add(upgraded);
                    sources.set(i, upgraded);
                    original.setPlacement(
                            source.slotKey(),
                            source.index(),
                            new Placement(
                                    context.drifs().get(target.templateId()),
                                    target.level(),
                                    false));
                    break;
                }
            }
        }
        if (options != null && !options.isAllowUnequip())
            sources.forEach(source -> required.merge(source.stone(), 1, Integer::sum));

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
        for (var insertion :
                options == null
                        ? List
                                .<pl.brokenranks.tool.broken_ranks_tool.optimization.dto
                                                .ReorganizationOptions.Insertion>
                                        of()
                        : options.requestedInsertions())
            sources.stream()
                    .filter(source -> insertion.getEntryId().equals(source.entryId()))
                    .findFirst()
                    .ifPresent(
                            source -> {
                                mandatory.add(source);
                                if (insertion.getTargetSlotKey() != null)
                                    targetSlots.put(source, insertion.getTargetSlotKey());
                                if (!options.isAllowUnequip())
                                    required.merge(source.stone(), 1, Integer::sum);
                            });
        Map<Stone, Integer> mandatoryCounts = new LinkedHashMap<>();
        mandatory.forEach(source -> mandatoryCounts.merge(source.stone(), 1, Integer::sum));
        mandatoryCounts.forEach((stone, count) -> required.merge(stone, count, Math::max));
        sources.forEach(source -> supply.merge(source.stone(), 1, Integer::sum));
    }

    int partialMovementCost(BuildState state) {
        int stationary = 0, placed = 0, equipped = 0;
        for (Source source : sources) {
            if (source.entryId() != null) continue;
            equipped++;
            Placement destination = state.slots().get(source.slotKey()).get(source.index());
            if (destination != null && source.stone().equals(Stone.of(destination))) stationary++;
        }
        for (Position position : positions)
            if (state.slots().get(position.slot().key()).get(position.index()) != null) placed++;
        return Math.max(equipped, placed) - stationary;
    }

    int movementCost(BuildState state) {
        var usages = usages(state);
        int changes = 0, usedEquipped = 0;
        for (var usage : usages) {
            if (usage.entryId() == null) usedEquipped++;
            if (usage.entryId() != null
                    || !usage.slotKey().equals(usage.sourceSlotKey())
                    || !Objects.equals(usage.drifIndex(), usage.sourceDrifIndex())) changes++;
        }
        return changes
                + (int) sources.stream().filter(source -> source.entryId() == null).count()
                - usedEquipped;
    }

    Map<Stone, Integer> available(BuildState state) {
        Map<Stone, Integer> remaining = new LinkedHashMap<>(supply);
        for (Position position : positions) {
            Placement placement = state.slots().get(position.slot().key()).get(position.index());
            if (placement != null) remaining.merge(Stone.of(placement), -1, Integer::sum);
        }
        return remaining;
    }

    int missingTargeted(BuildState state) {
        Map<String, Map<Stone, Integer>> needed = new LinkedHashMap<>();
        targetSlots.forEach(
                (source, slot) ->
                        needed.computeIfAbsent(slot, key -> new LinkedHashMap<>())
                                .merge(source.stone(), 1, Integer::sum));
        int missing = 0;
        for (var entry : needed.entrySet()) {
            Map<Stone, Integer> placed = new HashMap<>();
            positions.stream()
                    .filter(position -> position.slot().key().equals(entry.getKey()))
                    .map(position -> state.slots().get(entry.getKey()).get(position.index()))
                    .filter(Objects::nonNull)
                    .forEach(placement -> placed.merge(Stone.of(placement), 1, Integer::sum));
            for (var count : entry.getValue().entrySet())
                missing += Math.max(0, count.getValue() - placed.getOrDefault(count.getKey(), 0));
        }
        return missing;
    }

    /** Retains occurrences already in their destination before assigning identical spare copies. */
    List<ReorganizationDrifUsage> usages(BuildState state) {
        Map<Position, Source> assigned = new LinkedHashMap<>();
        Set<Source> used = new HashSet<>();
        for (Source requiredSource :
                mandatory.stream()
                        .sorted(
                                Comparator.comparingInt(
                                        source -> targetSlots.containsKey(source) ? 0 : 1))
                        .toList()) {
            Position destination =
                    positions.stream()
                            .filter(position -> !assigned.containsKey(position))
                            .filter(
                                    position ->
                                            !targetSlots.containsKey(requiredSource)
                                                    || position.slot()
                                                            .key()
                                                            .equals(
                                                                    targetSlots.get(
                                                                            requiredSource)))
                            .filter(
                                    position -> {
                                        Placement placement =
                                                state.slots()
                                                        .get(position.slot().key())
                                                        .get(position.index());
                                        return placement != null
                                                && requiredSource
                                                        .stone()
                                                        .equals(Stone.of(placement));
                                    })
                            .min(
                                    Comparator.comparingInt(
                                            position -> {
                                                if (position.slot()
                                                                .key()
                                                                .equals(requiredSource.slotKey())
                                                        && Objects.equals(
                                                                position.index(),
                                                                requiredSource.index())) return 0;
                                                boolean occupiedOrigin =
                                                        sources.stream()
                                                                .anyMatch(
                                                                        source ->
                                                                                !used.contains(
                                                                                                source)
                                                                                        && position.slot()
                                                                                                .key()
                                                                                                .equals(
                                                                                                        source
                                                                                                                .slotKey())
                                                                                        && Objects
                                                                                                .equals(
                                                                                                        position
                                                                                                                .index(),
                                                                                                        source
                                                                                                                .index())
                                                                                        && source.stone()
                                                                                                .equals(
                                                                                                        requiredSource
                                                                                                                .stone()));
                                                return occupiedOrigin ? 2 : 1;
                                            }))
                            .orElseThrow(
                                    () ->
                                            new IllegalStateException(
                                                    "Brak wymaganego drifa w wyniku."));
            assigned.put(destination, requiredSource);
            used.add(requiredSource);
        }
        for (Position position : positions) {
            Placement placement = state.slots().get(position.slot().key()).get(position.index());
            if (placement == null || assigned.containsKey(position)) continue;
            sources.stream()
                    .filter(
                            source ->
                                    !used.contains(source)
                                            && source.entryId() == null
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
