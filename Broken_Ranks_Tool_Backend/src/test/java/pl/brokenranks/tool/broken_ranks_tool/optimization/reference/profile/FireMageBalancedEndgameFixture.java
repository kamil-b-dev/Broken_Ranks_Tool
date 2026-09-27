package pl.brokenranks.tool.broken_ranks_tool.optimization.reference.profile;

import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_BONUS_TYPE;
import pl.brokenranks.tool.broken_ranks_tool.equipment.persistence.repository.ItemTemplateRepository;
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.OptimizationRequest;
import pl.brokenranks.tool.broken_ranks_tool.optimization.reference.CpSatBuildOptimizationSolver;

/** Reviewed Fire Mage endgame fixture balancing four defensive drifs. */
public final class FireMageBalancedEndgameFixture {
    private static final int MAX_DRIFS = 12;
    private static final int MAX_MAGIC_DAMAGE_DRIFS = 7;

    private final FireMageEndgameFixture base;

    public FireMageBalancedEndgameFixture(ItemTemplateRepository items) {
        this.base = new FireMageEndgameFixture(items);
    }

    public OptimizationRequest request() {
        OptimizationRequest request = base.request();
        Map<DRIF_BONUS_TYPE, Integer> priorities = new LinkedHashMap<>(request.getPriorities());
        defensiveTypes().forEach(type -> priorities.put(type, 1));
        request.setPriorities(priorities);

        Map<DRIF_BONUS_TYPE, OptimizationRequest.QuantityRange> quantities =
                new LinkedHashMap<>(request.getTargetQuantities());
        quantities.put(
                DRIF_BONUS_TYPE.DAMAGE_MAGIC,
                new OptimizationRequest.QuantityRange(0, MAX_MAGIC_DAMAGE_DRIFS));
        defensiveTypes()
                .forEach(
                        type ->
                                quantities.putIfAbsent(
                                        type, new OptimizationRequest.QuantityRange(0, MAX_DRIFS)));
        request.setTargetQuantities(quantities);

        Map<DRIF_BONUS_TYPE, Double> minimums = new LinkedHashMap<>(minimumValues());
        request.setForcedPercentageTargets(minimums);
        request.setMaximizeBonuses(new LinkedHashSet<>(priorities.keySet()));
        return request;
    }

    public Map<DRIF_BONUS_TYPE, Double> minimumValues() {
        Map<DRIF_BONUS_TYPE, Double> minimums = new LinkedHashMap<>(base.minimumValues());
        minimums.put(DRIF_BONUS_TYPE.HIT_CHANCE_RANGED, 140.0);
        return minimums;
    }

    public CpSatBuildOptimizationSolver.ObjectivePlan objectivePlan() {
        return new CpSatBuildOptimizationSolver.ObjectivePlan(
                minimumValues(),
                List.of(DRIF_BONUS_TYPE.DAMAGE_MAGIC),
                List.of(defensiveTypes()),
                List.of(DRIF_BONUS_TYPE.HIT_CHANCE_RANGED));
    }

    public List<DRIF_BONUS_TYPE> defensiveTypes() {
        return List.of(
                DRIF_BONUS_TYPE.DODGE_CHANCE,
                DRIF_BONUS_TYPE.DAMAGE_REDUCTION_CHANCE,
                DRIF_BONUS_TYPE.PASIVE_DAMAGE_REDUCTION,
                DRIF_BONUS_TYPE.PERCENTAGE_DAMAGE_REDUCTION);
    }
}
