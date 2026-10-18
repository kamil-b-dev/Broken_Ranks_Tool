package pl.brokenranks.tool.broken_ranks_tool.progressionpath.planning;

import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.*;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.rules.DrifPowerRules;
import pl.brokenranks.tool.broken_ranks_tool.equipment.dto.EquipmentRequest;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.*;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.calculator.NumericStats;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.calculator.input.EquipmentDataProvider.CalculationContext;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.validator.*;
import pl.brokenranks.tool.broken_ranks_tool.progressionpath.model.*;

/** Shares scarce sockets and power between target bonuses before raising their levels. */
public final class ProgressionBalancedCandidates {
    private static final double EPSILON = 1e-9;
    private final CalculationContext context;
    private final EquipmentPlacementRules placement;
    private final UpgradeLevelPolicy levels;
    private final Function<EquipmentRequest, NumericStats> calculate;
    private final ProgressionCandidates candidates;
    private final ProgressionTransition transitions;
    private final Map<DRIF_BONUS_TYPE, List<DrifTemplate>> templates;
    private final List<Axis> axes;

    public ProgressionBalancedCandidates(
            CalculationContext context,
            EquipmentPlacementRules placement,
            UpgradeLevelPolicy levels,
            ProgressionTransition transitions,
            Function<EquipmentRequest, NumericStats> calculate,
            EquipmentRequest target,
            List<ProgressionDrif> tokens) {
        this.context = context;
        this.placement = placement;
        this.levels = levels;
        this.transitions = transitions;
        this.calculate = calculate;
        this.candidates =
                new ProgressionCandidates(context, placement, levels, transitions, calculate);
        templates =
                context.drifs().values().stream()
                        .sorted(
                                Comparator.<DrifTemplate>comparingInt(
                                                drif -> drif.getSize().ordinal())
                                        .reversed()
                                        .thenComparing(DrifTemplate::getId))
                        .collect(Collectors.groupingBy(DrifTemplate::getBonusType));
        var empty = new EquipmentRequest();
        empty.setSlots(Map.of());
        empty.setCharacterStats(Map.of());
        var baseline = calculate.apply(empty);
        var goal = calculate.apply(target);
        axes =
                tokens.stream()
                        .map(token -> context.drifs().get(token.templateId()).getBonusType())
                        .distinct()
                        .sorted()
                        .map(
                                type -> {
                                    int direction =
                                            type.getMaxCap() != null && type.getMaxCap() < 0
                                                    ? -1
                                                    : 1;
                                    double start =
                                            baseline.values().getOrDefault(type.name(), 0.0)
                                                    * direction;
                                    double end =
                                            goal.values().getOrDefault(type.name(), 0.0)
                                                    * direction;
                                    return new Axis(type.name(), direction, start, end - start);
                                })
                        .filter(axis -> axis.range() > EPSILON)
                        .toList();
    }

    public ProgressionCandidates.Projection project(
            ProgressionStage stage, List<ProgressionDrif> tokens, Runnable checkBudget) {
        var request = candidates.frame(stage);
        var remaining = new ArrayList<>(tokens);
        var placed = new LinkedHashMap<String, ProgressionDrif>();
        var keys = new ArrayList<>(request.getSlots().keySet());
        Collections.sort(keys);
        // All affordable bonus types get a low-power stone before any power-band upgrade.
        while (!remaining.isEmpty()) {
            checkBudget.run();
            double current = score(calculate.apply(request));
            Choice best = null;
            var equivalents = new HashSet<String>();
            for (var token : remaining) {
                if (!equivalents.add(token.templateId() + ":" + token.level())) continue;
                var preferred = new ArrayList<>(keys);
                if (token.position() != null && preferred.remove(token.position().slot()))
                    preferred.addFirst(token.position().slot());
                for (String key : preferred) {
                    var slot = request.getSlots().get(key);
                    if (slot.getItemId() == null || transitions.builtIn(slot.getItemId())) continue;
                    var item = context.items().get(slot.getItemId());
                    var desired = context.drifs().get(token.templateId());
                    var template =
                            templates.get(desired.getBonusType()).stream()
                                    .filter(
                                            drif ->
                                                    drif.getSize().ordinal()
                                                            <= desired.getSize().ordinal())
                                    .filter(drif -> placement.isValidDrifSizeForTier(drif, item))
                                    .findFirst()
                                    .orElse(null);
                    if (template == null) continue;
                    int level = Math.min(6, token.level());
                    if (!canInsert(request, key, template, level)) continue;
                    int index = slot.getDrifIds().size();
                    slot.getDrifIds().add(template.getId());
                    slot.getDrifLevels().put("" + index, level);
                    double gain = gain(request, current, checkBudget);
                    slot.getDrifIds().removeLast();
                    slot.getDrifLevels().remove("" + index);
                    if (gain > EPSILON && (best == null || gain > best.gain() + EPSILON))
                        best = new Choice(token, key, index, template.getId(), level, gain);
                }
            }
            if (best == null) break;
            var slot = request.getSlots().get(best.key());
            slot.getDrifIds().add(best.templateId());
            slot.getDrifLevels().put("" + best.index(), best.level());
            placed.put(best.token().instanceId(), best.stone());
            remaining.remove(best.token());
        }
        // Increase one power band at a time; prefer the weakest relative target progress.
        while (!placed.isEmpty()) {
            checkBudget.run();
            double current = score(calculate.apply(request));
            Choice best = null;
            for (var token : tokens) {
                var stone = placed.get(token.instanceId());
                if (stone == null) continue;
                var template = context.drifs().get(stone.templateId());
                int maximum = Math.min(token.level(), template.getSize().getMaxLevel());
                int next =
                        Math.min(maximum, stone.level() <= 6 ? 11 : stone.level() <= 11 ? 16 : 21);
                if (next <= stone.level()) continue;
                var slot = request.getSlots().get(stone.position().slot());
                int extraPower = power(template, next) - power(template, stone.level());
                if (usedPower(slot) + extraPower
                        > levels.calculateItemCapacity(
                                context.items().get(slot.getItemId()), stars(slot))) continue;
                slot.getDrifLevels().put("" + stone.position().socketIndex(), next);
                double gain = gain(request, current, checkBudget) / Math.max(1, extraPower);
                slot.getDrifLevels().put("" + stone.position().socketIndex(), stone.level());
                if (gain > EPSILON && (best == null || gain > best.gain() + EPSILON))
                    best =
                            new Choice(
                                    token,
                                    stone.position().slot(),
                                    stone.position().socketIndex(),
                                    template.getId(),
                                    next,
                                    gain);
            }
            if (best == null) break;
            request.getSlots().get(best.key()).getDrifLevels().put("" + best.index(), best.level());
            placed.put(best.token().instanceId(), best.stone());
        }
        return new ProgressionCandidates.Projection(
                request,
                tokens.stream()
                        .map(token -> placed.getOrDefault(token.instanceId(), token))
                        .toList());
    }

    private boolean canInsert(
            EquipmentRequest request, String key, DrifTemplate template, int level) {
        var slot = request.getSlots().get(key);
        var item = context.items().get(slot.getItemId());
        if (slot.getDrifIds().size() >= placement.maxDrifs(item, stars(slot))
                || !placement.isElementalDrifPositionValid(template, key)) return false;
        for (Long id : slot.getDrifIds()) {
            var existing = context.drifs().get(id);
            if (existing.getBonusType() == template.getBonusType()
                    || placement.isElementalDamage(existing.getBonusType())
                            && placement.isElementalDamage(template.getBonusType())) return false;
        }
        return usedPower(slot) + power(template, level)
                <= levels.calculateItemCapacity(item, stars(slot));
    }

    private int usedPower(EquipmentRequest.SlotData slot) {
        int power = 0;
        for (int i = 0; i < slot.getDrifIds().size(); i++)
            power +=
                    power(
                            context.drifs().get(slot.getDrifIds().get(i)),
                            slot.getDrifLevels().get("" + i));
        return power;
    }

    private int power(DrifTemplate template, int level) {
        return DrifPowerRules.power(template.getBonusType().getBasePower(), level);
    }

    private int stars(EquipmentRequest.SlotData slot) {
        return ProgressionEquipmentSequence.stars(slot);
    }

    private double gain(EquipmentRequest request, double current, Runnable checkBudget) {
        checkBudget.run();
        try {
            return score(calculate.apply(request)) - current;
        } catch (IllegalArgumentException invalidPlacement) {
            return Double.NEGATIVE_INFINITY;
        }
    }

    private double score(NumericStats stats) {
        double result = 0;
        for (var axis : axes) {
            double progress =
                    (stats.values().getOrDefault(axis.key(), 0.0) * axis.direction()
                                    - axis.baseline())
                            / axis.range();
            result += Math.log1p(9 * Math.clamp(progress, 0, 1));
        }
        return result;
    }

    private record Axis(String key, int direction, double baseline, double range) {}

    private record Choice(
            ProgressionDrif token, String key, int index, long templateId, int level, double gain) {
        ProgressionDrif stone() {
            return new ProgressionDrif(
                    token.instanceId(),
                    templateId,
                    level,
                    new ProgressionDrif.Position(key, index));
        }
    }
}
