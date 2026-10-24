package pl.brokenranks.tool.broken_ranks_tool.equipment.service.calculator;

import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;
import lombok.Getter;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_BONUS_TYPE;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.ORB_BONUS_TYPE;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.calculator.input.EquipmentDataProvider.CalculationContext;

/** Holds the mutable state shared across one statistics calculation. */
@Getter
public class CalculationState {
    private final StatsAccumulator accumulator;
    private final CalculationContext context;
    private final Set<ORB_BONUS_TYPE> usedOrbs = new HashSet<>();
    private final Map<DRIF_BONUS_TYPE, Integer> drifCounts = new HashMap<>();

    public CalculationState(CalculationContext context) {
        this(context, false);
    }

    public CalculationState(CalculationContext context, boolean trace) {
        this.context = context;
        this.accumulator = new StatsAccumulator(trace);
    }
}
