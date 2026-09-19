package pl.brokenranks.tool.broken_ranks_tool.optimization.advisor;

import static pl.brokenranks.tool.broken_ranks_tool.optimization.advisor.AdvisorStatValues.parsed;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.function.LongSupplier;
import pl.brokenranks.tool.broken_ranks_tool.equipment.dto.CalculationResultDto;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.EquipmentStatsCalculatorService;

/** Verifies approximate candidates with the authoritative equipment calculator. */
final class AdvisorFinalistVerifier {
    private final LongSupplier clock;

    AdvisorFinalistVerifier() {
        this(System::nanoTime);
    }

    AdvisorFinalistVerifier(LongSupplier clock) {
        this.clock = clock;
    }

    Result verify(
            List<AdvisorSearch.Node> candidates,
            AdvisorEquipmentModel model,
            AdvisorSearch search,
            EquipmentStatsCalculatorService calculator,
            long deadline) {
        candidates = new ArrayList<>(candidates);
        candidates.sort(search.ranking());
        List<Verified> verified = new ArrayList<>();
        List<AdvisorSearch.Node> queue =
                search.exhaustive() ? List.copyOf(candidates) : diversify(candidates, search);
        int checkLimit = search.exhaustive() ? queue.size() : Math.min(18, queue.size());
        int checks = 0;
        boolean deadlineReached = false;
        for (AdvisorSearch.Node candidate : queue) {
            if (checks >= checkLimit || search.cancelled()) break;
            if (clock.getAsLong() >= deadline) {
                deadlineReached = true;
                break;
            }
            checks++;
            CalculationResultDto calculation =
                    calculator.calculateWithSources(model.setup(candidate.slots()));
            Map<String, String> actual = calculation.stats();
            double[] stats = parsed(actual);
            if (clock.getAsLong() >= deadline) deadlineReached = true;
            if (search.deficit(stats) <= AdvisorSearch.EPSILON
                    && search.gain(stats) > AdvisorSearch.EPSILON)
                verified.add(new Verified(withStats(candidate, stats), calculation));
            if (deadlineReached) break;
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
        return new Result(
                select(verified, search),
                search.exhaustive()
                        && checks == queue.size()
                        && !deadlineReached
                        && !search.cancelled(),
                checks,
                queue.size(),
                deadlineReached);
    }

    private List<AdvisorSearch.Node> diversify(
            List<AdvisorSearch.Node> candidates, AdvisorSearch search) {
        List<AdvisorSearch.Node> queue = new ArrayList<>();
        addBest(queue, candidates, search.ranking());
        addBest(queue, candidates, search.minimumChangeRanking());
        addBest(queue, candidates, search.bestResultRanking());
        for (int round = 0; round < 8; round++)
            for (int kind = 0; kind < 3; kind++) {
                int group = kind;
                candidates.stream()
                        .filter(n -> n.kind() == group)
                        .skip(round)
                        .findFirst()
                        .filter(node -> !queue.contains(node))
                        .ifPresent(queue::add);
            }
        return queue;
    }

    private void addBest(
            List<AdvisorSearch.Node> queue,
            List<AdvisorSearch.Node> candidates,
            java.util.Comparator<AdvisorSearch.Node> ranking) {
        candidates.stream().min(ranking).filter(node -> !queue.contains(node)).ifPresent(queue::add);
    }

    private List<Verified> select(List<Verified> verified, AdvisorSearch search) {
        if (verified.isEmpty()) return List.of();
        List<Verified> selected = new ArrayList<>();
        selected.add(verified.getFirst());
        addBestVerified(selected, verified, search.minimumChangeRanking());
        addBestVerified(selected, verified, search.bestResultRanking());
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

    private void addBestVerified(
            List<Verified> selected,
            List<Verified> verified,
            java.util.Comparator<AdvisorSearch.Node> ranking) {
        verified.stream()
                .min((left, right) -> ranking.compare(left.node(), right.node()))
                .filter(value -> !selected.contains(value))
                .ifPresent(selected::add);
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

    record Result(
            List<Verified> selected,
            boolean proofComplete,
            int verifiedCandidates,
            int candidateCount,
            boolean timeLimitReached) {}
}
