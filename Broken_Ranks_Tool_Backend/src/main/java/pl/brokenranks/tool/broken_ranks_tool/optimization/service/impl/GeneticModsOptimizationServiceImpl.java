package pl.brokenranks.tool.broken_ranks_tool.optimization.service.impl;

import lombok.AllArgsConstructor;
import lombok.RequiredArgsConstructor;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_BONUS_TYPE;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_SIZE;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.RARITY;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.util.RomanNumeralParser;
import pl.brokenranks.tool.broken_ranks_tool.equipment.dto.EquipmentRequest;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.DrifTemplate;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.ItemTemplate;
import pl.brokenranks.tool.broken_ranks_tool.equipment.persistence.repository.DrifTemplateRepository;
import pl.brokenranks.tool.broken_ranks_tool.equipment.persistence.repository.ItemTemplateRepository;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.validator.EquipmentValidator;
import pl.brokenranks.tool.broken_ranks_tool.optimization.service.ModsOptimizationService;
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.OptimizationRequest;
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.OptimizationResponse;
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.OptimizationSummary;
import pl.brokenranks.tool.broken_ranks_tool.optimization.genetic.Chromosome;
import pl.brokenranks.tool.broken_ranks_tool.optimization.genetic.FitnessCalculator;
import pl.brokenranks.tool.broken_ranks_tool.optimization.genetic.HillClimbingPostProcessor;

import java.util.*;
import java.util.concurrent.ThreadLocalRandom;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Implementacja serwisu optymalizacyjnego wykorzystująca algorytm genetyczny
 * do znajdowania optymalnego ułożenia drifów w ekwipunku.
 */
/**
 * Legacyjna implementacja zachowana tymczasowo jako punkt odniesienia.
 * Nie jest już beanem Springa i nie obsługuje żądań produkcyjnych.
 */
@RequiredArgsConstructor
@Deprecated
public class GeneticModsOptimizationServiceImpl implements ModsOptimizationService {

    private final DrifTemplateRepository drifRepository;
    private final ItemTemplateRepository itemRepository;
    private final FitnessCalculator fitnessCalculator;
    private final EquipmentValidator validator;
    private final HillClimbingPostProcessor postProcessor;

    private static final int POPULATION_SIZE = 100;
    private static final int MAX_GENERATIONS = 50;
    private static final double MUTATION_RATE = 0.3;
    private static final int TOURNAMENT_SIZE = 5;

    /**
     * Kontener przechowujący wszystkie dane kontekstowe potrzebne do procesu optymalizacji.
     * Upraszcza przekazywanie danych między metodami algorytmu genetycznego.
     */
    @AllArgsConstructor
    private static class OptimizationContext {
        private final Map<Long, ItemTemplate> itemTemplates;
        private final Set<String> slotsWithItems;
        private final Map<String, List<DrifTemplate>> validDrifsPerSlot;
        private final Map<String, Integer> maxDrifsPerSlot;
        private final Map<String, List<DrifTemplate>> originalGenes;
    }

    /**
     * Definiuje możliwe akcje, jakie mogą zostać wykonane podczas mutacji chromosomu.
     */
    private enum MutationAction {
        ADD, REMOVE, REPLACE
    }

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

        OptimizationContext context = prepareContext(request, originalSlots, itemIds);
        Chromosome bestChromosome = runGeneticAlgorithm(request, context);

        if (bestChromosome != null) {
            bestChromosome = postProcessor.refine(bestChromosome, request, context.itemTemplates, context.validDrifsPerSlot, context.maxDrifsPerSlot);
        }

        long endTime = System.nanoTime();
        double executionTime = (endTime - startTime) / 1_000_000_000.0;

        return buildResponse(bestChromosome, request, context.itemTemplates, executionTime);
    }

    /**
     * Przygotowuje kontekst optymalizacji, zbierając i przetwarzając wszystkie niezbędne dane.
     *
     * @param request       Oryginalne żądanie optymalizacji.
     * @param originalSlots Mapa oryginalnych slotów z żądania.
     * @param itemIds       Lista identyfikatorów przedmiotów do przetworzenia.
     * @return Instancja {@link OptimizationContext} zawierająca wszystkie wstępnie obliczone dane.
     */
    private OptimizationContext prepareContext(OptimizationRequest request, Map<String, EquipmentRequest.SlotData> originalSlots, List<Long> itemIds) {
        List<DrifTemplate> allDrifs = drifRepository.findAll();
        Map<Long, ItemTemplate> itemTemplates = itemRepository.findAllById(itemIds).stream()
                .collect(Collectors.toMap(ItemTemplate::getId, Function.identity()));

        Set<String> slotsWithItems = originalSlots.entrySet().stream()
                .filter(entry -> entry.getValue() != null && entry.getValue().getItemId() != null)
                .map(Map.Entry::getKey)
                .collect(Collectors.toSet());

        Map<String, List<DrifTemplate>> validDrifsPerSlot = new HashMap<>();
        Map<String, Integer> maxDrifsPerSlot = new HashMap<>();
        Map<String, List<DrifTemplate>> originalGenes = new HashMap<>();

        for (String slot : slotsWithItems) {
            EquipmentRequest.SlotData slotData = originalSlots.get(slot);
            ItemTemplate item = itemTemplates.get(slotData.getItemId());

            List<DrifTemplate> originalDrifsInSlot = new ArrayList<>();
            if (slotData.getDrifIds() != null) {
                for (Long drifId : slotData.getDrifIds()) {
                    allDrifs.stream().filter(d -> d.getId().equals(drifId)).findFirst().ifPresent(originalDrifsInSlot::add);
                }
            }
            originalGenes.put(slot, originalDrifsInSlot);

            if (item == null || item.getRarity() == RARITY.EPIC || item.getRarity() == RARITY.SET) {
                validDrifsPerSlot.put(slot, new ArrayList<>());
                maxDrifsPerSlot.put(slot, 0);
                continue;
            }

            int itemStars = slotData.getItemStars() != null ? slotData.getItemStars() : 1;
            maxDrifsPerSlot.put(slot, calculateMaxDrifs(item, itemStars));
            validDrifsPerSlot.put(slot, getValidDrifsForSlot(item, slot, allDrifs));
        }

        return new OptimizationContext(itemTemplates, slotsWithItems, validDrifsPerSlot, maxDrifsPerSlot, originalGenes);
    }

    /**
     * Filtruje listę wszystkich drifów, aby znaleźć te, które są odpowiednie dla danego przedmiotu i slotu.
     * Stosuje optymalizację, wybierając tylko drif o największym rozmiarze dla każdego typu bonusu.
     *
     * @param item     Przedmiot, dla którego szukane są drify.
     * @param slot     Slot, w którym znajduje się przedmiot.
     * @param allDrifs Lista wszystkich dostępnych drifów w grze.
     * @return Lista przefiltrowanych i zoptymalizowanych drifów.
     */
    private List<DrifTemplate> getValidDrifsForSlot(ItemTemplate item, String slot, List<DrifTemplate> allDrifs) {
        List<DrifTemplate> allowed = allDrifs.stream()
                .filter(d -> validator.isValidDrifSizeForTier(d, item))
                .filter(d -> validator.isElementalDrifPositionValid(d, slot))
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
        return new ArrayList<>(highestSizeDrifs.values());
    }

    /**
     * Uruchamia główną pętlę algorytmu genetycznego.
     *
     * @param request Żądanie optymalizacji zawierające priorytety i blokady.
     * @param context Przygotowany kontekst z danymi do optymalizacji.
     * @return Najlepszy znaleziony chromosom po zakończeniu wszystkich generacji.
     */
    private Chromosome runGeneticAlgorithm(OptimizationRequest request, OptimizationContext context) {
        List<Chromosome> population = new ArrayList<>();
        for (int i = 0; i < POPULATION_SIZE; i++) {
            population.add(createRandomChromosome(context, request));
        }

        Chromosome bestChromosome = null;
        for (int generation = 0; generation < MAX_GENERATIONS; generation++) {
            for (Chromosome chromosome : population) {
                chromosome.setFitness(fitnessCalculator.calculateFitness(chromosome, request, context.itemTemplates));
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
                Chromosome child = crossover(parent1, parent2, context, request);
                mutate(child, context, request);
                newPopulation.add(child);
            }
            population = newPopulation;
        }
        return bestChromosome;
    }

    /**
     * Oblicza maksymalną liczbę drifów, jaka może zostać włożona do danego przedmiotu.
     *
     * @param item      Szablon przedmiotu.
     * @param itemStars Liczba gwiazdek przedmiotu.
     * @return Maksymalna dopuszczalna liczba drifów.
     */
    private int calculateMaxDrifs(ItemTemplate item, int itemStars) {
        if (item == null || item.getRarity() == RARITY.EPIC || item.getRarity() == RARITY.SET) return 0;
        int tierVal = 1;
        if (item.getTier() != null) {
            tierVal = RomanNumeralParser.convertRomanToInteger(item.getTier());
        }
        int max = 0;
        if (tierVal >= 10) max = 3;
        else if (tierVal >= 7) max = 2;
        else if (tierVal >= 4) max = 1;

        if ((tierVal == 2 || tierVal == 3) && itemStars >= 7) max += 1;
        return max;
    }

    /**
     * Wymusza ograniczenia na chromosomie, upewniając się, że zablokowane sloty
     * oraz pojedyncze zablokowane drify nie ulegają zmianie w procesie ewolucji.
     * Ta metoda jest odporna na zmiany indeksów i pojemności listy drifów.
     *
     * @param chromosome Chromosom poddawany weryfikacji.
     * @param context    Kontekst optymalizacji zawierający m.in. oryginalne geny i maksymalną liczbę drifów.
     * @param request    Obiekt żądania zawierający informacje o nałożonych blokadach.
     */
    private void enforceLocks(Chromosome chromosome, OptimizationContext context, OptimizationRequest request) {
        for (String slot : chromosome.getGenes().keySet()) {
            if (request.getLockedSlots() != null && request.getLockedSlots().contains(slot)) {
                chromosome.getGenes().put(slot, new ArrayList<>(context.originalGenes.getOrDefault(slot, new ArrayList<>())));
                continue;
            }

            if (request.getLockedDrifs() != null && request.getLockedDrifs().containsKey(slot)) {
                Set<Integer> lockedIndices = request.getLockedDrifs().get(slot);
                if (lockedIndices == null || lockedIndices.isEmpty()) continue;

                List<DrifTemplate> currentDrifs = chromosome.getGenes().get(slot);
                List<DrifTemplate> originalDrifs = context.originalGenes.getOrDefault(slot, new ArrayList<>());
                int maxDrifs = context.maxDrifsPerSlot.getOrDefault(slot, 0);

                Map<Integer, DrifTemplate> lockedDrifMap = new HashMap<>();
                for (Integer index : lockedIndices) {
                    if (index < originalDrifs.size()) {
                        lockedDrifMap.put(index, originalDrifs.get(index));
                    }
                }

                List<DrifTemplate> unlockedDrifs = new ArrayList<>();
                for (int i = 0; i < currentDrifs.size(); i++) {
                    if (!lockedIndices.contains(i)) {
                        unlockedDrifs.add(currentDrifs.get(i));
                    }
                }

                List<DrifTemplate> newDrifs = new ArrayList<>();
                int unlockedIdx = 0;
                for (int i = 0; i < maxDrifs; i++) {
                    if (lockedDrifMap.containsKey(i)) {
                        newDrifs.add(lockedDrifMap.get(i));
                    } else if (unlockedIdx < unlockedDrifs.size()) {
                        newDrifs.add(unlockedDrifs.get(unlockedIdx));
                        unlockedIdx++;
                    } else {
                        break;
                    }
                }
                chromosome.getGenes().put(slot, newDrifs);
            }
        }
    }


    /**
     * Tworzy losowy chromosom początkowy uwzględniający dopuszczalne typy drifów
     * oraz nałożone przez gracza blokady.
     *
     * @param context Kontekst optymalizacji z potrzebnymi danymi.
     * @param request Obiekt żądania optymalizacyjnego.
     * @return Nowo utworzony, losowy chromosom.
     */
    private Chromosome createRandomChromosome(OptimizationContext context, OptimizationRequest request) {
        Chromosome chromosome = new Chromosome();
        context.slotsWithItems.forEach(slot -> {
            List<DrifTemplate> allowed = context.validDrifsPerSlot.get(slot);
            int maxAllowed = context.maxDrifsPerSlot.getOrDefault(slot, 0);
            chromosome.getGenes().put(slot, generateRandomDrifsForSlot(allowed, maxAllowed));
        });

        enforceLocks(chromosome, context, request);
        return chromosome;
    }

    /**
     * Generuje listę losowych drifów dla pojedynczego slotu, biorąc pod uwagę dozwolone drify i maksymalną liczbę.
     *
     * @param allowedDrifs Lista drifów dozwolonych w danym slocie.
     * @param maxDrifs     Maksymalna liczba drifów, jaką można umieścić w slocie.
     * @return Lista losowo wybranych drifów.
     */
    private List<DrifTemplate> generateRandomDrifsForSlot(List<DrifTemplate> allowedDrifs, int maxDrifs) {
        List<DrifTemplate> randomDrifs = new ArrayList<>();
        if (allowedDrifs != null && !allowedDrifs.isEmpty() && maxDrifs > 0) {
            int drifCount = Math.min(maxDrifs, allowedDrifs.size());
            for (int i = 0; i < drifCount; i++) {
                randomDrifs.add(allowedDrifs.get(ThreadLocalRandom.current().nextInt(allowedDrifs.size())));
            }
        }
        return randomDrifs;
    }


    /**
     * Wybiera najlepszego chromosomu spośród losowo dobranej grupy w procesie selekcji turniejowej.
     *
     * @param population Aktualna populacja chromosomów.
     * @return Najlepszy chromosom ze zwycięskiego turnieju.
     */
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

    /**
     * Dokonuje krzyżowania dwóch chromosomów rodzicielskich, tworząc nowego potomka.
     * Krzyżowanie respektuje zdefiniowane blokady slotów i drifów.
     *
     * @param parent1 Pierwszy chromosom rodzicielski.
     * @param parent2 Drugi chromosom rodzicielski.
     * @param context Kontekst optymalizacji.
     * @param request Obiekt żądania optymalizacyjnego.
     * @return Chromosom potomny powstały po krzyżowaniu.
     */
    private Chromosome crossover(Chromosome parent1, Chromosome parent2, OptimizationContext context, OptimizationRequest request) {
        Chromosome child = new Chromosome();
        for (String slot : parent1.getGenes().keySet()) {
            if (ThreadLocalRandom.current().nextBoolean()) {
                child.getGenes().put(slot, new ArrayList<>(parent1.getGenes().get(slot)));
            } else {
                child.getGenes().put(slot, new ArrayList<>(parent2.getGenes().get(slot)));
            }
        }
        enforceLocks(child, context, request);
        return child;
    }

    /**
     * Wprowadza losowe mutacje w podanym chromosomie z zachowaniem narzuconych blokad.
     *
     * @param chromosome Chromosom poddawany mutacji.
     * @param context    Kontekst optymalizacji z potrzebnymi danymi.
     * @param request    Obiekt żądania optymalizacyjnego.
     */
    private void mutate(Chromosome chromosome, OptimizationContext context, OptimizationRequest request) {
        for (String slot : chromosome.getGenes().keySet()) {
            if (ThreadLocalRandom.current().nextDouble() < MUTATION_RATE) {
                if (request.getLockedSlots() != null && request.getLockedSlots().contains(slot)) {
                    continue;
                }

                List<DrifTemplate> drifsInSlot = chromosome.getGenes().get(slot);
                List<DrifTemplate> allowed = context.validDrifsPerSlot.get(slot);
                int maxAllowed = context.maxDrifsPerSlot.getOrDefault(slot, 0);

                if (allowed == null || allowed.isEmpty() || maxAllowed == 0) continue;

                int actionIndex = ThreadLocalRandom.current().nextInt(MutationAction.values().length);
                MutationAction action = MutationAction.values()[actionIndex];
                Set<Integer> lockedIndices = request.getLockedDrifs() != null ? request.getLockedDrifs().getOrDefault(slot, new HashSet<>()) : new HashSet<>();

                switch (action) {
                    case REMOVE:
                        if (!drifsInSlot.isEmpty()) {
                            int idxToRemove = ThreadLocalRandom.current().nextInt(drifsInSlot.size());
                            if (!lockedIndices.contains(idxToRemove)) {
                                drifsInSlot.remove(idxToRemove);
                            }
                        }
                        break;
                    case ADD:
                        if (drifsInSlot.size() < maxAllowed) {
                            drifsInSlot.add(allowed.get(ThreadLocalRandom.current().nextInt(allowed.size())));
                        }
                        break;
                    case REPLACE:
                        if (!drifsInSlot.isEmpty()) {
                            int idxToReplace = ThreadLocalRandom.current().nextInt(drifsInSlot.size());
                            if (!lockedIndices.contains(idxToReplace)) {
                                drifsInSlot.set(idxToReplace, allowed.get(ThreadLocalRandom.current().nextInt(allowed.size())));
                            }
                        }
                        break;
                }
            }
        }
        enforceLocks(chromosome, context, request);
    }

    /**
     * Konwertuje najlepszy chromosom na strukturę odpowiedzi DTO.
     *
     * @param best          Najlepszy chromosom znaleziony przez algorytm.
     * @param request       Oryginalne żądanie optymalizacji.
     * @param itemTemplates Mapa wszystkich załadowanych przedmiotów.
     * @param executionTime Czas wykonania całego procesu w sekundach.
     * @return Ostateczna odpowiedź zawierająca optymalne ułożenie.
     */
    private OptimizationResponse buildResponse(Chromosome best, OptimizationRequest request, Map<Long, ItemTemplate> itemTemplates, double executionTime) {
        EquipmentRequest optimizedSetup = new EquipmentRequest();
        Map<String, EquipmentRequest.SlotData> finalSlots = new HashMap<>(request.getOriginalSlots());
        int totalDrifs = 0;

        if (best != null && best.getGenes() != null) {
            for (Map.Entry<String, List<DrifTemplate>> geneEntry : best.getGenes().entrySet()) {
                String slotKey = geneEntry.getKey();
                EquipmentRequest.SlotData slotData = finalSlots.get(slotKey);
                if (slotData == null) continue;

                List<DrifTemplate> validDrifs = filterUniqueBonusDrifs(geneEntry.getValue());
                int itemStars = slotData.getItemStars() != null ? slotData.getItemStars() : 1;
                ItemTemplate item = itemTemplates.get(slotData.getItemId());
                int itemCapacity = item != null ? validator.calculateItemCapacity(item, itemStars) : 0;

                int[] optimalMultipliers = fitnessCalculator.calculateOptimalMultipliers(validDrifs, itemCapacity, request.getPriorities());

                slotData.setDrifIds(validDrifs.stream().map(DrifTemplate::getId).collect(Collectors.toList()));
                slotData.setDrifLevels(calculateDrifLevels(validDrifs, optimalMultipliers));
                totalDrifs += validDrifs.size();
                finalSlots.put(slotKey, slotData);
            }
        }
        optimizedSetup.setSlots(finalSlots);

        OptimizationSummary summary = new OptimizationSummary(true, "Optymalizacja zakończona.", totalDrifs, 0, executionTime);
        return new OptimizationResponse(optimizedSetup, summary);
    }

    /**
     * Filtruje listę drifów, aby zawierała tylko jeden drif na każdy unikalny typ bonusu.
     *
     * @param rawDrifsInSlot Lista drifów, która może zawierać duplikaty typów bonusów.
     * @return Przefiltrowana lista drifów.
     */
    private List<DrifTemplate> filterUniqueBonusDrifs(List<DrifTemplate> rawDrifsInSlot) {
        if (rawDrifsInSlot == null) return new ArrayList<>();
        Set<DRIF_BONUS_TYPE> seen = new HashSet<>();
        return rawDrifsInSlot.stream()
                .filter(d -> d != null && seen.add(d.getBonusType()))
                .collect(Collectors.toList());
    }

    /**
     * Oblicza poziomy drifów na podstawie optymalnych mnożników, używając wartości z {@link DRIF_SIZE}.
     *
     * @param validDrifs         Lista drifów do uwzględnienia.
     * @param optimalMultipliers Tablica mnożników obliczonych przez kalkulator fitness.
     * @return Mapa mapująca indeks drifu na jego obliczony poziom.
     */
    private Map<String, Integer> calculateDrifLevels(List<DrifTemplate> validDrifs, int[] optimalMultipliers) {
        Map<String, Integer> drifLevels = new HashMap<>();
        for (int i = 0; i < validDrifs.size(); i++) {
            DrifTemplate drif = validDrifs.get(i);
            int mult = optimalMultipliers[i];
            int maxLvlForSize = drif.getSize() != null ? drif.getSize().getMaxLevel() : DRIF_SIZE.ARCYDRIF.getMaxLevel();

            int lvl = 1;
            if (mult == 4) lvl = DRIF_SIZE.ARCYDRIF.getMaxLevel();
            else if (mult == 3) lvl = DRIF_SIZE.MAGNIDRIF.getMaxLevel();
            else if (mult == 2) lvl = DRIF_SIZE.BIDRIF.getMaxLevel();
            else if (mult == 1) lvl = DRIF_SIZE.SUBDRIF.getMaxLevel();

            drifLevels.put(String.valueOf(i), Math.min(lvl, maxLvlForSize));
        }
        return drifLevels;
    }
}
