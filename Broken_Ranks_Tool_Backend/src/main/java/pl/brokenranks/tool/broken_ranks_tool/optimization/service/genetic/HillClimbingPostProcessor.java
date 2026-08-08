package pl.brokenranks.tool.broken_ranks_tool.optimization.service.genetic;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.DrifTemplate;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.ItemTemplate;
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.OptimizationRequest;

import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Klasa Post-Processingu (Wspinaczka/Hill Climbing) wygładzająca wynik algorytmu genetycznego.
 * Pętla uwzględnia zablokowane sloty oraz pojedyncze zablokowane drify, omijając je podczas optymalizacji.
 */
@Component
@RequiredArgsConstructor
public class HillClimbingPostProcessor {

    private final FitnessCalculator fitnessCalculator;

    public Chromosome refine(Chromosome initial, OptimizationRequest request, Map<Long, ItemTemplate> itemTemplates, Map<String, List<DrifTemplate>> validDrifsPerSlot, Map<String, Integer> maxDrifsPerSlot) {
        Chromosome current = initial.copy();
        double currentFitness = current.getFitness();
        boolean improved = true;

        while (improved) {
            improved = false;

            for (String slot : current.getGenes().keySet()) {
                if (isSlotLocked(request, slot)) continue;

                List<DrifTemplate> currentDrifs = current.getGenes().get(slot);
                List<DrifTemplate> validForSlot = validDrifsPerSlot.get(slot);
                if (validForSlot == null) continue;

                for (int i = 0; i < currentDrifs.size(); i++) {
                    if (isDrifLocked(request, slot, i)) continue;

                    for (DrifTemplate candidate : validForSlot) {
                        if (!currentDrifs.get(i).equals(candidate)) {
                            Chromosome testChromosome = current.copy();
                            testChromosome.getGenes().get(slot).set(i, candidate);
                            double testFitness = fitnessCalculator.calculateFitness(testChromosome, request, itemTemplates);
                            if (testFitness > currentFitness) {
                                current = testChromosome; currentFitness = testFitness; improved = true; break;
                            }
                        }
                    }
                    if (improved) break;
                }
                if (improved) break;
            }
            if (improved) continue;

            for (String slot : current.getGenes().keySet()) {
                if (isSlotLocked(request, slot)) continue;

                List<DrifTemplate> currentDrifs = current.getGenes().get(slot);
                List<DrifTemplate> validForSlot = validDrifsPerSlot.get(slot);
                int maxAllowed = maxDrifsPerSlot.getOrDefault(slot, 0);

                if (validForSlot != null && currentDrifs.size() < maxAllowed) {
                    for (DrifTemplate candidate : validForSlot) {
                        Chromosome testChromosome = current.copy();
                        testChromosome.getGenes().get(slot).add(candidate);
                        double testFitness = fitnessCalculator.calculateFitness(testChromosome, request, itemTemplates);
                        if (testFitness > currentFitness) {
                            current = testChromosome; currentFitness = testFitness; improved = true; break;
                        }
                    }
                }
                if (improved) break;
            }
            if (improved) continue;

            for (String slot : current.getGenes().keySet()) {
                if (isSlotLocked(request, slot)) continue;

                List<DrifTemplate> currentDrifs = current.getGenes().get(slot);
                if (currentDrifs.isEmpty()) continue;

                for (int i = 0; i < currentDrifs.size(); i++) {
                    if (isDrifLocked(request, slot, i)) continue;

                    Chromosome testChromosome = current.copy();
                    testChromosome.getGenes().get(slot).remove(i);
                    double testFitness = fitnessCalculator.calculateFitness(testChromosome, request, itemTemplates);
                    if (testFitness > currentFitness) {
                        current = testChromosome; currentFitness = testFitness; improved = true; break;
                    }
                }
                if (improved) break;
            }
            if (improved) continue;

            for (String fromSlot : current.getGenes().keySet()) {
                if (isSlotLocked(request, fromSlot)) continue;

                for (String toSlot : current.getGenes().keySet()) {
                    if (fromSlot.equals(toSlot) || isSlotLocked(request, toSlot)) continue;

                    List<DrifTemplate> fromDrifs = current.getGenes().get(fromSlot);
                    List<DrifTemplate> validForToSlot = validDrifsPerSlot.get(toSlot);
                    int maxAllowedTo = maxDrifsPerSlot.getOrDefault(toSlot, 0);

                    if (current.getGenes().get(toSlot).size() < maxAllowedTo && validForToSlot != null && !fromDrifs.isEmpty()) {
                        for (int i = 0; i < fromDrifs.size(); i++) {
                            if (isDrifLocked(request, fromSlot, i)) continue;

                            DrifTemplate drifToMove = fromDrifs.get(i);
                            if (validForToSlot.contains(drifToMove)) {
                                Chromosome testChromosome = current.copy();
                                testChromosome.getGenes().get(fromSlot).remove(i);
                                testChromosome.getGenes().get(toSlot).add(drifToMove);
                                double testFitness = fitnessCalculator.calculateFitness(testChromosome, request, itemTemplates);
                                if (testFitness > currentFitness) {
                                    current = testChromosome; currentFitness = testFitness; improved = true; break;
                                }
                            }
                        }
                    }
                    if (improved) break;
                }
                if (improved) break;
            }
            if (improved) continue;

            for (String slot1 : current.getGenes().keySet()) {
                if (isSlotLocked(request, slot1)) continue;

                for (String slot2 : current.getGenes().keySet()) {
                    if (slot1.equals(slot2) || isSlotLocked(request, slot2)) continue;

                    List<DrifTemplate> drifs1 = current.getGenes().get(slot1);
                    List<DrifTemplate> drifs2 = current.getGenes().get(slot2);
                    List<DrifTemplate> validForSlot1 = validDrifsPerSlot.get(slot1);
                    List<DrifTemplate> validForSlot2 = validDrifsPerSlot.get(slot2);

                    for (int i = 0; i < drifs1.size(); i++) {
                        if (isDrifLocked(request, slot1, i)) continue;

                        for (int j = 0; j < drifs2.size(); j++) {
                            if (isDrifLocked(request, slot2, j)) continue;

                            DrifTemplate d1 = drifs1.get(i);
                            DrifTemplate d2 = drifs2.get(j);

                            if (validForSlot1 != null && validForSlot2 != null &&
                                    validForSlot1.contains(d2) && validForSlot2.contains(d1)) {

                                Chromosome testChromosome = current.copy();
                                testChromosome.getGenes().get(slot1).set(i, d2);
                                testChromosome.getGenes().get(slot2).set(j, d1);

                                double testFitness = fitnessCalculator.calculateFitness(testChromosome, request, itemTemplates);
                                if (testFitness > currentFitness) {
                                    current = testChromosome; currentFitness = testFitness; improved = true; break;
                                }
                            }
                        }
                        if (improved) break;
                    }
                    if (improved) break;
                }
                if (improved) break;
            }
        }

        current.setFitness(currentFitness);
        return current;
    }

    private boolean isSlotLocked(OptimizationRequest request, String slot) {
        return request.getLockedSlots() != null && request.getLockedSlots().contains(slot);
    }

    private boolean isDrifLocked(OptimizationRequest request, String slot, int index) {
        if (request.getLockedDrifs() == null) return false;
        Set<Integer> lockedIndices = request.getLockedDrifs().get(slot);
        return lockedIndices != null && lockedIndices.contains(index);
    }
}