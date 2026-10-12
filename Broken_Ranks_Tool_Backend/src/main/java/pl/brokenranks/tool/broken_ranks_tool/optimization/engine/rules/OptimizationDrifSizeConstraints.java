package pl.brokenranks.tool.broken_ranks_tool.optimization.engine.rules;

import java.util.List;
import java.util.Map;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_BONUS_TYPE;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_SIZE;
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.BuildConfigurationMode;
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.OptimizationRequest;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model.BuildState;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model.OptimizationContext;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model.Placement;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model.SlotContext;

/** Resolves and evaluates optional per-size quantity constraints. */
public final class OptimizationDrifSizeConstraints {

    private OptimizationDrifSizeConstraints() {}

    public static Map<DRIF_SIZE, OptimizationRequest.QuantityRange> ranges(
            DRIF_BONUS_TYPE type, OptimizationRequest request) {
        if (request.getConfigurationMode() != BuildConfigurationMode.ADVANCED
                || request.getDrifSizeQuantities() == null) return Map.of();
        return request.getDrifSizeQuantities().getOrDefault(type, Map.of());
    }

    public static int minimum(DRIF_BONUS_TYPE type, DRIF_SIZE size, OptimizationRequest request) {
        OptimizationRequest.QuantityRange range = ranges(type, request).get(size);
        return range == null ? 0 : range.getMin();
    }

    public static int maximum(DRIF_BONUS_TYPE type, DRIF_SIZE size, OptimizationRequest request) {
        OptimizationRequest.QuantityRange range = ranges(type, request).get(size);
        return range == null
                ? OptimizationRequestConstraints.MAX_GLOBAL_DRIFS_PER_TYPE
                : range.getMax();
    }

    public static int count(
            BuildState state, DRIF_BONUS_TYPE type, DRIF_SIZE size, OptimizationContext context) {
        int count = 0;
        for (SlotContext slot : context.slots()) {
            List<Placement> placements = state.slots().getOrDefault(slot.key(), List.of());
            for (Placement placement : placements) {
                if (placement != null
                        && placement.drif().getBonusType() == type
                        && placement.drif().getSize() == size) count++;
            }
        }
        return count;
    }

    /** Built-in drifs cannot be removed; their excess does not allow additional placements. */
    public static int maximum(DRIF_BONUS_TYPE type, DRIF_SIZE size, OptimizationContext context) {
        return Math.max(maximum(type, size, context.request()), builtInCount(type, size, context));
    }

    public static int builtInCount(
            DRIF_BONUS_TYPE type, DRIF_SIZE size, OptimizationContext context) {
        int count = 0;
        for (SlotContext slot : context.slots()) {
            if (!slot.special() || slot.original().getDrifIds() == null) continue;
            for (Long id : slot.original().getDrifIds()) {
                var drif = context.drifs().get(id);
                if (drif != null && drif.getBonusType() == type && drif.getSize() == size) count++;
            }
        }
        return count;
    }

    public static List<String> builtInWarnings(OptimizationContext context) {
        List<String> warnings = new java.util.ArrayList<>();
        if (context.request().getDrifSizeQuantities() == null) return warnings;
        context.request().getDrifSizeQuantities().entrySet().stream()
                .sorted(Map.Entry.comparingByKey())
                .forEach(
                        bonus ->
                                bonus.getValue().entrySet().stream()
                                        .sorted(Map.Entry.comparingByKey())
                                        .forEach(
                                                size -> {
                                                    int fixed =
                                                            builtInCount(
                                                                    bonus.getKey(),
                                                                    size.getKey(),
                                                                    context);
                                                    if (fixed > size.getValue().getMax())
                                                        warnings.add(
                                                                "Limit "
                                                                        + size.getKey()
                                                                        + " dla "
                                                                        + bonus.getKey()
                                                                                .getDescription()
                                                                        + " ("
                                                                        + size.getValue().getMax()
                                                                        + ") jest sprzeczny z liczbą wbudowanych drifów ("
                                                                        + fixed
                                                                        + "). Zachowano wbudowane drify.");
                                                }));
        return warnings;
    }

    public static boolean satisfied(BuildState state, OptimizationContext context) {
        OptimizationRequest request = context.request();
        if (request.getConfigurationMode() != BuildConfigurationMode.ADVANCED
                || request.getDrifSizeQuantities() == null) return true;
        for (var bonusEntry : request.getDrifSizeQuantities().entrySet()) {
            for (var sizeEntry : bonusEntry.getValue().entrySet()) {
                int count = count(state, bonusEntry.getKey(), sizeEntry.getKey(), context);
                if (count < sizeEntry.getValue().getMin()
                        || count > maximum(bonusEntry.getKey(), sizeEntry.getKey(), context))
                    return false;
            }
        }
        return true;
    }
}
