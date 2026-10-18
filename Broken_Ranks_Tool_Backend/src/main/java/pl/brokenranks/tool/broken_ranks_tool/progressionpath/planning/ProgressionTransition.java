package pl.brokenranks.tool.broken_ranks_tool.progressionpath.planning;

import java.util.*;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.RARITY;
import pl.brokenranks.tool.broken_ranks_tool.equipment.dto.EquipmentRequest;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.DrifTemplate;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.calculator.input.EquipmentDataProvider.CalculationContext;
import pl.brokenranks.tool.broken_ranks_tool.progressionpath.dto.ProgressionPlanResponse.Action;
import pl.brokenranks.tool.broken_ranks_tool.progressionpath.model.*;
import pl.brokenranks.tool.broken_ranks_tool.progressionpath.model.ProgressionDrif.Position;
import pl.brokenranks.tool.broken_ranks_tool.progressionpath.model.ProgressionDrifOperation.*;
import pl.brokenranks.tool.broken_ranks_tool.progressionpath.service.ProgressionDrifReplayService;

/** Matches actual instances to a stage, retaining unused stones and replaying every change. */
public final class ProgressionTransition {
    private final CalculationContext context;
    private final ProgressionDrifReplayService replay;

    public ProgressionTransition(CalculationContext context, ProgressionDrifReplayService replay) {
        this.context = context;
        this.replay = replay;
    }

    public record Result(
            List<ProgressionDrif> inventory,
            List<Action> actions,
            int acquisitions,
            int upgrades) {}

    public List<ProgressionDrif> equipped(EquipmentRequest request) {
        var result = new ArrayList<ProgressionDrif>();
        request.getSlots().entrySet().stream()
                .sorted(Map.Entry.comparingByKey())
                .forEach(
                        entry -> {
                            var slot = entry.getValue();
                            if (slot.getItemId() == null
                                    || builtIn(slot.getItemId())
                                    || slot.getDrifIds() == null) return;
                            for (int index = 0; index < slot.getDrifIds().size(); index++) {
                                Long id = slot.getDrifIds().get(index);
                                if (id == null) continue;
                                int level =
                                        slot.getDrifLevels() == null
                                                ? 1
                                                : slot.getDrifLevels().getOrDefault("" + index, 1);
                                result.add(
                                        new ProgressionDrif(
                                                "equipped:" + entry.getKey() + ":" + index,
                                                id,
                                                level,
                                                new Position(entry.getKey(), index)));
                            }
                        });
        return List.copyOf(result);
    }

    public boolean builtIn(long id) {
        var item = context.items().get(id);
        if (item == null) throw new IllegalArgumentException("Nieznany przedmiot: " + id + ".");
        return item.getRarity() == RARITY.EPIC || item.getRarity() == RARITY.SET;
    }

    public Result toStage(
            List<ProgressionDrif> inventory,
            EquipmentRequest previousEquipment,
            EquipmentRequest desired,
            int stageIndex,
            boolean acquire) {
        validateBuiltInContinuity(previousEquipment, desired);
        var demands = equipped(desired);
        var assigned = new LinkedHashMap<Integer, String>();
        var sourceToDemand = new HashMap<String, Integer>();
        var order = new ArrayList<Integer>();
        for (int i = 0; i < demands.size(); i++) order.add(i);
        order.sort(
                Comparator.comparingLong(
                        i ->
                                inventory.stream()
                                        .filter(source -> compatible(source, demands.get(i)))
                                        .count()));
        for (int index : order)
            match(index, demands, inventory, sourceToDemand, assigned, new HashSet<>());
        var kept = new HashSet<String>();
        for (int index = 0; index < demands.size(); index++) {
            String id = assigned.get(index);
            var demand = demands.get(index);
            var source =
                    inventory.stream()
                            .filter(stone -> stone.instanceId().equals(id))
                            .findFirst()
                            .orElse(null);
            if (source != null
                    && Objects.equals(source.position(), demand.position())
                    && source.templateId() == demand.templateId()
                    && source.level() == demand.level()
                    && sameFrame(
                            previousEquipment.getSlots().get(demand.position().slot()),
                            desired.getSlots().get(demand.position().slot()))) kept.add(id);
        }
        var operations = new ArrayList<ProgressionDrifOperation>();
        var actions = new ArrayList<Action>();
        // Detach ordinary stones before changing items, stars or orbs. No occupied socket is
        // overwritten.
        for (var stone : inventory)
            if (stone.position() != null && !kept.contains(stone.instanceId())) {
                operations.add(new Move(stone.instanceId(), stone.position(), null));
                actions.add(
                        new Action(
                                "MOVE",
                                stone.instanceId(),
                                stone.position(),
                                null,
                                stone.templateId(),
                                stone.level(),
                                stone.templateId(),
                                stone.level()));
            }
        int acquisitions = 0;
        int upgrades = 0;
        for (int index = 0; index < demands.size(); index++) {
            var demand = demands.get(index);
            String id = assigned.get(index);
            if (kept.contains(id)) continue;
            ProgressionDrif source;
            if (id == null) {
                if (!acquire) return null;
                id = "acquired:" + stageIndex + ":" + index;
                source = new ProgressionDrif(id, demand.templateId(), demand.level(), null);
                operations.add(new Acquire(source));
                actions.add(
                        new Action(
                                "ACQUIRE",
                                id,
                                null,
                                null,
                                null,
                                null,
                                source.templateId(),
                                source.level()));
                acquisitions++;
            } else {
                String instanceId = id;
                source =
                        inventory.stream()
                                .filter(value -> value.instanceId().equals(instanceId))
                                .findFirst()
                                .orElseThrow();
                if (source.templateId() != demand.templateId()
                        || source.level() != demand.level()) {
                    operations.add(new Upgrade(id, demand.templateId(), demand.level()));
                    actions.add(
                            new Action(
                                    "UPGRADE",
                                    id,
                                    null,
                                    null,
                                    source.templateId(),
                                    source.level(),
                                    demand.templateId(),
                                    demand.level()));
                    upgrades++;
                }
            }
            operations.add(new Move(id, null, demand.position()));
            actions.add(
                    new Action(
                            "MOVE",
                            id,
                            null,
                            demand.position(),
                            demand.templateId(),
                            demand.level(),
                            demand.templateId(),
                            demand.level()));
        }
        var result = replay.replay(inventory, operations, context.drifs());
        // Check a bijection with actual occupied ordinary sockets, including original hole indices.
        var actual = new HashMap<Position, String>();
        result.stream()
                .filter(stone -> stone.position() != null)
                .forEach(
                        stone ->
                                actual.put(
                                        stone.position(),
                                        stone.templateId() + ":" + stone.level()));
        var expected = new HashMap<Position, String>();
        demands.forEach(
                stone -> expected.put(stone.position(), stone.templateId() + ":" + stone.level()));
        if (!actual.equals(expected))
            throw new IllegalStateException("Niezgodne mapowanie drifów etapu.");
        return new Result(result, List.copyOf(actions), acquisitions, upgrades);
    }

    private boolean match(
            int demand,
            List<ProgressionDrif> demands,
            List<ProgressionDrif> inventory,
            Map<String, Integer> sourceToDemand,
            Map<Integer, String> assigned,
            Set<String> visited) {
        var sources =
                inventory.stream()
                        .filter(source -> compatible(source, demands.get(demand)))
                        .sorted(
                                Comparator.<ProgressionDrif>comparingInt(
                                                source ->
                                                        source.templateId()
                                                                                == demands.get(
                                                                                                demand)
                                                                                        .templateId()
                                                                        && source.level()
                                                                                == demands.get(
                                                                                                demand)
                                                                                        .level()
                                                                ? 0
                                                                : 1)
                                        .thenComparingInt(
                                                source ->
                                                        Objects.equals(
                                                                        source.position(),
                                                                        demands.get(demand)
                                                                                .position())
                                                                ? 0
                                                                : 1)
                                        .thenComparing(ProgressionDrif::instanceId))
                        .toList();
        for (var source : sources) {
            if (!visited.add(source.instanceId())) continue;
            Integer previous = sourceToDemand.get(source.instanceId());
            if (previous == null
                    || match(previous, demands, inventory, sourceToDemand, assigned, visited)) {
                sourceToDemand.put(source.instanceId(), demand);
                assigned.put(demand, source.instanceId());
                return true;
            }
        }
        return false;
    }

    private boolean compatible(ProgressionDrif source, ProgressionDrif demand) {
        DrifTemplate before = context.drifs().get(source.templateId());
        DrifTemplate after = context.drifs().get(demand.templateId());
        return before.getBonusType() == after.getBonusType()
                && before.getSize().ordinal() <= after.getSize().ordinal()
                && source.level() <= demand.level()
                && (source.level() != demand.level()
                        || before.getSize() != after.getSize()
                        || source.templateId() == demand.templateId());
    }

    public static boolean sameFrame(EquipmentRequest.SlotData a, EquipmentRequest.SlotData b) {
        if ((a == null || a.getItemId() == null) && (b == null || b.getItemId() == null))
            return true;
        if (a == null || b == null) return a == b;
        return Objects.equals(a.getItemId(), b.getItemId())
                && Objects.equals(
                        a.getItemStars() == null ? 1 : a.getItemStars(),
                        b.getItemStars() == null ? 1 : b.getItemStars())
                && Objects.equals(
                        a.getOrbIds() == null ? List.of() : a.getOrbIds(),
                        b.getOrbIds() == null ? List.of() : b.getOrbIds())
                && normalizedOrbLevels(a).equals(normalizedOrbLevels(b));
    }

    private static List<Integer> normalizedOrbLevels(EquipmentRequest.SlotData slot) {
        var result = new ArrayList<Integer>();
        if (slot.getOrbIds() == null) return result;
        for (int index = 0; index < slot.getOrbIds().size(); index++) {
            result.add(
                    slot.getOrbLevels() == null || index >= slot.getOrbLevels().size()
                            ? 1
                            : slot.getOrbLevels().get(index));
        }
        return result;
    }

    private void validateBuiltInContinuity(EquipmentRequest before, EquipmentRequest after) {
        for (var entry : after.getSlots().entrySet()) {
            var next = entry.getValue();
            var previous = before.getSlots().get(entry.getKey());
            if (previous == null
                    || next.getItemId() == null
                    || !Objects.equals(previous.getItemId(), next.getItemId())
                    || !builtIn(next.getItemId())
                    || next.getDrifIds() == null) continue;
            for (int index = 0; index < next.getDrifIds().size(); index++) {
                String key = "" + index;
                int oldLevel =
                        previous.getDrifLevels() == null
                                ? 1
                                : previous.getDrifLevels().getOrDefault(key, 1);
                int newLevel =
                        next.getDrifLevels() == null
                                ? 1
                                : next.getDrifLevels().getOrDefault(key, 1);
                if (newLevel < oldLevel)
                    throw new IllegalArgumentException(
                            "Nie można obniżać poziomu wbudowanego drifa w zachowanym przedmiocie.");
            }
        }
    }
}
