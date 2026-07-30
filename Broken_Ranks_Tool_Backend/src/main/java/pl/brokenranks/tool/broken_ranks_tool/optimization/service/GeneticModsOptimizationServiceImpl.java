package pl.brokenranks.tool.broken_ranks_tool.optimization.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import pl.brokenranks.tool.broken_ranks_tool.core.enums.DRIF_BONUS_TYPE;
import pl.brokenranks.tool.broken_ranks_tool.core.enums.RARITY;
import pl.brokenranks.tool.broken_ranks_tool.core.utils.StringUtils;
import pl.brokenranks.tool.broken_ranks_tool.equipment.dto.EquipmentRequest;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.DrifTemplate;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.ItemTemplate;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.EquipmentFacade;
import pl.brokenranks.tool.broken_ranks_tool.optimization.ModsOptimizationService;
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.OptimizationRequest;
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.OptimizationResponse;
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.OptimizationSummary;
import pl.brokenranks.tool.broken_ranks_tool.optimization.service.genetic.Chromosome;
import pl.brokenranks.tool.broken_ranks_tool.optimization.service.genetic.FitnessCalculator;

import java.util.*;
import java.util.concurrent.ThreadLocalRandom;
import java.util.stream.Collectors;

/**
 * Implementacja serwisu optymalizacyjnego wykorzystująca algorytm genetyczny
 * do znajdowania optymalnego ułożenia drifów w ekwipunku.
 */
@Service
@RequiredArgsConstructor
public class GeneticModsOptimizationServiceImpl implements ModsOptimizationService {

    private final EquipmentFacade equipmentFacade;
    private final FitnessCalculator fitnessCalculator;

    private static final int POPULATION_SIZE = 300;
    private static final int MAX_GENERATIONS = 500;
    private static final double MUTATION_RATE = 0.3;
    private static final int TOURNAMENT_SIZE = 5;

    @Override
    public OptimizationResponse optimize(OptimizationRequest request) {
        long startTime = System.nanoTime();

        Map<String, EquipmentRequest.SlotData> originalSlots = request.getOriginalSlots();

        List<Long> itemIds = originalSlots.values().stream()
                .filter(Objects::nonNull)
                .map(EquipmentRequest.SlotData::getItemId)
                .filter(Objects::nonNull)
                .collect(Collectors.toList());

        if (itemIds.isEmpty()) {
            return new OptimizationResponse(new EquipmentRequest(), new OptimizationSummary(false, "Brak przedmiotów do optymalizacji.", 0, 0, 0));
        }

        List<DrifTemplate> allDrifs = equipmentFacade.getAllDrifs();
        Map<Long, ItemTemplate> itemTemplates = equipmentFacade.getItemTemplates(itemIds);

        Set<String> slotsWithItems = originalSlots.entrySet().stream()
                .filter(entry -> entry.getValue() != null && entry.getValue().getItemId() != null)
                .map(Map.Entry::getKey)
                .collect(Collectors.toSet());

        Map<String, List<DrifTemplate>> validDrifsPerSlot = new HashMap<>();
        Map<String, Integer> maxDrifsPerSlot = new HashMap<>();

        for (String slot : slotsWithItems) {
            EquipmentRequest.SlotData slotData = originalSlots.get(slot);
            Long itemId = slotData.getItemId();
            ItemTemplate item = itemTemplates.get(itemId);

            if (item == null || item.getRarity() == RARITY.EPIC || item.getRarity() == RARITY.SET) {
                validDrifsPerSlot.put(slot, new ArrayList<>());
                maxDrifsPerSlot.put(slot, 0);
                continue;
            }

            int itemStars = slotData.getItemStars() != null ? slotData.getItemStars() : 1;
            maxDrifsPerSlot.put(slot, calculateMaxDrifs(item, itemStars));

            List<DrifTemplate> allowed = allDrifs.stream()
                    .filter(d -> equipmentFacade.isValidDrifSizeForTier(d, item))
                    .filter(d -> equipmentFacade.isElementalDrifPositionValid(d, slot))
                    .collect(Collectors.toList());

            Map<DRIF_BONUS_TYPE, DrifTemplate> highestSizeDrifs = new HashMap<>();
            for (DrifTemplate d : allowed) {
                highestSizeDrifs.compute(d.getBonusType(), (k, currentBest) -> {
                    if (currentBest == null) return d;
                    int currentSize = currentBest.getSize() != null ? currentBest.getSize().ordinal() : -1;
                    int newSize = d.getSize() != null ? d.getSize().ordinal() : -1;
                    return newSize > currentSize ? d : currentBest;
                });
            }

            validDrifsPerSlot.put(slot, new ArrayList<>(highestSizeDrifs.values()));
        }

        List<Chromosome> population = new ArrayList<>();
        for (int i = 0; i < POPULATION_SIZE; i++) {
            population.add(createRandomChromosome(slotsWithItems, validDrifsPerSlot, maxDrifsPerSlot));
        }

        Chromosome bestChromosome = null;

        for (int generation = 0; generation < MAX_GENERATIONS; generation++) {
            for (Chromosome chromosome : population) {
                chromosome.setFitness(fitnessCalculator.calculateFitness(chromosome, request, itemTemplates));
            }

            Chromosome currentBest = population.stream().max(Comparator.comparingDouble(Chromosome::getFitness)).orElse(null);
            if (bestChromosome == null || (currentBest != null && currentBest.getFitness() > bestChromosome.getFitness())) {
                bestChromosome = currentBest.copy();
            }

            List<Chromosome> newPopulation = new ArrayList<>();
            if (bestChromosome != null) {
                newPopulation.add(bestChromosome.copy());
            }

            while (newPopulation.size() < POPULATION_SIZE) {
                Chromosome parent1 = tournamentSelection(population);
                Chromosome parent2 = tournamentSelection(population);
                Chromosome child = crossover(parent1, parent2);
                mutate(child, validDrifsPerSlot, maxDrifsPerSlot);
                newPopulation.add(child);
            }
            population = newPopulation;
        }

        long endTime = System.nanoTime();
        double executionTime = (endTime - startTime) / 1_000_000_000.0;

        return buildResponse(bestChromosome, request, itemTemplates, executionTime);
    }

    private int calculateMaxDrifs(ItemTemplate item, int itemStars) {
        if (item == null || item.getRarity() == RARITY.EPIC || item.getRarity() == RARITY.SET) return 0;
        int tierVal = 1;
        if (item.getTier() != null) {
            tierVal = StringUtils.convertRomanToInteger(item.getTier());
        }
        int max = 0;
        if (tierVal >= 10) max = 3;
        else if (tierVal >= 7) max = 2;
        else if (tierVal >= 4) max = 1;

        if ((tierVal == 2 || tierVal == 3) && itemStars >= 7) max += 1;
        return max;
    }

    private Chromosome createRandomChromosome(Set<String> slots, Map<String, List<DrifTemplate>> validDrifsPerSlot, Map<String, Integer> maxDrifsPerSlot) {
        Chromosome chromosome = new Chromosome();
        slots.forEach(slot -> {
            List<DrifTemplate> allowed = validDrifsPerSlot.get(slot);
            List<DrifTemplate> randomDrifs = new ArrayList<>();
            int maxAllowed = maxDrifsPerSlot.getOrDefault(slot, 0);

            if (allowed != null && !allowed.isEmpty() && maxAllowed > 0) {
                int drifCount = Math.min(maxAllowed, allowed.size());
                for(int i = 0; i < drifCount; i++) {
                    randomDrifs.add(allowed.get(ThreadLocalRandom.current().nextInt(allowed.size())));
                }
            }
            chromosome.getGenes().put(slot, randomDrifs);
        });
        return chromosome;
    }

    private Chromosome tournamentSelection(List<Chromosome> population) {
        Chromosome best = null;
        for (int i = 0; i < TOURNAMENT_SIZE; i++) {
            Chromosome randomIndividual = population.get(ThreadLocalRandom.current().nextInt(population.size()));
            if (best == null || randomIndividual.getFitness() > best.getFitness()) {
                best = randomIndividual;
            }
        }
        return best != null ? best.copy() : new Chromosome();
    }

    private Chromosome crossover(Chromosome parent1, Chromosome parent2) {
        Chromosome child = new Chromosome();
        for (String slot : parent1.getGenes().keySet()) {
            if (ThreadLocalRandom.current().nextBoolean()) {
                child.getGenes().put(slot, new ArrayList<>(parent1.getGenes().get(slot)));
            } else {
                child.getGenes().put(slot, new ArrayList<>(parent2.getGenes().get(slot)));
            }
        }
        return child;
    }

    private void mutate(Chromosome chromosome, Map<String, List<DrifTemplate>> validDrifsPerSlot, Map<String, Integer> maxDrifsPerSlot) {
        for (String slot : chromosome.getGenes().keySet()) {
            if (ThreadLocalRandom.current().nextDouble() < MUTATION_RATE) {
                List<DrifTemplate> drifsInSlot = chromosome.getGenes().get(slot);
                List<DrifTemplate> allowed = validDrifsPerSlot.get(slot);
                int maxAllowed = maxDrifsPerSlot.getOrDefault(slot, 0);

                if (allowed == null || allowed.isEmpty() || maxAllowed == 0) continue;

                int action = ThreadLocalRandom.current().nextInt(3);
                if (action == 0 && !drifsInSlot.isEmpty()) {
                    drifsInSlot.remove(ThreadLocalRandom.current().nextInt(drifsInSlot.size()));
                } else if (action == 1 && drifsInSlot.size() < maxAllowed) {
                    drifsInSlot.add(allowed.get(ThreadLocalRandom.current().nextInt(allowed.size())));
                } else if (!drifsInSlot.isEmpty()) {
                    drifsInSlot.set(
                            ThreadLocalRandom.current().nextInt(drifsInSlot.size()),
                            allowed.get(ThreadLocalRandom.current().nextInt(allowed.size()))
                    );
                }
            }
        }
    }

    private OptimizationResponse buildResponse(Chromosome best, OptimizationRequest request, Map<Long, ItemTemplate> itemTemplates, double executionTime) {
        EquipmentRequest optimizedSetup = new EquipmentRequest();
        Map<String, EquipmentRequest.SlotData> finalSlots = new HashMap<>(request.getOriginalSlots());
        int totalDrifs = 0;

        if (best != null && best.getGenes() != null) {
            for (Map.Entry<String, List<DrifTemplate>> geneEntry : best.getGenes().entrySet()) {
                String slotKey = geneEntry.getKey();
                List<DrifTemplate> rawDrifsInSlot = geneEntry.getValue();

                EquipmentRequest.SlotData slotData = finalSlots.get(slotKey);
                if (slotData == null) {
                    slotData = new EquipmentRequest.SlotData();
                }

                List<DrifTemplate> validDrifs = new ArrayList<>();
                Set<DRIF_BONUS_TYPE> seen = new HashSet<>();
                for (DrifTemplate d : rawDrifsInSlot) {
                    if (d != null && seen.add(d.getBonusType())) {
                        validDrifs.add(d);
                    }
                }

                int itemStars = slotData.getItemStars() != null ? slotData.getItemStars() : 1;
                ItemTemplate item = itemTemplates.get(Long.valueOf(String.valueOf(slotData.getItemId())));
                int itemCapacity = item != null ? equipmentFacade.calculateItemCapacity(item, itemStars) : 0;

                int[] optimalMultipliers = fitnessCalculator.calculateOptimalMultipliers(validDrifs, itemCapacity, request.getPrioritizedBonuses());

                slotData.setDrifIds(validDrifs.stream()
                        .map(DrifTemplate::getId)
                        .collect(Collectors.toList()));

                Map<String, Integer> drifLevels = new HashMap<>();
                for (int i = 0; i < validDrifs.size(); i++) {
                    DrifTemplate drif = validDrifs.get(i);
                    int mult = optimalMultipliers[i];
                    int maxLvlForSize = drif.getSize() != null ? drif.getSize().getMaxLevel() : 21;

                    int lvl = 1;
                    if (mult == 4) lvl = 21;
                    else if (mult == 3) lvl = 16;
                    else if (mult == 2) lvl = 11;
                    else if (mult == 1) lvl = 6;

                    drifLevels.put(String.valueOf(i), Math.min(lvl, maxLvlForSize));
                }
                slotData.setDrifLevels(drifLevels);
                totalDrifs += validDrifs.size();
                finalSlots.put(slotKey, slotData);
            }
        }
        optimizedSetup.setSlots(finalSlots);

        OptimizationSummary summary = new OptimizationSummary(true, "Optymalizacja zakończona.", totalDrifs, 0, executionTime);
        return new OptimizationResponse(optimizedSetup, summary);
    }
}
