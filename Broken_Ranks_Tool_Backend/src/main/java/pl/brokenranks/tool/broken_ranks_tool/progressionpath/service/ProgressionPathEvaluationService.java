package pl.brokenranks.tool.broken_ranks_tool.progressionpath.service;

import jakarta.validation.Validator;
import java.util.ArrayList;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.CHARACTER_CLASS;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.ITEM_CLASS_SCOPE;
import pl.brokenranks.tool.broken_ranks_tool.equipment.dto.EquipmentRequest;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.ItemTemplate;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.EquipmentStatsCalculatorService;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.calculator.input.EquipmentDataProvider;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.calculator.input.EquipmentDataProvider.CalculationContext;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.validator.EquipmentRequestValidator;
import pl.brokenranks.tool.broken_ranks_tool.progressionpath.model.ProgressionPath;
import pl.brokenranks.tool.broken_ranks_tool.progressionpath.model.ProgressionStage;
import pl.brokenranks.tool.broken_ranks_tool.progressionpath.model.ProgressionStageEvaluation;

/** Calculates supplied stages using one catalog session, without inferring transfers or costs. */
@Service
@RequiredArgsConstructor
public class ProgressionPathEvaluationService {
    private final EquipmentDataProvider dataProvider;
    private final EquipmentStatsCalculatorService calculator;
    private final EquipmentRequestValidator requestValidator;
    private final Validator beanValidator;

    public List<ProgressionStageEvaluation> evaluate(ProgressionPath path) {
        if (path == null) {
            throw new IllegalArgumentException("Wymagana jest konfiguracja ścieżki rozwoju.");
        }
        for (ProgressionStage stage : path.stages()) {
            try {
                validateEnvelope(stage.equipment());
            } catch (IllegalArgumentException ex) {
                throw stageError(stage, ex);
            }
        }
        var slots =
                path.stages().stream()
                        .flatMap(stage -> stage.equipment().getSlots().values().stream())
                        .toList();
        CalculationContext context = dataProvider.buildContext(slots);
        return evaluate(path, context);
    }

    /** Validates stages against templates already loaded for the entire planning run. */
    public List<ProgressionStageEvaluation> evaluate(
            ProgressionPath path, CalculationContext context) {
        for (ProgressionStage stage : path.stages()) {
            try {
                validateEnvelope(stage.equipment());
            } catch (IllegalArgumentException ex) {
                throw stageError(stage, ex);
            }
        }
        var calculate =
                calculator.prepareCalculationWithSources(
                        context.items(), context.orbs(), context.drifs());
        var results = new ArrayList<ProgressionStageEvaluation>();
        for (ProgressionStage stage : path.stages()) {
            try {
                validateAvailability(stage, path.characterClass(), context);
                results.add(
                        new ProgressionStageEvaluation(stage, calculate.apply(stage.equipment())));
            } catch (IllegalArgumentException ex) {
                throw stageError(stage, ex);
            }
        }
        return List.copyOf(results);
    }

    private void validateEnvelope(EquipmentRequest equipment) {
        var violations = beanValidator.validate(equipment);
        if (!violations.isEmpty()) {
            String property =
                    violations.stream()
                            .map(violation -> violation.getPropertyPath().toString())
                            .sorted()
                            .findFirst()
                            .orElseThrow();
            throw new IllegalArgumentException("Nieprawidłowa konfiguracja pola " + property + ".");
        }
        requestValidator.validateRequest(equipment);
        requestValidator.validateCharacterStats(equipment.getCharacterStats());
    }

    private void validateAvailability(
            ProgressionStage stage, CHARACTER_CLASS characterClass, CalculationContext context) {
        for (var slot : stage.equipment().getSlots().values()) {
            if (slot.getItemId() == null) continue;
            ItemTemplate item = context.items().get(slot.getItemId());
            if (item == null) {
                throw new IllegalArgumentException(
                        "Nie znaleziono przedmiotu o ID " + slot.getItemId() + ".");
            }
            if (item.getReqLevel() > stage.characterLevel()) {
                throw new IllegalArgumentException(
                        "Przedmiot "
                                + item.getName()
                                + " wymaga poziomu "
                                + item.getReqLevel()
                                + ".");
            }
            if (item.getClassScope() == null || item.getClassScope() == ITEM_CLASS_SCOPE.UNKNOWN) {
                throw new IllegalArgumentException(
                        "Nie określono dostępności przedmiotu "
                                + item.getName()
                                + " dla profesji.");
            }
            if (item.getClassScope() == ITEM_CLASS_SCOPE.RESTRICTED
                    && (item.getAllowedClasses() == null
                            || !item.getAllowedClasses().contains(characterClass))) {
                throw new IllegalArgumentException(
                        "Przedmiot "
                                + item.getName()
                                + " nie jest dostępny dla profesji "
                                + characterClass.getDescription()
                                + ".");
            }
        }
    }

    private IllegalArgumentException stageError(
            ProgressionStage stage, IllegalArgumentException ex) {
        return new IllegalArgumentException("Etap '" + stage.id() + "': " + ex.getMessage(), ex);
    }
}
