package pl.brokenranks.tool.broken_ranks_tool.progressionpath.model;

import java.util.HashSet;
import java.util.List;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.CHARACTER_CLASS;

/** Ordered equipment milestones: first is level one, last is the exact target. */
public record ProgressionPath(CHARACTER_CLASS characterClass, List<ProgressionStage> stages) {
    public static final int MAX_STAGES = 160;

    public ProgressionPath {
        if (characterClass == null) {
            throw new IllegalArgumentException("Wybierz profesję dla ścieżki rozwoju.");
        }
        if (stages == null || stages.size() < 2 || stages.size() > MAX_STAGES) {
            throw new IllegalArgumentException("Ścieżka rozwoju musi zawierać od 2 do 160 etapów.");
        }
        var ids = new HashSet<String>();
        int previousLevel = 1;
        for (ProgressionStage stage : stages) {
            if (stage == null) {
                throw new IllegalArgumentException("Ścieżka rozwoju zawiera pusty etap.");
            }
            if (!ids.add(stage.id())) {
                throw new IllegalArgumentException(
                        "Powtórzony identyfikator etapu: " + stage.id() + ".");
            }
            if (stage.characterLevel() < previousLevel) {
                throw new IllegalArgumentException(
                        "Etap '"
                                + stage.id()
                                + "': poziom postaci nie może być niższy niż w poprzednim etapie.");
            }
            previousLevel = stage.characterLevel();
        }
        stages = List.copyOf(stages);
    }
}
