package pl.brokenranks.tool.broken_ranks_tool.optimization.service.genetic;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import pl.brokenranks.tool.broken_ranks_tool.core.enums.DRIF_BONUS_TYPE;
import pl.brokenranks.tool.broken_ranks_tool.equipment.dto.EquipmentRequest;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.DrifTemplate;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.ItemTemplate;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.validator.EquipmentValidator;
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.OptimizationRequest;

import java.util.*;

/**
 * Klasa odpowiedzialna za obliczanie funkcji przystosowania (fitness) dla chromosomu.
 * Ocenia, jak "dobre" jest dane ułożenie drifów, biorąc pod uwagę priorytety użytkownika
 * i reguły gry.
 */
@Component
@RequiredArgsConstructor
public class FitnessCalculator {

    private final EquipmentValidator validator;

    private static final double PRIORITY_BONUS_WEIGHT = 10000.0;
    private static final double BASE_POWER_WEIGHT = 100.0;
    private static final double CAPACITY_PENALTY_WEIGHT = -500.0;
    private static final double DUPLICATE_PENALTY = -5000.0;

    /**
     * Oblicza wartość funkcji przystosowania dla danego chromosomu.
     * Im wyższa wartość, tym lepsze ułożenie drifów.
     *
     * @param chromosome Chromosom do oceny.
     * @param request Oryginalne żądanie optymalizacji, zawierające priorytety.
     * @param itemTemplates Mapa szablonów przedmiotów używanych w ocenie.
     * @return Wartość funkcji przystosowania.
     */
    public double calculateFitness(Chromosome chromosome, OptimizationRequest request, Map<Long, ItemTemplate> itemTemplates) {
        double fitness = 0;

        Map<DRIF_BONUS_TYPE, List<Double>> globalDrifScores = new EnumMap<>(DRIF_BONUS_TYPE.class);

        for (Map.Entry<String, List<DrifTemplate>> entry : chromosome.getGenes().entrySet()) {
            String slotKey = entry.getKey();
            List<DrifTemplate> drifsInSlot = entry.getValue();

            EquipmentRequest.SlotData slotData = request.getOriginalSlots().get(slotKey);
            if (slotData == null || slotData.getItemId() == null) continue;

            Long parsedItemId = Long.valueOf(String.valueOf(slotData.getItemId()));
            ItemTemplate item = itemTemplates.get(parsedItemId);
            if (item == null) continue;

            int itemStars = slotData.getItemStars() != null ? slotData.getItemStars() : 1;
            int itemCapacity = validator.calculateItemCapacity(item, itemStars);
            int currentPowerUsed = 0;
            Set<DRIF_BONUS_TYPE> slotUsedBonusTypes = new HashSet<>();

            for (DrifTemplate drif : drifsInSlot) {
                if (drif == null) continue;

                if (!slotUsedBonusTypes.add(drif.getBonusType())) {
                    fitness += DUPLICATE_PENALTY;
                    continue;
                }

                double drifFitnessValue = 0;
                int priorityIndex = request.getPrioritizedBonuses().indexOf(drif.getBonusType());
                if (priorityIndex != -1) {
                    drifFitnessValue += PRIORITY_BONUS_WEIGHT * (request.getPrioritizedBonuses().size() - priorityIndex);
                } else {
                    drifFitnessValue += 2000.0;
                }

                drifFitnessValue += drif.getBonusType().getBasePower() * BASE_POWER_WEIGHT;

                double starBonusMultiplier = 1.0 + (itemStars * 0.1);
                double finalDrifScore = drifFitnessValue * starBonusMultiplier;

                globalDrifScores.computeIfAbsent(drif.getBonusType(), k -> new ArrayList<>()).add(finalDrifScore);

                int maxLvl = drif.getSize() != null ? drif.getSize().getMaxLevel() : 21;
                currentPowerUsed += drif.getBonusType().getBasePower() * getEffectiveMultiplier(maxLvl);
            }

            if (itemCapacity > 0 && currentPowerUsed > itemCapacity) {
                fitness += CAPACITY_PENALTY_WEIGHT * (currentPowerUsed - itemCapacity);
            }
        }

        for (List<Double> scores : globalDrifScores.values()) {
            scores.sort(Collections.reverseOrder());

            for (int i = 0; i < scores.size(); i++) {
                fitness += scores.get(i) * getDiminishingMultiplier(i);
            }
        }

        return fitness;
    }

    /**
     * Zwraca efektywny mnożnik mocy drifu na podstawie jego poziomu.
     * @param level Poziom drifu.
     * @return Mnożnik mocy (1, 2, 3 lub 4).
     */
    private int getEffectiveMultiplier(int level) {
        if (level <= 6) return 1;
        if (level <= 11) return 2;
        if (level <= 16) return 3;
        return 4;
    }

    /**
     * Zwraca mnożnik punktowy symulujący malejące przyrosty (Diminishing Returns)
     * w przypadku posiadania wielu drifów tego samego typu.
     * @param drifsOfSameTypeAlreadyPlaced Liczba już umieszczonych drifów tego samego typu (indeks pętli).
     * @return Mnożnik kary (wartość od 1.0 do 0.2).
     */
    private double getDiminishingMultiplier(int drifsOfSameTypeAlreadyPlaced) {
        switch (drifsOfSameTypeAlreadyPlaced) {
            case 0: return 1.0;
            case 1: return 0.8;
            case 2: return 0.6;
            case 3: return 0.4;
            default: return 0.2;
        }
    }
}
