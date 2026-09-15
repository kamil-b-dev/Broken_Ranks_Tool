package pl.brokenranks.tool.broken_ranks_tool.optimization.advisor;

import static pl.brokenranks.tool.broken_ranks_tool.optimization.advisor.AdvisorStatValues.*;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.AdvisorReport;
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.OptimizationSummary.OptimizationVariant;
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.OptimizationSummary.StatChange;

/** Builds the plan and variant views of verified advisor finalists. */
final class AdvisorPlanResultFactory {
    private final AdvisorDrifMetrics metrics = new AdvisorDrifMetrics();

    Result create(
            AdvisorEquipmentModel model,
            AdvisorSearch search,
            Map<String, String> before,
            List<AdvisorFinalistVerifier.Verified> selected) {
        List<OptimizationVariant> variants = new ArrayList<>();
        List<AdvisorReport.Plan> plans = new ArrayList<>();
        for (AdvisorFinalistVerifier.Verified verified : selected) {
            AdvisorSearch.Node node = verified.node();
            variants.add(variant(model, search, before, verified, variants.isEmpty()));
            Map<String, Integer> counts =
                    Arrays.stream(TYPES)
                            .collect(
                                    Collectors.toMap(
                                            Enum::name,
                                            type -> metrics.count(node.slots(), model, type)));
            plans.add(
                    new AdvisorReport.Plan(
                            planKind(node),
                            node.actions(),
                            node.upgrades(),
                            search.reached(node.stats()),
                            counts));
        }
        return new Result(plans, variants);
    }

    private OptimizationVariant variant(
            AdvisorEquipmentModel model,
            AdvisorSearch search,
            Map<String, String> before,
            AdvisorFinalistVerifier.Verified verified,
            boolean recommended) {
        AdvisorSearch.Node node = verified.node();
        List<StatChange> changes =
                Arrays.stream(TYPES)
                        .map(
                                type ->
                                        new StatChange(
                                                type.name(),
                                                before.getOrDefault(type.name(), "0%"),
                                                verified.stats().getOrDefault(type.name(), "0%")))
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
        return new OptimizationVariant(
                recommended,
                planLabel(node),
                search.baseline[search.options.getGoal().ordinal()],
                node.stats()[search.options.getGoal().ordinal()],
                search.gain(node.stats()),
                loss,
                node.actions().size(),
                search.value(node.stats()),
                List.of(),
                changes,
                model.setup(node.slots()),
                verified.calculation());
    }

    private String planKind(AdvisorSearch.Node node) {
        return node.kind() == 0 ? "MOVES" : node.kind() == 1 ? "ONE_UPGRADE" : "PLAN";
    }

    private String planLabel(AdvisorSearch.Node node) {
        return node.kind() == 0
                ? "Same przełożenia"
                : node.kind() == 1 ? "Jedno ulepszenie lub zakup" : "Plan kilku zmian";
    }

    record Result(List<AdvisorReport.Plan> plans, List<OptimizationVariant> variants) {}
}
