package pl.brokenranks.tool.broken_ranks_tool.progressionpath.service;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.DrifTemplate;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.validator.EquipmentPlacementRules;
import pl.brokenranks.tool.broken_ranks_tool.progressionpath.model.ProgressionDrif;
import pl.brokenranks.tool.broken_ranks_tool.progressionpath.model.ProgressionDrifOperation;

/**
 * Replays ordinary-stone ownership and monotone upgrades on detached state.
 * Item capacity, tier, and built-in drifs must additionally be checked against stage equipment.
 */
@Service
@RequiredArgsConstructor
public class ProgressionDrifReplayService {
    private final EquipmentPlacementRules placementRules;

    public List<ProgressionDrif> replay(
            List<ProgressionDrif> initial,
            List<ProgressionDrifOperation> operations,
            Map<Long, DrifTemplate> templates) {
        if (initial == null || operations == null || templates == null) {
            throw new IllegalArgumentException(
                    "Odtworzenie drifów wymaga zasobów, operacji i szablonów.");
        }
        var state = new LinkedHashMap<String, ProgressionDrif>();
        for (ProgressionDrif drif : initial) {
            validate(drif, templates);
            add(state, drif);
        }
        for (int index = 0; index < operations.size(); index++) {
            try {
                switch (operations.get(index)) {
                    case ProgressionDrifOperation.Acquire acquire -> {
                        validate(acquire.drif(), templates);
                        if (acquire.drif().position() != null) {
                            throw new IllegalArgumentException(
                                    "Pozyskany drif musi najpierw trafić do puli wolnych kamieni.");
                        }
                        add(state, acquire.drif());
                    }
                    case ProgressionDrifOperation.Move move -> {
                        ProgressionDrif current = require(state, move.instanceId());
                        if (!Objects.equals(current.position(), move.from())) {
                            throw new IllegalArgumentException(
                                    "Drif nie znajduje się we wskazanym miejscu źródłowym.");
                        }
                        if (Objects.equals(move.from(), move.to())) {
                            throw new IllegalArgumentException(
                                    "Przeniesienie musi zmieniać pozycję drifa.");
                        }
                        ensureFree(state, move.to());
                        state.put(
                                current.instanceId(),
                                new ProgressionDrif(
                                        current.instanceId(),
                                        current.templateId(),
                                        current.level(),
                                        move.to()));
                    }
                    case ProgressionDrifOperation.Upgrade upgrade -> {
                        ProgressionDrif current = require(state, upgrade.instanceId());
                        var upgraded =
                                new ProgressionDrif(
                                        current.instanceId(),
                                        upgrade.templateId(),
                                        upgrade.level(),
                                        current.position());
                        validate(upgraded, templates);
                        var before = templates.get(current.templateId());
                        var after = templates.get(upgraded.templateId());
                        if (before.getBonusType() != after.getBonusType()) {
                            throw new IllegalArgumentException(
                                    "Ulepszenie nie może zmieniać typu bonusu drifa.");
                        }
                        if (after.getSize().ordinal() < before.getSize().ordinal()
                                || upgraded.level() < current.level()) {
                            throw new IllegalArgumentException(
                                    "Nie można obniżać rozmiaru ani poziomu drifa.");
                        }
                        if (after.getSize() == before.getSize()
                                && upgraded.level() == current.level()) {
                            throw new IllegalArgumentException(
                                    "Ulepszenie musi zwiększać rozmiar lub poziom drifa.");
                        }
                        state.put(current.instanceId(), upgraded);
                    }
                    case null -> throw new IllegalArgumentException("Pusta operacja drifa.");
                }
            } catch (IllegalArgumentException ex) {
                throw new IllegalArgumentException(
                        "Operacja " + (index + 1) + ": " + ex.getMessage(), ex);
            }
        }
        return List.copyOf(state.values());
    }

    private void validate(ProgressionDrif drif, Map<Long, DrifTemplate> templates) {
        if (drif == null) throw new IllegalArgumentException("Pusta sztuka drifa.");
        var template = templates.get(drif.templateId());
        if (!placementRules.isValidDrif(template)
                || !Objects.equals(template.getId(), drif.templateId())) {
            throw new IllegalArgumentException(
                    "Nieprawidłowy szablon drifa o ID " + drif.templateId() + ".");
        }
        if (drif.level() > template.getSize().getMaxLevel()) {
            throw new IllegalArgumentException("Poziom drifa przekracza limit jego rozmiaru.");
        }
    }

    private void add(Map<String, ProgressionDrif> state, ProgressionDrif drif) {
        if (state.containsKey(drif.instanceId())) {
            throw new IllegalArgumentException(
                    "Powtórzona sztuka drifa: " + drif.instanceId() + ".");
        }
        ensureFree(state, drif.position());
        state.put(drif.instanceId(), drif);
    }

    private void ensureFree(Map<String, ProgressionDrif> state, ProgressionDrif.Position position) {
        if (position != null
                && state.values().stream().anyMatch(drif -> position.equals(drif.position()))) {
            throw new IllegalArgumentException("Docelowe gniazdo drifa jest zajęte.");
        }
    }

    private ProgressionDrif require(Map<String, ProgressionDrif> state, String id) {
        ProgressionDrif drif = state.get(id);
        if (drif == null)
            throw new IllegalArgumentException("Nie znaleziono sztuki drifa: " + id + ".");
        return drif;
    }
}
