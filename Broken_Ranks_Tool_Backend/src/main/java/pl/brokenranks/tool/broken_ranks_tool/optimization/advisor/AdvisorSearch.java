package pl.brokenranks.tool.broken_ranks_tool.optimization.advisor;

import static pl.brokenranks.tool.broken_ranks_tool.optimization.advisor.AdvisorSlotData.signature;
import static pl.brokenranks.tool.broken_ranks_tool.optimization.advisor.AdvisorStatValues.*;

import java.util.*;
import java.util.concurrent.atomic.AtomicBoolean;
import pl.brokenranks.tool.broken_ranks_tool.equipment.dto.EquipmentRequest.SlotData;
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.AdvisorOptions;
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.AdvisorOptions.Strategy;

/** Bounded, deterministic beam over short action plans, including compensating moves. */
final class AdvisorSearch {
    static final double EPSILON = 1e-8;
    final AdvisorEquipmentModel model;
    final AdvisorOptions options;
    final double[] baseline;
    final double[] minima = new double[TYPES.length];
    final double target;
    final double requestedTarget;
    final AdvisorSearchControl control;
    final Comparator<Node> ranking;
    final AdvisorBeamPolicy beamPolicy = new AdvisorBeamPolicy();
    final Set<String> seen = new HashSet<>();
    final List<Node> finalists = new ArrayList<>();
    final List<Node> proofCandidates = new ArrayList<>();
    private final AdvisorActionGenerator actions;
    private boolean exact = true;
    private boolean completed;
    private boolean searchLimited;
    private boolean runFinished;

    record Node(
            Map<String, SlotData> slots,
            double[] stats,
            List<String> actions,
            Set<String> changed,
            int upgrades,
            int effort) {
        int kind() {
            return Math.min(2, upgrades);
        }
    }

    AdvisorSearch(
            AdvisorEquipmentModel model,
            AdvisorOptions options,
            double[] baseline,
            long deadline,
            AtomicBoolean cancelled) {
        this.model = model;
        this.options = options;
        this.baseline = baseline;
        this.control = new AdvisorSearchControl(deadline, cancelled);
        this.actions = new AdvisorActionGenerator(this);
        Arrays.fill(minima, Double.NEGATIVE_INFINITY);
        for (var type : TYPES) {
            if (type == options.getGoal() || Math.abs(baseline[type.ordinal()]) < EPSILON) continue;
            var protection =
                    options.getProtectedModifiers() == null
                            ? null
                            : options.getProtectedModifiers().get(type);
            if (protection == null || protection.isEnabled()) {
                minima[type.ordinal()] =
                        useful(type, baseline[type.ordinal()])
                                - (protection == null ? 0 : protection.getLoss());
            }
        }
        requestedTarget =
                options.getTargetValue() != null
                        ? options.getTargetValue()
                        : options.getTargetGain() != null
                                ? value(baseline) + options.getTargetGain()
                                : Double.POSITIVE_INFINITY;
        Integer cap = options.getGoal().getMaxCap();
        target = cap == null ? requestedTarget : Math.min(requestedTarget, Math.abs(cap));
        ranking =
                AdvisorPlanRanking.create(
                        target,
                        options.getStrategy(),
                        node -> reached(node.stats()),
                        node -> value(node.stats()));
    }

    List<Node> run(Map<String, SlotData> slots) {
        Node initial = new Node(slots, model.evaluate(slots), List.of(), Set.of(), 0, 0);
        seen.add(stateSignature(initial));
        List<Node> beam = List.of(initial);
        for (int depth = 0; depth < options.getMaxActions() && running(); depth++) {
            List<Node> next = new ArrayList<>();
            for (Node node : beam) {
                if (!running()) break;
                actions.generate(
                        node,
                        candidate -> {
                            if (!running() || !seen.add(stateSignature(candidate))) return;
                            control.recordEvaluation();
                            Node scored =
                                    new Node(
                                            candidate.slots(),
                                            model.evaluate(candidate.slots()),
                                            candidate.actions(),
                                            candidate.changed(),
                                            candidate.upgrades(),
                                            candidate.effort());
                            // Allow slightly deficient intermediate plans: another move can
                            // compensate.
                            next.add(scored);
                            if (exact) proofCandidates.add(scored);
                            if (deficit(scored.stats()) <= 0.1 && gain(scored.stats()) > EPSILON)
                                finalists.add(scored);
                            if (exact && next.size() > 1_500) {
                                exact = false;
                                proofCandidates.clear();
                                trimFinalists();
                            }
                            if (!exact && next.size() > 300) trimBeam(next);
                            if (!exact && finalists.size() > 180) trimFinalists();
                        });
            }
            if (!exact) trimBeam(next);
            beam = next;
        }
        completed = running();
        searchLimited = control.limited();
        runFinished = true;
        if (!exact) trimFinalists();
        return List.copyOf(exact ? proofCandidates : finalists);
    }

    boolean running() {
        return control.running();
    }

    boolean limited() {
        return runFinished ? searchLimited : control.limited();
    }

    boolean cancelled() {
        return control.cancelled();
    }

    double value(double[] stats) {
        return useful(options.getGoal(), stats[options.getGoal().ordinal()]);
    }

    double gain(double[] stats) {
        return value(stats) - value(baseline);
    }

    boolean reached(double[] stats) {
        return value(stats) + EPSILON >= target;
    }

    double deficit(double[] stats) {
        double sum = 0;
        for (var type : TYPES)
            sum += Math.max(0, minima[type.ordinal()] - useful(type, stats[type.ordinal()]));
        return sum;
    }

    boolean targetClamped() {
        return Double.isFinite(requestedTarget) && target + EPSILON < requestedTarget;
    }

    Comparator<Node> ranking() {
        return ranking;
    }

    Comparator<Node> minimumChangeRanking() {
        return AdvisorPlanRanking.create(
                target, Strategy.MINIMUM_CHANGE, node -> reached(node.stats()), node -> value(node.stats()));
    }

    Comparator<Node> bestResultRanking() {
        return AdvisorPlanRanking.create(
                target, Strategy.BEST_RESULT, node -> reached(node.stats()), node -> value(node.stats()));
    }

    boolean exhaustive() {
        return exact && completed && !limited() && !control.cancelled();
    }

    private void trimBeam(List<Node> nodes) {
        beamPolicy.trimSearchBeam(
                nodes, ranking, node -> deficit(node.stats()), node -> gain(node.stats()));
    }

    private void trimFinalists() {
        beamPolicy.trimFinalists(finalists, ranking);
    }

    private String stateSignature(Node node) {
        return signature(node.slots())
                + "|"
                + node.changed().stream().sorted().collect(java.util.stream.Collectors.joining(","));
    }

    static String slotName(String key) {
        return switch (key) {
            case "helmet" -> "hełm";
            case "armor" -> "zbroja";
            case "cape" -> "peleryna";
            case "legs" -> "spodnie";
            case "boots" -> "buty";
            case "gloves" -> "rękawice";
            case "belt" -> "pas";
            case "necklace" -> "naszyjnik";
            case "ring1" -> "pierścień 1";
            case "ring2" -> "pierścień 2";
            case "weapon" -> "broń";
            case "shield" -> "druga ręka";
            default -> key;
        };
    }
}
