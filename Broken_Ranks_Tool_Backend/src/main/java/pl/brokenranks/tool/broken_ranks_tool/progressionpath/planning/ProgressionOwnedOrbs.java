package pl.brokenranks.tool.broken_ranks_tool.progressionpath.planning;

import java.util.*;
import pl.brokenranks.tool.broken_ranks_tool.equipment.dto.EquipmentRequest;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.calculator.input.EquipmentDataProvider.CalculationContext;
import pl.brokenranks.tool.broken_ranks_tool.progressionpath.dto.ProgressionPlanResponse.Action;
import pl.brokenranks.tool.broken_ranks_tool.progressionpath.model.ProgressionDrif.Position;
import pl.brokenranks.tool.broken_ranks_tool.progressionpath.planning.ProgressionOrbs.Stone;

/** Matches physical owned orbs, keeping unused or larger occurrences in the backpack. */
final class ProgressionOwnedOrbs {
    private final CalculationContext context;

    ProgressionOwnedOrbs(CalculationContext context) {
        this.context = context;
    }

    ProgressionOrbs.Transition toStage(
            List<Stone> inventory,
            EquipmentRequest before,
            EquipmentRequest after,
            List<Stone> demands) {
        var assigned = new LinkedHashMap<Position, Stone>();
        var used = new HashSet<String>();
        var ids = new HashSet<String>();
        for (var source : inventory)
            if (!ids.add(source.instanceId()))
                throw new IllegalArgumentException("Powtórzona sztuka orba.");
        var actions = new ArrayList<Action>();
        var state = new LinkedHashMap<String, Stone>();
        for (var demand : demands) {
            var desired = context.orbs().get(demand.templateId());
            var source =
                    inventory.stream()
                            .filter(stone -> !used.contains(stone.instanceId()))
                            .filter(
                                    stone -> {
                                        var template = context.orbs().get(stone.templateId());
                                        return template != null
                                                && template.getBonusType() == desired.getBonusType()
                                                && template.getSize().ordinal()
                                                        <= desired.getSize().ordinal()
                                                && stone.level() <= demand.level();
                                    })
                            .min(
                                    Comparator.<Stone>comparingInt(
                                                    stone ->
                                                            stone.templateId()
                                                                                    == demand
                                                                                            .templateId()
                                                                            && stone.level()
                                                                                    == demand
                                                                                            .level()
                                                                    ? 0
                                                                    : 1)
                                            .thenComparingInt(
                                                    stone ->
                                                            Objects.equals(
                                                                            stone.position(),
                                                                            demand.position())
                                                                    ? 0
                                                                    : 1)
                                            .thenComparing(Stone::instanceId))
                            .orElse(null);
            if (source != null) {
                used.add(source.instanceId());
                assigned.put(demand.position(), source);
            }
        }
        // Detach all changed positions before any insertion; swaps never overwrite a socket.
        for (var source : inventory) {
            var demand =
                    demands.stream()
                            .filter(value -> Objects.equals(value.position(), source.position()))
                            .findFirst()
                            .orElse(null);
            var match = source.position() == null ? null : assigned.get(source.position());
            boolean same =
                    demand != null
                            && match == source
                            && source.templateId() == demand.templateId()
                            && source.level() == demand.level()
                            && Objects.equals(
                                    before.getSlots().get(source.position().slot()).getItemId(),
                                    after.getSlots().get(source.position().slot()).getItemId());
            if (!same && source.position() != null)
                actions.add(
                        action(
                                "MOVE",
                                source.instanceId(),
                                source.position(),
                                null,
                                source.templateId(),
                                source.level(),
                                source.templateId(),
                                source.level()));
            state.put(
                    source.instanceId(),
                    same
                            ? source
                            : new Stone(
                                    source.instanceId(),
                                    source.templateId(),
                                    source.level(),
                                    null));
        }
        for (var demand : demands) {
            var source = assigned.get(demand.position());
            String id = source == null ? demand.instanceId() : source.instanceId();
            if (source == null) {
                int suffix = 0;
                while (state.containsKey(id)) id = demand.instanceId() + ":new:" + ++suffix;
                actions.add(
                        action(
                                "ACQUIRE",
                                id,
                                null,
                                null,
                                null,
                                null,
                                demand.templateId(),
                                demand.level()));
            } else {
                var current = state.get(id);
                if (Objects.equals(current.position(), demand.position())) continue;
                if (source.templateId() != demand.templateId() || source.level() != demand.level())
                    actions.add(
                            action(
                                    "UPGRADE",
                                    id,
                                    null,
                                    null,
                                    source.templateId(),
                                    source.level(),
                                    demand.templateId(),
                                    demand.level()));
            }
            actions.add(
                    action(
                            "MOVE",
                            id,
                            null,
                            demand.position(),
                            demand.templateId(),
                            demand.level(),
                            demand.templateId(),
                            demand.level()));
            state.put(id, new Stone(id, demand.templateId(), demand.level(), demand.position()));
        }
        var actual = new HashMap<Position, String>();
        state.values().stream()
                .filter(stone -> stone.position() != null)
                .forEach(
                        stone -> {
                            if (actual.put(
                                            stone.position(),
                                            stone.templateId() + ":" + stone.level())
                                    != null)
                                throw new IllegalStateException("Powtórzone gniazdo orba.");
                        });
        var expected = new HashMap<Position, String>();
        demands.forEach(
                stone -> expected.put(stone.position(), stone.templateId() + ":" + stone.level()));
        if (!actual.equals(expected))
            throw new IllegalStateException("Nie odtworzono orbów etapu.");
        return new ProgressionOrbs.Transition(List.copyOf(state.values()), List.copyOf(actions));
    }

    private Action action(
            String type,
            String id,
            Position from,
            Position to,
            Long oldTemplate,
            Integer oldLevel,
            long template,
            int level) {
        return new Action(type, id, from, to, oldTemplate, oldLevel, template, level);
    }
}
