package pl.brokenranks.tool.broken_ranks_tool.progressionpath.planning;

import java.util.*;
import java.util.function.Function;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.*;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.rules.DrifPowerRules;
import pl.brokenranks.tool.broken_ranks_tool.equipment.dto.EquipmentRequest;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.DrifTemplate;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.calculator.NumericStats;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.calculator.input.EquipmentDataProvider.CalculationContext;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.validator.EquipmentPlacementRules;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.validator.UpgradeLevelPolicy;
import pl.brokenranks.tool.broken_ranks_tool.progressionpath.model.ProgressionDrif;
import pl.brokenranks.tool.broken_ranks_tool.progressionpath.model.ProgressionStage;

/** Bounded target-oriented proposals; authoritative calculation rejects every illegal insertion. */
public final class ProgressionCandidates {
    private final CalculationContext context;
    private final EquipmentPlacementRules placement;
    private final UpgradeLevelPolicy levelsPolicy;
    private final ProgressionTransition transitions;
    private final Function<EquipmentRequest, NumericStats> calculate;

    public ProgressionCandidates(
            CalculationContext context,
            EquipmentPlacementRules placement,
            UpgradeLevelPolicy levelsPolicy,
            ProgressionTransition transitions,
            Function<EquipmentRequest, NumericStats> calculate) {
        this.context = context;
        this.placement = placement;
        this.levelsPolicy = levelsPolicy;
        this.transitions = transitions;
        this.calculate = calculate;
    }

    public EquipmentRequest frame(ProgressionStage stage) {
        var frame = stage.equipment();
        frame.getSlots()
                .values()
                .forEach(
                        slot -> {
                            if (slot.getItemId() != null
                                    && !transitions.builtIn(slot.getItemId())) {
                                slot.setDrifIds(new ArrayList<>());
                                slot.setDrifLevels(new LinkedHashMap<>());
                            }
                        });
        return frame;
    }

    public EquipmentRequest fill(
            ProgressionStage stage,
            List<ProgressionDrif> tokens,
            boolean reverseSlots,
            boolean lowerLevels,
            Runnable checkBudget) {
        return project(stage, tokens, reverseSlots, lowerLevels, checkBudget).equipment();
    }

    public record Projection(EquipmentRequest equipment, List<ProgressionDrif> ceilings) {}

    /** Each token keeps its identity and the smallest future size/level seen in reverse. */
    public Projection project(
            ProgressionStage stage,
            List<ProgressionDrif> tokens,
            boolean reverseSlots,
            boolean lowerLevels,
            Runnable checkBudget) {
        var request = frame(stage);
        var projected = new HashMap<String, ProgressionDrif>();
        var keys = new ArrayList<>(request.getSlots().keySet());
        Collections.sort(keys);
        if (reverseSlots) Collections.reverse(keys);
        for (var token : tokens) {
            checkBudget.run();
            DrifTemplate desired = context.drifs().get(token.templateId());
            boolean placed = false;
            var preferredKeys = new ArrayList<>(keys);
            if (token.position() != null && preferredKeys.remove(token.position().slot()))
                preferredKeys.addFirst(token.position().slot());
            for (String key : preferredKeys) {
                var slot = request.getSlots().get(key);
                if (slot.getItemId() == null || transitions.builtIn(slot.getItemId())) continue;
                var item = context.items().get(slot.getItemId());
                int stars = slot.getItemStars() == null ? 1 : slot.getItemStars();
                if (slot.getDrifIds().size() >= placement.maxDrifs(item, stars)) continue;
                if (!placement.isElementalDrifPositionValid(desired, key)) continue;
                if (slot.getDrifIds().stream()
                        .map(context.drifs()::get)
                        .anyMatch(
                                existing ->
                                        existing.getBonusType() == desired.getBonusType()
                                                || placement.isElementalDamage(
                                                                desired.getBonusType())
                                                        && placement.isElementalDamage(
                                                                existing.getBonusType()))) continue;
                int usedPower = 0;
                for (int i = 0; i < slot.getDrifIds().size(); i++) {
                    var existing = context.drifs().get(slot.getDrifIds().get(i));
                    usedPower +=
                            DrifPowerRules.power(
                                    existing.getBonusType().getBasePower(),
                                    slot.getDrifLevels().get("" + i));
                }
                int capacity = levelsPolicy.calculateItemCapacity(item, stars);
                var templates =
                        context.drifs().values().stream()
                                .filter(drif -> drif.getBonusType() == desired.getBonusType())
                                .filter(
                                        drif ->
                                                drif.getSize().ordinal()
                                                        <= desired.getSize().ordinal())
                                .filter(drif -> placement.isValidDrifSizeForTier(drif, item))
                                .sorted(
                                        Comparator.<DrifTemplate>comparingInt(
                                                        drif -> drif.getSize().ordinal())
                                                .reversed()
                                                .thenComparing(DrifTemplate::getId))
                                .toList();
                for (var template : templates) {
                    int maximum = Math.min(token.level(), template.getSize().getMaxLevel());
                    var levels = new TreeSet<Integer>(Comparator.reverseOrder());
                    levels.add(maximum);
                    levels.add(1);
                    for (int level : DRIF_SIZE.meaningfulLevels())
                        if (level <= maximum) levels.add(level);
                    if (lowerLevels) levels = new TreeSet<>(Set.of(levels.last()));
                    for (int level : levels) {
                        checkBudget.run();
                        if (usedPower
                                        + DrifPowerRules.power(
                                                template.getBonusType().getBasePower(), level)
                                > capacity) continue;
                        int index = slot.getDrifIds().size();
                        slot.getDrifIds().add(template.getId());
                        slot.getDrifLevels().put("" + index, level);
                        try {
                            calculate.apply(request);
                            projected.put(
                                    token.instanceId(),
                                    new ProgressionDrif(
                                            token.instanceId(),
                                            template.getId(),
                                            level,
                                            new ProgressionDrif.Position(key, index)));
                            placed = true;
                            break;
                        } catch (IllegalArgumentException invalidPlacement) {
                            slot.getDrifIds().removeLast();
                            slot.getDrifLevels().remove("" + index);
                        }
                    }
                    if (placed) break;
                }
                if (placed) break;
            }
        }
        return new Projection(
                request,
                tokens.stream()
                        .map(token -> projected.getOrDefault(token.instanceId(), token))
                        .toList());
    }
}
