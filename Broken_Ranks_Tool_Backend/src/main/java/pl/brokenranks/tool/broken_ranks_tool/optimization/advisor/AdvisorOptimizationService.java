package pl.brokenranks.tool.broken_ranks_tool.optimization.advisor;

import static pl.brokenranks.tool.broken_ranks_tool.optimization.advisor.AdvisorEquipmentModel.*;
import static pl.brokenranks.tool.broken_ranks_tool.optimization.constraints.EquipmentSlotDataCopier.copySlots;

import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_BONUS_TYPE;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.rules.*;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.util.DrifPowerRules;
import pl.brokenranks.tool.broken_ranks_tool.equipment.dto.EquipmentRequest;
import pl.brokenranks.tool.broken_ranks_tool.equipment.dto.EquipmentRequest.SlotData;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.*;
import pl.brokenranks.tool.broken_ranks_tool.equipment.persistence.repository.*;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.EquipmentStatsCalculatorService;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.calculator.input.EquipmentDataProvider.CalculationContext;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.calculator.processor.*;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.validator.*;
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.*;
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.OptimizationSummary.*;

/** Owns one bounded advisor run and verifies its finalists with the shared calculator. */
@Service
@RequiredArgsConstructor
public class AdvisorOptimizationService {
    private final ItemTemplateRepository itemRepository;
    private final DrifTemplateRepository drifRepository;
    private final OrbTemplateRepository orbRepository;
    private final EquipmentPlacementRules placement;
    private final UpgradeLevelPolicy levels;
    private final EquipmentRulesRegistry rules;
    private final ItemStatProcessor itemProcessor;
    private final OrbStatProcessor orbProcessor;
    private final DrifValueCalculator values;
    private final EquipmentStatsCalculatorService calculator;
    private final AdvisorRunRegistry runs;

    public OptimizationResponse optimize(OptimizationRequest request) {
        long started = System.nanoTime();
        AdvisorOptions options = request.getAdvisor();
        if (!validOptions(options))
            return failure("Nieprawidłowy cel lub zakres analizy Doradcy.", started);
        var cancelled = runs.start(options.getRunId());
        try {
            CalculationContext templates =
                    new CalculationContext(
                            itemRepository.findAll().stream()
                                    .collect(
                                            Collectors.toMap(
                                                    ItemTemplate::getId,
                                                    Function.identity(),
                                                    (a, b) -> a,
                                                    TreeMap::new)),
                            orbRepository.findAll().stream()
                                    .collect(
                                            Collectors.toMap(
                                                    OrbTemplate::getId,
                                                    Function.identity(),
                                                    (a, b) -> a,
                                                    TreeMap::new)),
                            drifRepository.findAll().stream()
                                    .collect(
                                            Collectors.toMap(
                                                    DrifTemplate::getId,
                                                    Function.identity(),
                                                    (a, b) -> a,
                                                    TreeMap::new)));
            AdvisorEquipmentModel model =
                    new AdvisorEquipmentModel(
                            templates,
                            request,
                            placement,
                            levels,
                            rules,
                            itemProcessor,
                            orbProcessor,
                            values);
            Map<String, SlotData> slots = copySlots(request.getOriginalSlots());
            slots.entrySet()
                    .removeIf(e -> e.getValue() == null || e.getValue().getItemId() == null);
            if (slots.isEmpty() || !model.valid(slots)) {
                return failure(
                        "Popraw obecny build: sprawdź tier, poziomy, gniazda, pojemność i unikalność kamieni.",
                        started);
            }
            Map<String, String> before = calculator.calculateTotalStats(model.setup(slots));
            double[] baseline = parsed(before);
            long deadline = started + options.getTimeBudgetMs() * 1_000_000L;
            // Reserve part of the common budget for final calculator verification.
            long searchDeadline =
                    deadline - Math.min(300, options.getTimeBudgetMs() / 5) * 1_000_000L;
            AdvisorSearch search =
                    new AdvisorSearch(model, options, baseline, searchDeadline, cancelled);
            if (search.reached(baseline))
                return response(model, search, slots, before, List.of(), started);
            List<AdvisorSearch.Node> candidates = new ArrayList<>(search.run(slots));
            List<Verified> verified = new ArrayList<>();
            // Interleave cost classes so verification also preserves a pure-move alternative.
            candidates.sort(search.ranking());
            List<AdvisorSearch.Node> queue = diversify(candidates);
            int checks = 0;
            for (var candidate : queue) {
                if (checks >= 18 || System.nanoTime() >= deadline) break;
                checks++;
                Map<String, String> actual =
                        calculator.calculateTotalStats(model.setup(candidate.slots()));
                double[] stats = parsed(actual);
                if (search.deficit(stats) > AdvisorSearch.EPSILON
                        || search.gain(stats) <= AdvisorSearch.EPSILON) continue;
                var checked =
                        new AdvisorSearch.Node(
                                candidate.slots(),
                                stats,
                                candidate.actions(),
                                candidate.changed(),
                                candidate.upgrades(),
                                candidate.effort());
                verified.add(new Verified(checked, actual));
            }
            verified.sort((a, b) -> search.ranking().compare(a.node(), b.node()));
            List<Verified> allVerified = List.copyOf(verified);
            verified.removeIf(
                    candidate ->
                            allVerified.stream()
                                    .anyMatch(
                                            other ->
                                                    other != candidate
                                                            && dominates(
                                                                    other.node(),
                                                                    candidate.node(),
                                                                    search)));
            List<Verified> selected = new ArrayList<>();
            if (!verified.isEmpty()) {
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
            }
            return response(model, search, slots, before, selected, started);
        } finally {
            runs.finish(options.getRunId());
        }
    }

    private List<AdvisorSearch.Node> diversify(List<AdvisorSearch.Node> candidates) {
        List<AdvisorSearch.Node> queue = new ArrayList<>();
        for (int round = 0; round < 8; round++) {
            for (int kind = 0; kind < 3; kind++) {
                int group = kind;
                candidates.stream()
                        .filter(n -> n.kind() == group)
                        .skip(round)
                        .findFirst()
                        .ifPresent(queue::add);
            }
        }
        return queue;
    }

    private OptimizationResponse response(
            AdvisorEquipmentModel model,
            AdvisorSearch search,
            Map<String, SlotData> original,
            Map<String, String> before,
            List<Verified> selected,
            long started) {
        List<OptimizationVariant> variants = new ArrayList<>();
        List<AdvisorReport.Plan> plans = new ArrayList<>();
        for (Verified verified : selected) {
            var node = verified.node();
            String kind = node.kind() == 0 ? "MOVES" : node.kind() == 1 ? "ONE_UPGRADE" : "PLAN";
            String label =
                    node.kind() == 0
                            ? "Same przełożenia"
                            : node.kind() == 1 ? "Jedno ulepszenie lub zakup" : "Plan kilku zmian";
            List<StatChange> changes =
                    Arrays.stream(TYPES)
                            .map(
                                    type ->
                                            new StatChange(
                                                    type.name(),
                                                    before.getOrDefault(type.name(), "0%"),
                                                    verified.stats()
                                                            .getOrDefault(type.name(), "0%")))
                            .toList();
            double loss =
                    Arrays.stream(TYPES)
                            .mapToDouble(
                                    type ->
                                            Math.max(
                                                    0,
                                                    directed(type, search.baseline[type.ordinal()])
                                                            - directed(
                                                                    type,
                                                                    node.stats()[type.ordinal()])))
                            .sum();
            variants.add(
                    new OptimizationVariant(
                            variants.isEmpty(),
                            label,
                            search.baseline[search.options.getGoal().ordinal()],
                            node.stats()[search.options.getGoal().ordinal()],
                            search.gain(node.stats()),
                            loss,
                            node.actions().size(),
                            search.value(node.stats()),
                            List.of(),
                            changes,
                            model.setup(node.slots())));
            Map<String, Integer> counts =
                    Arrays.stream(TYPES)
                            .collect(
                                    Collectors.toMap(
                                            Enum::name, type -> count(node.slots(), model, type)));
            plans.add(
                    new AdvisorReport.Plan(
                            kind,
                            node.actions(),
                            node.upgrades(),
                            search.reached(node.stats()),
                            counts));
        }
        Map<String, String> bestStats = selected.isEmpty() ? before : selected.getFirst().stats();
        Map<String, SlotData> bestSlots =
                selected.isEmpty() ? original : selected.getFirst().node().slots();
        List<GoalResult> goals =
                Arrays.stream(TYPES)
                        .filter(
                                type ->
                                        type == search.options.getGoal()
                                                || parse(before.get(type.name())) != 0
                                                || parse(bestStats.get(type.name())) != 0)
                        .map(
                                type ->
                                        new GoalResult(
                                                type.name(),
                                                type.getDescription(),
                                                type == search.options.getGoal() ? 30 : 1,
                                                count(bestSlots, model, type),
                                                0,
                                                12,
                                                bestStats.getOrDefault(type.name(), "0%"),
                                                Double.isFinite(goalTarget(search, type))
                                                        ? String.format(
                                                                Locale.ROOT,
                                                                "%.2f%%",
                                                                goalTarget(search, type))
                                                        : null,
                                                true,
                                                Double.isFinite(goalTarget(search, type))
                                                        ? directed(
                                                                                type,
                                                                                parse(
                                                                                        bestStats
                                                                                                .get(
                                                                                                        type
                                                                                                                .name())))
                                                                        + AdvisorSearch.EPSILON
                                                                >= goalTarget(search, type)
                                                        : null))
                        .toList();
        String message =
                selected.isEmpty() && search.reached(search.baseline)
                        ? "Obecny build już spełnia zadany cel. Nie potrzebujesz dodatkowych zmian."
                        : selected.isEmpty()
                                ? "Nie znaleziono poprawy w sprawdzonym zakresie przy obecnej ochronie modów i dozwolonych zmianach."
                                : "Znaleziono "
                                        + selected.size()
                                        + " sprawdzonych planów poprawy: "
                                        + search.options.getGoal().getDescription()
                                        + ".";
        if (search.control.cancelled())
            message += " Analizę zatrzymano; pokazano sprawdzone wyniki.";
        else if (search.limited())
            message += " Osiągnięto limit wyszukiwania; wynik nie jest gwarancją optimum.";
        boolean reached =
                search.reached(
                        selected.isEmpty() ? search.baseline : selected.getFirst().node().stats());
        if (Double.isFinite(search.target) && !reached) message += " Nie osiągnięto zadanego celu.";
        int total = Arrays.stream(TYPES).mapToInt(type -> count(bestSlots, model, type)).sum();
        int power =
                bestSlots.values().stream()
                        .filter(s -> !model.special(s))
                        .mapToInt(
                                s -> {
                                    int sum = 0;
                                    for (int i = 0; i < size(s); i++)
                                        if (id(s, i) != null)
                                            sum +=
                                                    DrifPowerRules.power(
                                                            model.templates
                                                                    .drifs()
                                                                    .get(id(s, i))
                                                                    .getBonusType()
                                                                    .getBasePower(),
                                                            level(s, i));
                                    return sum;
                                })
                        .sum();
        OptimizationResponse response =
                new OptimizationResponse(
                        model.setup(bestSlots),
                        new OptimizationSummary(
                                true,
                                message,
                                total,
                                power,
                                (System.nanoTime() - started) / 1_000_000_000.0,
                                List.of(),
                                Map.of(),
                                goals,
                                variants));
        response.setAdvisorReport(
                new AdvisorReport(
                        search.control.evaluated(),
                        search.limited(),
                        search.control.cancelled(),
                        reached,
                        search.baseline[search.options.getGoal().ordinal()],
                        search.options.getGoal().name(),
                        plans));
        return response;
    }

    private int count(
            Map<String, SlotData> slots, AdvisorEquipmentModel model, DRIF_BONUS_TYPE type) {
        return slots.values().stream()
                .mapToInt(
                        slot -> {
                            int count = 0;
                            for (int i = 0; i < size(slot); i++)
                                if (id(slot, i) != null
                                        && model.templates.drifs().get(id(slot, i)).getBonusType()
                                                == type) count++;
                            return count;
                        })
                .sum();
    }

    private double goalTarget(AdvisorSearch search, DRIF_BONUS_TYPE type) {
        return type == search.options.getGoal() ? search.target : search.minima[type.ordinal()];
    }

    /** Avoid suggesting an extra upgrade when a simpler plan achieves at least the same effect. */
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

    private boolean validOptions(AdvisorOptions options) {
        if (options == null
                || options.getGoal() == null
                || options.getAllowedChanges() == null
                || options.getTimeBudgetMs() < 200
                || options.getTimeBudgetMs() > 5000
                || options.getMaxActions() < 1
                || options.getMaxActions() > 3
                || options.getTargetValue() != null && options.getTargetGain() != null)
            return false;
        if (options.getTargetValue() != null
                && (!Double.isFinite(options.getTargetValue()) || options.getTargetValue() < 0))
            return false;
        if (options.getTargetGain() != null
                && (!Double.isFinite(options.getTargetGain()) || options.getTargetGain() < 0))
            return false;
        return options.getProtectedModifiers() == null
                || options.getProtectedModifiers().entrySet().stream()
                        .allMatch(
                                e ->
                                        e.getKey() != null
                                                && e.getValue() != null
                                                && Double.isFinite(e.getValue().getLoss())
                                                && e.getValue().getLoss() >= 0);
    }

    private OptimizationResponse failure(String message, long started) {
        return new OptimizationResponse(
                new EquipmentRequest(),
                new OptimizationSummary(
                        false,
                        message,
                        0,
                        0,
                        (System.nanoTime() - started) / 1_000_000_000.0,
                        List.of(),
                        Map.of(),
                        List.of(),
                        List.of()));
    }

    private record Verified(AdvisorSearch.Node node, Map<String, String> stats) {}
}
