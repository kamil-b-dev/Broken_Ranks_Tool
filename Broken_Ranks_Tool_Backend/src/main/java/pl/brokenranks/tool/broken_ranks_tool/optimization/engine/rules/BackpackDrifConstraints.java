package pl.brokenranks.tool.broken_ranks_tool.optimization.engine.rules;

import java.util.HashSet;
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.*;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model.*;

/** Inventory limits are independent of user-selected quantity goals and catalog availability. */
public final class BackpackDrifConstraints {
    private BackpackDrifConstraints() {}

    public static String validateRequest(OptimizationRequest request) {
        var entries = request.getBackpackDrifs();
        if (entries != null && entries.size() > 200) return "Plecak mieści maksymalnie 200 drifów.";
        if (!request.isBackpackOnly())
            return entries != null && !entries.isEmpty()
                    ? "Drify plecaka wymagają opcji Użyj drifów z plecaka."
                    : null;
        if (request.getMode() != OptimizationMode.BUILD_FROM_SCRATCH
                || request.getConfigurationMode() != BuildConfigurationMode.ADVANCED)
            return "Opcja Użyj drifów z plecaka jest dostępna w zaawansowanym trybie od zera.";
        if (request.isGenerateVariants())
            return "Tryb drifów z plecaka nie obsługuje dodatkowych wariantów.";
        if (entries == null) return "Brak listy drifów plecaka.";
        var ids = new HashSet<String>();
        for (var entry : entries) {
            if (entry == null
                    || entry.getId() == null
                    || entry.getId().isBlank()
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

    public static String validateCatalog(OptimizationContext context) {
        if (!context.request().isBackpackOnly()) return null;
        for (var entry : context.request().getBackpackDrifs()) {
            var drif = context.drifs().get(entry.getTemplateId());
            if (drif == null
                    || drif.getSize() == null
                    || drif.getBonusType() == null
                    || entry.getLevel() > drif.getSize().getMaxLevel())
                return "Niepoprawny szablon lub poziom drifa plecaka: " + entry.getId() + ".";
        }
        return null;
    }
}
