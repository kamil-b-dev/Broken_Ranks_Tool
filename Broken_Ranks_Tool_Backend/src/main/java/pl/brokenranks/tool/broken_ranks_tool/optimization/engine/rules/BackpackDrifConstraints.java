package pl.brokenranks.tool.broken_ranks_tool.optimization.engine.rules;

import java.util.HashSet;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.validator.EquipmentPlacementRules;
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.*;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model.*;

/** Inventory limits are independent of user-selected quantity goals and catalog availability. */
public final class BackpackDrifConstraints {
    private BackpackDrifConstraints() {}

    public static String validateRequest(OptimizationRequest request) {
        var entries = request.getBackpackDrifs();
        if (entries != null && entries.size() > 200) return "Plecak mieści maksymalnie 200 drifów.";
        boolean reorganize = request.getMode() == OptimizationMode.REORGANIZE;
        if (request.getBackpackSlotCount() != null
                && (!reorganize
                        || request.getBackpackSlotCount() < 0
                        || request.getBackpackSlotCount() > 200
                        || entries != null && entries.size() > request.getBackpackSlotCount()))
            return "Niepoprawna liczba zajętych miejsc plecaka dla reorganizacji.";
        if (reorganize
                && (request.isBackpackOnly()
                        || request.getConfigurationMode() != BuildConfigurationMode.ADVANCED
                        || request.isGenerateVariants()
                        || request.isForceMaximizationByDrifBonus()))
            return "Reorganizacja używa posiadanej puli bez opcji trybu od zera i dodatkowych wariantów.";
        if (!request.isBackpackOnly() && !reorganize)
            return entries != null && !entries.isEmpty()
                    ? "Drify plecaka wymagają opcji Użyj drifów z plecaka."
                    : null;
        if (!reorganize
                && (request.getMode() != OptimizationMode.BUILD_FROM_SCRATCH
                        || request.getConfigurationMode() != BuildConfigurationMode.ADVANCED))
            return "Opcja Użyj drifów z plecaka jest dostępna w zaawansowanym trybie od zera.";
        if (request.isGenerateVariants())
            return "Tryb drifów z plecaka nie obsługuje dodatkowych wariantów.";
        var task = reorganize ? request.getReorganization() : null;
        if (task != null) {
            if (task.getTask() == ReorganizationOptions.Task.INSERT) {
                var chosen = task.requestedInsertions();
                var chosenIds = new HashSet<String>();
                for (var insertion : chosen) {
                    if (insertion == null
                            || insertion.getEntryId() == null
                            || insertion.getEntryId().isBlank()
                            || !chosenIds.add(insertion.getEntryId()))
                        return "Wybierz różne konkretne osobne drify z plecaka.";
                }
                if (entries == null
                        || chosenIds.isEmpty()
                        || entries.size() != chosenIds.size()
                        || entries.stream()
                                .anyMatch(
                                        entry ->
                                                entry == null
                                                        || !chosenIds.contains(entry.getId())))
                    return "Wstawianie wymaga dokładnie wskazanych sztuk z plecaka.";
            } else if ((task.getTask() == ReorganizationOptions.Task.UPGRADE
                            || task.getTask() == ReorganizationOptions.Task.RESERVE)
                    && entries != null
                    && !entries.isEmpty())
                return "To zadanie korzysta wyłącznie z założonych drifów.";
        }
        if (entries == null) return reorganize ? null : "Brak listy drifów plecaka.";
        var ids = new HashSet<String>();
        for (var entry : entries) {
            if (entry == null
                    || entry.getId() == null
                    || entry.getId()
                            .codePoints()
                            .allMatch(
                                    code ->
                                            Character.isWhitespace(code)
                                                    || Character.isSpaceChar(code)
                                                    || code == 0xfeff)
                    || entry.getId().length() > 128
                    || !ids.add(entry.getId())
                    || entry.getTemplateId() == null
                    || entry.getTemplateId() < 1
                    || entry.getLevel() == null
                    || entry.getLevel() < 1
                    || entry.getLevel() > 21)
                return "Plecak zawiera niepoprawny lub powtórzony drif.";
        }
        return null;
    }

    public static String validateCatalog(
            OptimizationContext context, EquipmentPlacementRules placementRules) {
        if (!context.request().isBackpackOnly()
                && context.request().getMode() != OptimizationMode.REORGANIZE) return null;
        for (var entry :
                context.request().getBackpackDrifs() == null
                        ? java.util.List.<OptimizationRequest.BackpackDrif>of()
                        : context.request().getBackpackDrifs()) {
            var drif = context.drifs().get(entry.getTemplateId());
            if (!placementRules.isValidDrif(drif)
                    || entry.getLevel() > drif.getSize().getMaxLevel())
                return "Niepoprawny szablon lub poziom drifa plecaka: " + entry.getId() + ".";
        }
        return null;
    }
}
