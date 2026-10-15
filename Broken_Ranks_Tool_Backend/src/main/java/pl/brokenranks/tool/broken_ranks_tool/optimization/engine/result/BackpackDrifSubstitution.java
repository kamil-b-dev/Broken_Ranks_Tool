package pl.brokenranks.tool.broken_ranks_tool.optimization.engine.result;

import java.util.*;
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.OptimizationRequest.BackpackDrif;
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.OptimizationResponse.BackpackDrifUsage;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model.*;

/** Matches owned stones only after all catalog optimization stages have finished. */
public final class BackpackDrifSubstitution {
    private BackpackDrifSubstitution() {}

    public static Result apply(
            BuildState target, OptimizationContext context, OptimizationResultAssembler assembler) {
        BuildState result = target.copy();
        List<BackpackDrifUsage> usages = new ArrayList<>();
        Set<String> consumed = new HashSet<>();
        var slots =
                context.slots().stream()
                        .filter(
                                slot ->
                                        slot.optimizable()
                                                && (context.request().getLockedSlots() == null
                                                        || !context.request()
                                                                .getLockedSlots()
                                                                .contains(slot.key())))
                        .sorted(
                                Comparator.comparingDouble(SlotContext::drifBonus)
                                        .reversed()
                                        .thenComparing(SlotContext::key))
                        .toList();
        List<Target> targets = new ArrayList<>();
        for (var slot : slots) {
            var placements = target.slots().get(slot.key());
            for (int index = 0; index < placements.size(); index++) {
                var placement = placements.get(index);
                if (placement != null && !slot.lockedIndices().contains(index))
                    targets.add(new Target(slot, index, placement));
            }
        }
        // First lower/equal levels, then higher ones after capacity released by earlier matches.
        for (boolean higher : List.of(false, true)) {
            for (var desired : targets) {
                if (usages.stream()
                        .anyMatch(
                                use ->
                                        use.slotKey().equals(desired.slot().key())
                                                && use.drifIndex() == desired.index())) continue;
                var candidates =
                        context.request().getBackpackDrifs().stream()
                                .filter(entry -> !consumed.contains(entry.getId()))
                                .filter(
                                        entry ->
                                                (entry.getLevel() > desired.placement().level())
                                                        == higher)
                                .filter(
                                        entry -> {
                                            var drif = context.drifs().get(entry.getTemplateId());
                                            return drif.getBonusType()
                                                            == desired.placement()
                                                                    .drif()
                                                                    .getBonusType()
                                                    && drif.getSize()
                                                            == desired.placement().drif().getSize();
                                        })
                                .sorted(
                                        Comparator.comparingInt(
                                                        (BackpackDrif entry) ->
                                                                Math.abs(
                                                                        entry.getLevel()
                                                                                - desired.placement()
                                                                                        .level()))
                                                .thenComparing(
                                                        Comparator.comparingInt(
                                                                        BackpackDrif::getLevel)
                                                                .reversed())
                                                .thenComparing(BackpackDrif::getId))
                                .toList();
                for (var entry : candidates) {
                    BuildState trial = result.copy();
                    trial.setPlacement(
                            desired.slot().key(),
                            desired.index(),
                            new Placement(
                                    context.drifs().get(entry.getTemplateId()),
                                    entry.getLevel(),
                                    false));
                    if (assembler.validateFinalResult(trial, context) != null) continue;
                    result = trial;
                    consumed.add(entry.getId());
                    usages.add(
                            new BackpackDrifUsage(
                                    entry.getId(), desired.slot().key(), desired.index()));
                    break;
                }
            }
        }
        return new Result(result, List.copyOf(usages));
    }

    private record Target(SlotContext slot, int index, Placement placement) {}

    public record Result(BuildState state, List<BackpackDrifUsage> usages) {}
}
