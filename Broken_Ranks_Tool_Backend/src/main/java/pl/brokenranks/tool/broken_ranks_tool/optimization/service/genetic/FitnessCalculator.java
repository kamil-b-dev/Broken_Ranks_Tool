package pl.brokenranks.tool.broken_ranks_tool.optimization.service.genetic;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import pl.brokenranks.tool.broken_ranks_tool.core.enums.DRIF_BONUS_TYPE;
import pl.brokenranks.tool.broken_ranks_tool.equipment.dto.EquipmentRequest;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.DrifTemplate;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.ItemTemplate;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.EquipmentFacade;
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.OptimizationRequest;

import java.util.*;

/**
 * Klasa odpowiedzialna za obliczanie funkcji przystosowania (fitness) dla chromosomu.
 * Ocenia, jak "dobre" jest dane ułożenie drifów, biorąc pod uwagę wagi priorytetów użytkownika,
 * wymagane ilości drifów, reguły gry oraz wymuszenia maksymalnych limitów (Cap).
 */
@Component
@RequiredArgsConstructor
public class FitnessCalculator {

    private final EquipmentFacade equipmentFacade;

    private static final double BASE_REWARD = 3000.0;
    private static final double PRIORITY_BONUS_WEIGHT = 5000.0;
    private static final double BASE_POWER_WEIGHT = 100.0;
    private static final double CAPACITY_PENALTY_WEIGHT = -800.0;
    private static final double CAPACITY_FILLING_BONUS = 50.0;
    private static final double DUPLICATE_PENALTY = -5000.0;
    private static final double OVERCAP_PENALTY = -2000.0;
    private static final double QUANTITY_CONSTRAINT_PENALTY = -50000.0;

    /**
     * Oblicza wartość funkcji przystosowania dla danego chromosomu.
     * Im wyższa wartość, tym lepsze ułożenie drifów.
     * Uwzględnia wagi priorytetów (1-30), twarde limity ilościowe oraz wymuszanie Capa.
     *
     * @param chromosome Chromosom do oceny.
     * @param request Oryginalne żądanie optymalizacji, zawierające priorytety i limity.
     * @param itemTemplates Mapa szablonów przedmiotów używanych w ocenie.
     * @return Wartość funkcji przystosowania.
     */
    public double calculateFitness(Chromosome chromosome, OptimizationRequest request, Map<Long, ItemTemplate> itemTemplates) {
        double fitness = 0;

        Map<DRIF_BONUS_TYPE, Integer> globalDrifCounts = new HashMap<>();
        Map<DRIF_BONUS_TYPE, Double> globalRawScores = new HashMap<>();
        Map<DRIF_BONUS_TYPE, Double> globalStatTotals = new HashMap<>();

        for (Map.Entry<String, List<DrifTemplate>> entry : chromosome.getGenes().entrySet()) {
            String slotKey = entry.getKey();
            List<DrifTemplate> rawDrifsInSlot = entry.getValue();

            EquipmentRequest.SlotData slotData = request.getOriginalSlots().get(slotKey);
            if (slotData == null || slotData.getItemId() == null) continue;

            Long parsedItemId = Long.valueOf(String.valueOf(slotData.getItemId()));
            ItemTemplate item = itemTemplates.get(parsedItemId);
            if (item == null) continue;

            int itemStars = slotData.getItemStars() != null ? slotData.getItemStars() : 1;
            int itemCapacity = equipmentFacade.calculateItemCapacity(item, itemStars);
            int currentPowerUsed = 0;

            List<DrifTemplate> validDrifsInSlot = new ArrayList<>();
            Set<DRIF_BONUS_TYPE> slotUsedBonusTypes = new HashSet<>();

            for (DrifTemplate drif : rawDrifsInSlot) {
                if (drif == null) continue;
                if (!slotUsedBonusTypes.add(drif.getBonusType())) {
                    fitness += DUPLICATE_PENALTY;
                } else {
                    validDrifsInSlot.add(drif);
                }
            }

            int[] optimalMultipliers = calculateOptimalMultipliers(validDrifsInSlot, itemCapacity, request.getPriorities());

            for (int i = 0; i < validDrifsInSlot.size(); i++) {
                DrifTemplate drif = validDrifsInSlot.get(i);
                int mult = optimalMultipliers[i];

                globalDrifCounts.merge(drif.getBonusType(), 1, Integer::sum);

                double actualStatValue = calculateDrifValue(drif, mult);
                double currentTotal = globalStatTotals.getOrDefault(drif.getBonusType(), 0.0);
                Integer cap = drif.getBonusType().getMaxCap();

                double usableRatio = 1.0;
                if (cap != null) {
                    if (currentTotal >= cap) {
                        usableRatio = 0.0;
                        fitness += OVERCAP_PENALTY;
                    } else if (currentTotal + actualStatValue > cap) {
                        usableRatio = (cap - currentTotal) / actualStatValue;
                        fitness += OVERCAP_PENALTY * (1.0 - usableRatio);
                    }
                }

                globalStatTotals.put(drif.getBonusType(), currentTotal + actualStatValue);

                double drifFitnessValue = BASE_REWARD;

                if (request.getPriorities() != null && request.getPriorities().containsKey(drif.getBonusType())) {
                    int weight = request.getPriorities().get(drif.getBonusType());
                    drifFitnessValue += PRIORITY_BONUS_WEIGHT * weight;
                }

                drifFitnessValue += drif.getBonusType().getBasePower() * mult * BASE_POWER_WEIGHT;

                double starBonusMultiplier = 1.0 + (itemStars * 0.1);

                double finalRawDrifScore = (drifFitnessValue * starBonusMultiplier) * usableRatio;

                globalRawScores.merge(drif.getBonusType(), finalRawDrifScore, Double::sum);

                currentPowerUsed += drif.getBonusType().getBasePower() * mult;
            }

            if (itemCapacity > 0) {
                if (currentPowerUsed > itemCapacity) {
                    fitness += CAPACITY_PENALTY_WEIGHT * (currentPowerUsed - itemCapacity);
                } else {
                    int usedCapacity = Math.min(currentPowerUsed, itemCapacity);
                    fitness += usedCapacity * CAPACITY_FILLING_BONUS;
                }
            }
        }

        for (Map.Entry<DRIF_BONUS_TYPE, Double> entry : globalRawScores.entrySet()) {
            int count = globalDrifCounts.get(entry.getKey());
            double penalty = getDrifPenalty(count);
            fitness += entry.getValue() * penalty;
        }

        if (request.getTargetQuantities() != null) {
            for (Map.Entry<DRIF_BONUS_TYPE, OptimizationRequest.QuantityRange> entry : request.getTargetQuantities().entrySet()) {
                DRIF_BONUS_TYPE type = entry.getKey();
                OptimizationRequest.QuantityRange range = entry.getValue();
                int actualCount = globalDrifCounts.getOrDefault(type, 0);

                if (actualCount < range.getMin() || actualCount > range.getMax()) {
                    fitness += QUANTITY_CONSTRAINT_PENALTY;
                }
            }
        }

        if (request.getForceCapBonuses() != null) {
            for (DRIF_BONUS_TYPE type : request.getForceCapBonuses()) {
                Integer cap = type.getMaxCap();
                if (cap != null) {
                    double actualTotal = globalStatTotals.getOrDefault(type, 0.0);
                    if (actualTotal < cap) {
                        fitness += QUANTITY_CONSTRAINT_PENALTY;
                    }
                }
            }
        }

        return fitness;
    }

    /**
     * Oblicza wartość przyrostu statystyki z drifu dla określonego mnożnika (poziomu).
     *
     * @param drif Szablon drifu.
     * @param mult Mnożnik (1-4) odzwierciedlający odpowiednio 6, 11, 16 i 21 poziom drifu.
     * @return Wartość całkowita statystyki wnoszona przez ten drif.
     */
    private double calculateDrifValue(DrifTemplate drif, int mult) {
        if (drif.getBaseValue() == null || drif.getIncrement() == null) return 0.0;
        try {
            double base = Double.parseDouble(drif.getBaseValue().replace("%", "").replace(",", ".").trim());
            double inc = Double.parseDouble(drif.getIncrement().replace("%", "").replace(",", ".").trim());

            int level = 1;
            if (mult == 4) level = 21;
            else if (mult == 3) level = 16;
            else if (mult == 2) level = 11;
            else if (mult == 1) level = 6;

            double total = base;
            for (int i = 2; i <= level; i++) {
                if (i >= 19 && i <= 21) {
                    total += (inc * 2);
                } else {
                    total += inc;
                }
            }
            return total;
        } catch (NumberFormatException e) {
            return 0.0;
        }
    }

    /**
     * Oblicza optymalne mnożniki (poziomy) dla drifów w danym slocie,
     * aby nie przekroczyć pojemności przedmiotu.
     * W przypadku braku miejsca obniża poziomy drifów o najniższej wadze priorytetu.
     *
     * @param drifs Lista drifów w slocie.
     * @param capacity Dostępna pojemność przedmiotu.
     * @param priorities Mapa wag priorytetów (od 1 do 30).
     * @return Tablica mnożników dla każdego drifu.
     */
    public int[] calculateOptimalMultipliers(List<DrifTemplate> drifs, int capacity, Map<DRIF_BONUS_TYPE, Integer> priorities) {
        int[] mults = new int[drifs.size()];
        for (int i = 0; i < drifs.size(); i++) {
            DrifTemplate drif = drifs.get(i);
            int maxLvl = drif.getSize() != null ? drif.getSize().getMaxLevel() : 21;
            mults[i] = getEffectiveMultiplier(maxLvl);
        }

        if (capacity <= 0) return mults;

        while (true) {
            int currentPower = 0;
            for (int i = 0; i < drifs.size(); i++) {
                currentPower += drifs.get(i).getBonusType().getBasePower() * mults[i];
            }
            if (currentPower <= capacity) break;

            int targetIndex = -1;
            int worstPriority = Integer.MAX_VALUE;

            for (int i = 0; i < drifs.size(); i++) {
                if (mults[i] > 1) {
                    int pVal = priorities != null ? priorities.getOrDefault(drifs.get(i).getBonusType(), 0) : 0;
                    if (pVal < worstPriority) {
                        worstPriority = pVal;
                        targetIndex = i;
                    }
                }
            }

            if (targetIndex != -1) {
                mults[targetIndex]--;
            } else {
                break;
            }
        }
        return mults;
    }

    /**
     * Zwraca optymalny mnożnik redukujący obciążenie na podstawie maksymalnego poziomu drifu.
     *
     * @param level Maksymalny poziom dla danego rozmiaru drifu.
     * @return Mnożnik (od 1 do 4).
     */
    private int getEffectiveMultiplier(int level) {
        if (level <= 6) return 1;
        if (level <= 11) return 2;
        if (level <= 16) return 3;
        return 4;
    }

    /**
     * Zwraca wartość kary nakładanej w zależności od liczby drifów tego samego typu w ekwipunku.
     *
     * @param count Liczba drifów danego typu.
     * @return Współczynnik kary (od 0.50 do 1.0).
     */
    public double getDrifPenalty(int count) {
        if (count <= 3) return 1.0;
        return switch (count) {
            case 4 -> 0.95;
            case 5 -> 0.87;
            case 6 -> 0.80;
            case 7 -> 0.74;
            case 8 -> 0.69;
            case 9 -> 0.64;
            case 10 -> 0.59;
            case 11 -> 0.54;
            default -> 0.50;
        };
    }
}