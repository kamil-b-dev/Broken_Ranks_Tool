package pl.brokenranks.tool.broken_ranks_tool.progressionpath.planning;

import java.util.*;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.RARITY;
import pl.brokenranks.tool.broken_ranks_tool.equipment.dto.EquipmentRequest;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.*;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.calculator.input.EquipmentDataProvider.CalculationContext;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.validator.EquipmentPlacementRules;
import pl.brokenranks.tool.broken_ranks_tool.progressionpath.dto.ProgressionPlanResponse.Action;
import pl.brokenranks.tool.broken_ranks_tool.progressionpath.model.ProgressionDrif.Position;

/** Reverse projections and forward ownership replay for the globally unique target orb types. */
public final class ProgressionOrbs {
    public record Stone(String instanceId, long templateId, int level, Position position) {}

    public record Projection(EquipmentRequest equipment, List<Stone> ceilings) {}

    public record Transition(List<Stone> inventory, List<Action> actions) {}

    private final CalculationContext context;
    private final EquipmentPlacementRules placement;

    public ProgressionOrbs(CalculationContext context, EquipmentPlacementRules placement) {
        this.context = context;
        this.placement = placement;
    }

    public List<Stone> equipped(EquipmentRequest equipment) {
        var stones = new ArrayList<Stone>();
        equipment.getSlots().entrySet().stream()
                .sorted(Map.Entry.comparingByKey())
                .forEach(
                        entry -> {
                            var slot = entry.getValue();
                            if (slot.getOrbIds() == null) return;
                            for (int i = 0; i < slot.getOrbIds().size(); i++) {
                                Long id = slot.getOrbIds().get(i);
                                if (id == null) continue;
                                var template = context.orbs().get(id);
                                int level =
                                        slot.getOrbLevels() == null
                                                        || slot.getOrbLevels().size() <= i
                                                ? 1
                                                : slot.getOrbLevels().get(i);
                                stones.add(
                                        new Stone(
                                                "orb:" + template.getBonusType().name(),
                                                id,
                                                level,
                                                new Position(entry.getKey(), i)));
                            }
                        });
        return List.copyOf(stones);
    }

    public Projection project(EquipmentRequest equipment, List<Stone> tokens) {
        var ceilings = new ArrayList<Stone>();
        for (var token : tokens) {
            var desired = context.orbs().get(token.templateId());
            var keys = new ArrayList<>(new TreeSet<>(equipment.getSlots().keySet()));
            if (token.position() != null && keys.remove(token.position().slot()))
                keys.addFirst(token.position().slot());
            Stone projected = token;
            boolean found = false;
            var templates =
                    context.orbs().values().stream()
                            .filter(orb -> orb.getBonusType() == desired.getBonusType())
                            .filter(orb -> orb.getSize().ordinal() <= desired.getSize().ordinal())
                            .sorted(
                                    Comparator.<OrbTemplate>comparingInt(
                                                    orb -> orb.getSize().ordinal())
                                            .reversed()
                                            .thenComparing(OrbTemplate::getId))
                            .toList();
            for (String key : keys) {
                var slot = equipment.getSlots().get(key);
                if (slot.getItemId() == null) continue;
                var item = context.items().get(slot.getItemId());
                int index = slot.getOrbIds().size();
                if (index >= (item.getRarity() == RARITY.LEGENDARY ? 2 : 1)) continue;
                for (var orb : templates) {
                    if (!placement.isValidOrb(orb, key, item, index == 1)
                            || !placement.isValidOrbSizeForTier(orb, item)) continue;
                    int level = Math.min(token.level(), orb.getSize().getMaxLevel());
                    slot.getOrbIds().add(orb.getId());
                    slot.getOrbLevels().add(level);
                    projected =
                            new Stone(
                                    token.instanceId(),
                                    orb.getId(),
                                    level,
                                    new Position(key, index));
                    found = true;
                    break;
                }
                if (found) break;
            }
            ceilings.add(projected);
        }
        return new Projection(equipment, List.copyOf(ceilings));
    }

    public Transition toStage(
            List<Stone> inventory, EquipmentRequest before, EquipmentRequest after) {
        var state = new LinkedHashMap<String, Stone>();
        inventory.forEach(
                stone -> {
                    if (state.putIfAbsent(stone.instanceId(), stone) != null)
                        throw new IllegalArgumentException("Powtórzona sztuka orba.");
                });
        var demands = equipped(after);
        var actions = new ArrayList<Action>();
        var retained = new HashSet<String>();
        for (var stone : inventory) {
            var demand =
                    demands.stream()
                            .filter(value -> value.instanceId().equals(stone.instanceId()))
                            .findFirst()
                            .orElse(null);
            boolean same =
                    demand != null
                            && stone.equals(demand)
                            && stone.position() != null
                            && Objects.equals(
                                    before.getSlots().get(stone.position().slot()).getItemId(),
                                    after.getSlots().get(stone.position().slot()).getItemId());
            if (same) retained.add(stone.instanceId());
            else if (stone.position() != null) {
                actions.add(
                        action(
                                "MOVE",
                                stone,
                                stone.position(),
                                null,
                                stone.templateId(),
                                stone.level()));
                state.put(
                        stone.instanceId(),
                        new Stone(stone.instanceId(), stone.templateId(), stone.level(), null));
            }
        }
        for (var demand : demands) {
            if (retained.contains(demand.instanceId())) continue;
            var source = state.get(demand.instanceId());
            if (source == null) {
                actions.add(
                        new Action(
                                "ACQUIRE",
                                demand.instanceId(),
                                null,
                                null,
                                null,
                                null,
                                demand.templateId(),
                                demand.level()));
            } else {
                var old = context.orbs().get(source.templateId());
                var next = context.orbs().get(demand.templateId());
                if (old.getBonusType() != next.getBonusType()
                        || old.getSize().ordinal() > next.getSize().ordinal()
                        || source.level() > demand.level())
                    throw new IllegalArgumentException(
                            "Plan próbował zmniejszyć poziom lub rozmiar orba.");
                if (source.templateId() != demand.templateId() || source.level() != demand.level())
                    actions.add(
                            action(
                                    "UPGRADE",
                                    demand,
                                    null,
                                    null,
                                    source.templateId(),
                                    source.level()));
            }
            if (state.values().stream()
                    .anyMatch(stone -> demand.position().equals(stone.position())))
                throw new IllegalArgumentException("Zajęte docelowe gniazdo orba.");
            actions.add(
                    action(
                            "MOVE",
                            demand,
                            null,
                            demand.position(),
                            demand.templateId(),
                            demand.level()));
            state.put(demand.instanceId(), demand);
        }
        var actual = state.values().stream().filter(stone -> stone.position() != null).toList();
        if (actual.size() != demands.size()
                || !new HashSet<>(actual).equals(new HashSet<>(demands)))
            throw new IllegalArgumentException("Operacje orbów nie odtwarzają etapu.");
        return new Transition(List.copyOf(state.values()), List.copyOf(actions));
    }

    private Action action(
            String type, Stone stone, Position from, Position to, Long oldId, Integer oldLevel) {
        return new Action(
                type,
                stone.instanceId(),
                from,
                to,
                oldId,
                oldLevel,
                stone.templateId(),
                stone.level());
    }
}
