package pl.brokenranks.tool.broken_ranks_tool.optimization.advisor;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.function.ToDoubleFunction;

/** Retains bounded, cost-diverse search and finalist beams. */
final class AdvisorBeamPolicy {
    private static final int BEAM_PER_KIND = 8;

    void trimSearchBeam(
            List<AdvisorSearch.Node> nodes,
            Comparator<AdvisorSearch.Node> ranking,
            ToDoubleFunction<AdvisorSearch.Node> deficit,
            ToDoubleFunction<AdvisorSearch.Node> gain) {
        List<AdvisorSearch.Node> selected = new ArrayList<>();
        for (int kind = 0; kind < 3; kind++) {
            int group = kind;
            List<AdvisorSearch.Node> matching =
                    nodes.stream().filter(node -> node.kind() == group).toList();
            matching.stream()
                    .sorted(Comparator.comparingDouble(deficit).thenComparing(ranking))
                    .limit(BEAM_PER_KIND)
                    .forEach(selected::add);
            matching.stream()
                    .sorted(
                            Comparator.comparingDouble(
                                    node ->
                                            -(gain.applyAsDouble(node)
                                                    - deficit.applyAsDouble(node))))
                    .limit(4)
                    .filter(node -> !selected.contains(node))
                    .forEach(selected::add);
        }
        nodes.clear();
        nodes.addAll(selected);
    }

    void trimFinalists(List<AdvisorSearch.Node> finalists, Comparator<AdvisorSearch.Node> ranking) {
        List<AdvisorSearch.Node> selected = new ArrayList<>();
        for (int kind = 0; kind < 3; kind++) {
            int group = kind;
            finalists.stream()
                    .filter(node -> node.kind() == group)
                    .sorted(ranking)
                    .limit(8)
                    .forEach(selected::add);
        }
        finalists.clear();
        finalists.addAll(selected);
    }
}
