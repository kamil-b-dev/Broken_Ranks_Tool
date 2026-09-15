package pl.brokenranks.tool.broken_ranks_tool.optimization.advisor;

import static pl.brokenranks.tool.broken_ranks_tool.optimization.advisor.AdvisorStatValues.*;

import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_BONUS_TYPE;
import pl.brokenranks.tool.broken_ranks_tool.equipment.dto.CalculationResultDto;
import pl.brokenranks.tool.broken_ranks_tool.equipment.dto.EquipmentRequest;
import pl.brokenranks.tool.broken_ranks_tool.equipment.dto.EquipmentRequest.SlotData;
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.AdvisorReport;
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.OptimizationResponse;
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.OptimizationSummary;
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.OptimizationSummary.GoalResult;

/** Maps advisor search results to the public optimization response. */
final class AdvisorResponseFactory {
    private final AdvisorPlanResultFactory planResults = new AdvisorPlanResultFactory();
    private final AdvisorDrifMetrics metrics = new AdvisorDrifMetrics();

    OptimizationResponse success(
            AdvisorEquipmentModel model,
            AdvisorSearch search,
            Map<String, SlotData> original,
            CalculationResultDto baselineCalculation,
            List<AdvisorFinalistVerifier.Verified> selected,
            long started) {
        Map<String, String> before = baselineCalculation.stats();
        AdvisorPlanResultFactory.Result output =
                planResults.create(model, search, before, selected);
        Map<String, String> bestStats = selected.isEmpty() ? before : selected.getFirst().stats();
        CalculationResultDto bestCalculation =
                selected.isEmpty() ? baselineCalculation : selected.getFirst().calculation();
        Map<String, SlotData> bestSlots =
                selected.isEmpty() ? original : selected.getFirst().node().slots();
        boolean reached =
                search.reached(
                        selected.isEmpty() ? search.baseline : selected.getFirst().node().stats());
        OptimizationResponse response =
                new OptimizationResponse(
                        model.setup(bestSlots),
                        new OptimizationSummary(
                                true,
                                message(search, selected.size(), reached),
                                metrics.total(bestSlots, model),
                                metrics.power(bestSlots, model),
                                elapsedSeconds(started),
                                List.of(),
                                Map.of(),
                                goals(bestSlots, bestStats, before, model, search),
                                output.variants()),
                        bestCalculation);
        response.setAdvisorReport(
                new AdvisorReport(
                        search.control.evaluated(),
                        search.limited(),
                        search.control.cancelled(),
                        reached,
                        search.baseline[search.options.getGoal().ordinal()],
                        search.options.getGoal().name(),
                        output.plans()));
        return response;
    }

    OptimizationResponse failure(String message, long started) {
        return new OptimizationResponse(
                new EquipmentRequest(),
                new OptimizationSummary(
                        false,
                        message,
                        0,
                        0,
                        elapsedSeconds(started),
                        List.of(),
                        Map.of(),
                        List.of(),
                        List.of()));
    }

    private List<GoalResult> goals(
            Map<String, SlotData> bestSlots,
            Map<String, String> bestStats,
            Map<String, String> before,
            AdvisorEquipmentModel model,
            AdvisorSearch search) {
        return Arrays.stream(TYPES)
                .filter(
                        type ->
                                type == search.options.getGoal()
                                        || parse(before.get(type.name())) != 0
                                        || parse(bestStats.get(type.name())) != 0)
                .map(type -> goal(type, bestSlots, bestStats, model, search))
                .toList();
    }

    private GoalResult goal(
            DRIF_BONUS_TYPE type,
            Map<String, SlotData> bestSlots,
            Map<String, String> bestStats,
            AdvisorEquipmentModel model,
            AdvisorSearch search) {
        double target = goalTarget(search, type);
        return new GoalResult(
                type.name(),
                type.getDescription(),
                type == search.options.getGoal() ? 30 : 1,
                metrics.count(bestSlots, model, type),
                0,
                12,
                bestStats.getOrDefault(type.name(), "0%"),
                Double.isFinite(target) ? String.format(Locale.ROOT, "%.2f%%", target) : null,
                true,
                Double.isFinite(target)
                        ? directed(type, parse(bestStats.get(type.name()))) + AdvisorSearch.EPSILON
                                >= target
                        : null);
    }

    private String message(AdvisorSearch search, int selectedCount, boolean reached) {
        String message;
        if (selectedCount > 0)
            message =
                    "Znaleziono "
                            + selectedCount
                            + " sprawdzonych planów poprawy: "
                            + search.options.getGoal().getDescription()
                            + ".";
        else if (search.reached(search.baseline))
            message = "Obecny build już spełnia zadany cel. Nie potrzebujesz dodatkowych zmian.";
        else
            message =
                    "Nie znaleziono poprawy w sprawdzonym zakresie przy obecnej ochronie modów i dozwolonych zmianach.";
        if (search.control.cancelled())
            message += " Analizę zatrzymano; pokazano sprawdzone wyniki.";
        else if (search.limited())
            message += " Osiągnięto limit wyszukiwania; wynik nie jest gwarancją optimum.";
        if (Double.isFinite(search.target) && !reached) message += " Nie osiągnięto zadanego celu.";
        return message;
    }

    private double goalTarget(AdvisorSearch search, DRIF_BONUS_TYPE type) {
        return type == search.options.getGoal() ? search.target : search.minima[type.ordinal()];
    }

    private double elapsedSeconds(long started) {
        return (System.nanoTime() - started) / 1_000_000_000.0;
    }
}
