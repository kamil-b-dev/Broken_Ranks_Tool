package pl.brokenranks.tool.broken_ranks_tool.optimization.advisor;

import static pl.brokenranks.tool.broken_ranks_tool.optimization.advisor.AdvisorStatValues.parsed;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import pl.brokenranks.tool.broken_ranks_tool.equipment.dto.CalculationResultDto;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.EquipmentStatsCalculatorService;

/** Verifies approximate candidates with the authoritative equipment calculator. */
final class AdvisorFinalistVerifier {
    List<Verified> verify(
            List<AdvisorSearch.Node> candidates,
            AdvisorEquipmentModel model,
            AdvisorSearch search,
            EquipmentStatsCalculatorService calculator,
            long deadline) {
        candidates.sort(search.ranking());
        List<Verified> verified = new ArrayList<>();
        int checks = 0;
        for (AdvisorSearch.Node candidate : diversify(candidates)) {
            if (checks >= 18 || System.nanoTime() >= deadline) break;
            checks++;
            CalculationResultDto calculation =
                    calculator.calculateWithSources(model.setup(candidate.slots()));
            Map<String, String> actual = calculation.stats();
            double[] stats = parsed(actual);
            if (search.deficit(stats) > AdvisorSearch.EPSILON
                    || search.gain(stats) <= AdvisorSearch.EPSILON) continue;
            verified.add(new Verified(withStats(candidate, stats), calculation));
        }
        verified.sort((a, b) -> search.ranking().compare(a.node(), b.node()));
        List<Verified> all = List.copyOf(verified);
        verified.removeIf(
                candidate ->
                        all.stream()
                                .anyMatch(
                                        other ->
                                                other != candidate
                                                        && dominates(
                                                                other.node(),
                                                                candidate.node(),
                                                                search)));
        return select(verified);
    }

    private List<AdvisorSearch.Node> diversify(List<AdvisorSearch.Node> candidates) {
        List<AdvisorSearch.Node> queue = new ArrayList<>();
        for (int round = 0; round < 8; round++)
            for (int kind = 0; kind < 3; kind++) {
                int group = kind;
                candidates.stream()
                        .filter(n -> n.kind() == group)
                        .skip(round)
                        .findFirst()
                        .ifPresent(queue::add);
            }
        return queue;
    }

    private List<Verified> select(List<Verified> verified) {
        if (verified.isEmpty()) return List.of();
        List<Verified> selected = new ArrayList<>();
        selected.add(verified.getFirst());
        for (int kind = 0; kind < 3; kind++) {
            int group = kind;
            verified.stream()
                    .filter(v -> v.node().kind() == group)
                    .findFirst()
                    .filter(v -> !selected.contains(v))
                    .ifPresent(selected::add);
        }
        verified.stream()
                .filter(v -> !selected.contains(v))
                .limit(6 - selected.size())
                .forEach(selected::add);
        return selected;
    }

    private AdvisorSearch.Node withStats(AdvisorSearch.Node n, double[] stats) {
        return new AdvisorSearch.Node(
                n.slots(), stats, n.actions(), n.changed(), n.upgrades(), n.effort());
    }

    private boolean dominates(AdvisorSearch.Node a, AdvisorSearch.Node b, AdvisorSearch search) {
        return search.value(a.stats()) + AdvisorSearch.EPSILON >= search.value(b.stats())
                && a.upgrades() <= b.upgrades()
                && a.effort() <= b.effort()
                && a.actions().size() <= b.actions().size()
                && (search.value(a.stats()) > search.value(b.stats()) + AdvisorSearch.EPSILON
                        || a.upgrades() < b.upgrades()
                        || a.effort() < b.effort()
                        || a.actions().size() < b.actions().size());
    }

    record Verified(AdvisorSearch.Node node, CalculationResultDto calculation) {
        Map<String, String> stats() {
            return calculation.stats();
        }
    }
}
