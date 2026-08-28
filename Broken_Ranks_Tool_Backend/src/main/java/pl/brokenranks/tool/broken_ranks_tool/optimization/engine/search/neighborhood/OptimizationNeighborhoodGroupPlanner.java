package pl.brokenranks.tool.broken_ranks_tool.optimization.engine.search.neighborhood;

import static pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model.OptimizationSearchModel.SlotContext;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

/** Plans bounded slot groups explored by large-neighborhood search. */
final class OptimizationNeighborhoodGroupPlanner {

    List<List<SlotContext>> createGroups(List<SlotContext> slots) {
        List<SlotContext> optimizable =
                slots.stream()
                        .filter(SlotContext::optimizable)
                        .sorted(Comparator.comparingDouble(SlotContext::drifBonus).reversed())
                        .toList();
        List<List<SlotContext>> groups = singleAndPairGroups(optimizable);
        addEdgeTripleGroups(groups, optimizable);
        return groups;
    }

    private List<List<SlotContext>> singleAndPairGroups(List<SlotContext> slots) {
        List<List<SlotContext>> groups = new ArrayList<>();
        slots.forEach(slot -> groups.add(List.of(slot)));
        for (int first = 0; first < slots.size(); first++) {
            for (int second = slots.size() - 1; second > first; second--) {
                groups.add(List.of(slots.get(first), slots.get(second)));
            }
        }
        return groups;
    }

    private void addEdgeTripleGroups(List<List<SlotContext>> groups, List<SlotContext> slots) {
        int edgeCount = Math.min(3, slots.size() / 2);
        for (int high = 0; high < edgeCount; high++) {
            for (int low = slots.size() - edgeCount; low < slots.size(); low++) {
                for (int middle = edgeCount; middle < slots.size() - edgeCount; middle++) {
                    groups.add(List.of(slots.get(high), slots.get(middle), slots.get(low)));
                }
            }
        }
    }
}
