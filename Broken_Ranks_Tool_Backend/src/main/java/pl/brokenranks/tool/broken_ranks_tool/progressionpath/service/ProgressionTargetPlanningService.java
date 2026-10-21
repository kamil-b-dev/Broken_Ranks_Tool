package pl.brokenranks.tool.broken_ranks_tool.progressionpath.service;

import jakarta.validation.Validator;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.*;
import pl.brokenranks.tool.broken_ranks_tool.equipment.dto.EquipmentRequest;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.*;
import pl.brokenranks.tool.broken_ranks_tool.equipment.persistence.repository.*;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.EquipmentStatsCalculatorService;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.calculator.input.EquipmentDataProvider.CalculationContext;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.validator.*;
import pl.brokenranks.tool.broken_ranks_tool.progressionpath.dto.*;
import pl.brokenranks.tool.broken_ranks_tool.progressionpath.dto.ProgressionPlanResponse.*;
import pl.brokenranks.tool.broken_ranks_tool.progressionpath.model.*;
import pl.brokenranks.tool.broken_ranks_tool.progressionpath.planning.*;

/** Generates milestones backwards from a target and verifies every operation forwards. */
@Service
@RequiredArgsConstructor
public class ProgressionTargetPlanningService {
    private final Validator validator;
    private final ItemTemplateRepository items;
    private final OrbTemplateRepository orbs;
    private final DrifTemplateRepository drifs;
    private final EquipmentStatsCalculatorService calculator;
    private final EquipmentRequestValidator requestValidator;
    private final EquipmentPlacementRules placement;
    private final UpgradeLevelPolicy levels;
    private final ProgressionPathEvaluationService evaluation;
    private final ProgressionDrifReplayService replay;

    @Transactional(readOnly = true)
    public ProgressionPlanResponse plan(ProgressionTargetRequest input) {
        long started = System.nanoTime();
        if (input == null || !validator.validate(input).isEmpty())
            throw new IllegalArgumentException("Nieprawidłowy build docelowy ścieżki.");
        requestValidator.validateRequest(input.targetEquipment());
        requestValidator.validateCharacterStats(input.targetEquipment().getCharacterStats());
        var reserved = input.resSlots() == null ? Set.<String>of() : Set.copyOf(input.resSlots());
        for (String key : reserved) {
            var slot = input.targetEquipment().getSlots().get(key);
            if (slot != null
                    && (slot.getItemId() != null
                            || slot.getDrifIds() != null
                                    && slot.getDrifIds().stream().anyMatch(Objects::nonNull)
                            || slot.getOrbIds() != null
                                    && slot.getOrbIds().stream().anyMatch(Objects::nonNull)))
                throw new IllegalArgumentException(
                        "Slot " + key + " oznaczony res nie może zawierać przedmiotu ani kamieni.");
        }
        var context =
                new CalculationContext(
                        items.findAll().stream()
                                .collect(
                                        Collectors.toMap(ItemTemplate::getId, Function.identity())),
                        orbs.findAll().stream()
                                .collect(Collectors.toMap(OrbTemplate::getId, Function.identity())),
                        drifs.findAll().stream()
                                .collect(
                                        Collectors.toMap(
                                                DrifTemplate::getId, Function.identity())));
        var target = new ProgressionStage("target", input.targetLevel(), input.targetEquipment());
        // Validate the supplied target before using its IDs, profiles or stone ceilings.
        evaluation.evaluate(
                new ProgressionPath(
                        input.characterClass(),
                        List.of(
                                new ProgressionStage(
                                        "validation", input.targetLevel(), input.targetEquipment()),
                                target)),
                context);
        var sequence = new ProgressionEquipmentSequence(context, placement);
        var frames = sequence.generate(input);
        var transitions = new ProgressionTransition(context, replay);
        var numeric =
                calculator.prepareNumericCalculation(
                        context.items(), context.orbs(), context.drifs());
        var candidates =
                new ProgressionCandidates(context, placement, levels, transitions, numeric);
        var orbPlanner = new ProgressionOrbs(context, placement);
        var drifCeilings = new ArrayList<>(transitions.equipped(target.equipment()));
        // Built-in target bonuses can be provided by temporary ordinary stones before the epic.
        target.equipment().getSlots().entrySet().stream()
                .sorted(Map.Entry.comparingByKey())
                .forEach(
                        entry -> {
                            var slot = entry.getValue();
                            if (slot.getItemId() == null
                                    || !transitions.builtIn(slot.getItemId())
                                    || slot.getDrifIds() == null) return;
                            for (int i = 0; i < slot.getDrifIds().size(); i++) {
                                Long id = slot.getDrifIds().get(i);
                                if (id != null)
                                    drifCeilings.add(
                                            new ProgressionDrif(
                                                    "temporary:" + entry.getKey() + ":" + i,
                                                    id,
                                                    slot.getDrifLevels() == null
                                                            ? 1
                                                            : slot.getDrifLevels()
                                                                    .getOrDefault("" + i, 1),
                                                    null));
                            }
                        });
        List<ProgressionDrif> ceilings = List.copyOf(drifCeilings);
        var balanced =
                input.balanceStats()
                        ? new ProgressionBalancedCandidates(
                                context,
                                placement,
                                levels,
                                transitions,
                                numeric,
                                target.equipment(),
                                ceilings)
                        : null;
        var orbCeilings = orbPlanner.equipped(target.equipment());
        var planned = new ArrayList<>(frames);
        int[] attempts = {0};
        Runnable checkBudget =
                () -> {
                    if (++attempts[0] > 100_000 || Thread.currentThread().isInterrupted())
                        throw new IllegalArgumentException(
                                "Przekroczono zakres generowania ścieżki.");
                };
        for (int i = planned.size() - 2; i >= 0; i--) {
            var frame = planned.get(i);
            if (balanced != null) {
                var projectedOrbs = orbPlanner.project(frame.equipment(), orbCeilings);
                orbCeilings = projectedOrbs.ceilings();
                var projection =
                        balanced.project(
                                new ProgressionStage(
                                        frame.id(),
                                        frame.characterLevel(),
                                        projectedOrbs.equipment()),
                                ceilings,
                                checkBudget);
                ceilings = projection.ceilings();
                planned.set(
                        i,
                        new ProgressionStage(
                                frame.id(), frame.characterLevel(), projection.equipment()));
                continue;
            }
            var projection = candidates.project(frame, ceilings, false, false, checkBudget);
            ceilings = projection.ceilings();
            var projectedOrbs = orbPlanner.project(projection.equipment(), orbCeilings);
            orbCeilings = projectedOrbs.ceilings();
            planned.set(
                    i,
                    new ProgressionStage(
                            frame.id(), frame.characterLevel(), projectedOrbs.equipment()));
        }
        // Remove equivalent same-level frames produced before inserting the exact target.
        var compact = new ArrayList<ProgressionStage>();
        for (var stage : planned) {
            if (!compact.isEmpty()
                    && compact.getLast().characterLevel() == stage.characterLevel()
                    && compact.getLast().equipment().equals(stage.equipment()))
                compact.removeLast();
            compact.add(stage);
        }
        if (compact.size() == 1)
            compact.add(new ProgressionStage("target", input.targetLevel(), target.equipment()));
        var verified =
                evaluation.evaluate(new ProgressionPath(input.characterClass(), compact), context);
        var inventory = List.<ProgressionDrif>of();
        var orbInventory = List.<ProgressionOrbs.Stone>of();
        var previous = new EquipmentRequest();
        previous.setSlots(Map.of());
        previous.setCharacterStats(Map.of());
        var results = new ArrayList<StageResult>();
        for (int i = 0; i < verified.size(); i++) {
            var current = verified.get(i);
            var next = current.stage().equipment();
            for (String key : reserved) {
                var slot = next.getSlots().get(key);
                if (slot != null && slot.getItemId() != null)
                    throw new IllegalStateException("Zajęto slot res.");
            }
            var transition = transitions.toStage(inventory, previous, next, i, true);
            if (transition == null)
                throw new IllegalStateException("Nie odtworzono operacji drifów.");
            inventory = transition.inventory();
            var orbTransition = orbPlanner.toStage(orbInventory, previous, next);
            orbInventory = orbTransition.inventory();
            var changes = changes(previous, next, context, sequence);
            if (i == 0)
                reserved.stream()
                        .sorted()
                        .forEach(
                                key ->
                                        changes.add(
                                                EQUIPMENT_SLOT.fromKey(key).label()
                                                        + ": res — bez drifów i orbów."));
            results.add(
                    new StageResult(
                            current.stage(),
                            current.calculation(),
                            transition.actions(),
                            List.copyOf(changes),
                            orbTransition.actions()));
            previous = next;
        }
        if (!previous.equals(target.equipment()))
            throw new IllegalStateException("Końcowy etap różni się od celu.");
        var warnings = new ArrayList<String>();
        warnings.add("Plan nie wycenia zakupów ani ulepszeń. Zwykłe przedmioty są pominięte.");
        if (input.balanceStats())
            warnings.add(
                    "Równomierny rozwój dotyczy bonusów drifów z celu. Gniazda, pojemność i wbudowane bonusy mogą ograniczać wyrównanie statystyk.");
        if (!reserved.isEmpty())
            warnings.add("Statystyki nie obejmują synergetyków oznaczonych res.");
        return new ProgressionPlanResponse(
                "VALID_PATH",
                List.copyOf(results),
                inventory.stream().filter(stone -> stone.position() == null).toList(),
                List.copyOf(warnings),
                new SearchReport(
                        input.balanceStats()
                                ? "BALANCED_BACKWARD_PROJECTION"
                                : "BACKWARD_PROJECTION",
                        attempts[0],
                        1,
                        (System.nanoTime() - started) / 1_000_000,
                        false),
                reserved);
    }

    private List<String> changes(
            EquipmentRequest before,
            EquipmentRequest after,
            CalculationContext context,
            ProgressionEquipmentSequence sequence) {
        var result = new ArrayList<String>();
        for (var entry : new TreeMap<>(after.getSlots()).entrySet()) {
            String key = entry.getKey();
            var a = before.getSlots().get(key);
            var b = entry.getValue();
            if (b.getItemId() == null) continue;
            var item = context.items().get(b.getItemId());
            if (sequence.isLegendUpgrade(a, b)) {
                if (ProgressionEquipmentSequence.stars(a) != 9
                        || ProgressionEquipmentSequence.stars(b) != 1)
                    throw new IllegalStateException(
                            "Ulepszenie legendy wymaga epika 9★ i resetu do 1★.");
                result.add("Ulepsz epik " + item.getName() + " (9★) do legendy (1★).");
            } else if (a == null || !Objects.equals(a.getItemId(), b.getItemId())) {
                result.add(
                        "Kup i załóż: "
                                + EQUIPMENT_SLOT.fromKey(key).label()
                                + " — "
                                + item.getName()
                                + " (1★).");
                if (ProgressionEquipmentSequence.stars(b) > 1)
                    result.add(
                            "Ulepsz "
                                    + item.getName()
                                    + " do "
                                    + ProgressionEquipmentSequence.stars(b)
                                    + "★.");
            } else if (ProgressionEquipmentSequence.stars(a)
                    != ProgressionEquipmentSequence.stars(b)) {
                result.add(
                        "Ulepsz "
                                + item.getName()
                                + " z "
                                + ProgressionEquipmentSequence.stars(a)
                                + "★ do "
                                + ProgressionEquipmentSequence.stars(b)
                                + "★.");
            }
            if ((item.getRarity() == RARITY.EPIC || item.getRarity() == RARITY.SET)
                    && (a == null
                            || !Objects.equals(a.getItemId(), b.getItemId())
                            || !Objects.equals(a.getDrifLevels(), b.getDrifLevels()))) {
                var embedded = new ArrayList<String>();
                for (int index = 0;
                        b.getDrifIds() != null && index < b.getDrifIds().size();
                        index++) {
                    Long id = b.getDrifIds().get(index);
                    if (id == null) continue;
                    int level =
                            b.getDrifLevels() == null
                                    ? 1
                                    : b.getDrifLevels().getOrDefault("" + index, 1);
                    embedded.add(
                            context.drifs().get(id).getBonusType().getDescription()
                                    + " (poziom "
                                    + level
                                    + ")");
                }
                result.add(
                        "Wbudowane drify "
                                + item.getName()
                                + ": "
                                + String.join(", ", embedded)
                                + ". Pozostają częścią przedmiotu.");
            }
        }
        return result;
    }
}
