package pl.brokenranks.tool.broken_ranks_tool.optimization.genetic;

import lombok.Getter;
import lombok.Setter;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.DrifTemplate;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Reprezentuje pojedynczego "osobnika" w populacji algorytmu genetycznego.
 * Chromosom to jedno kompletne, potencjalne rozwiązanie problemu - w tym przypadku,
 * pełne ułożenie drifów w całym ekwipunku.
 */
@Getter
@Setter
public class Chromosome {

    /**
     * Mapa genów. Kluczem jest nazwa slotu (np. "helmet"), a wartością jest lista
     * drifów (genów) osadzonych w tym slocie.
     */
    private Map<String, List<DrifTemplate>> genes;

    /**
     * Wynik funkcji przystosowania (fitness). Im wyższy, tym "lepszy" jest osobnik.
     */
    private double fitness = 0;

    public Chromosome() {
        this.genes = new HashMap<>();
    }

    public Chromosome(Map<String, List<DrifTemplate>> genes) {
        this.genes = genes;
    }

    /**
     * Tworzy kopię chromosomu. Jest to kluczowe, aby uniknąć
     * modyfikacji tego samego obiektu w różnych częściach algorytmu.
     * @return Nowa, niezależna instancja chromosomu.
     */
    public Chromosome copy() {
        Map<String, List<DrifTemplate>> copiedGenes = new HashMap<>();
        this.genes.forEach((slot, drifList) -> copiedGenes.put(slot, new java.util.ArrayList<>(drifList)));
        Chromosome copy = new Chromosome(copiedGenes);
        copy.setFitness(this.fitness);
        return copy;
    }
}
