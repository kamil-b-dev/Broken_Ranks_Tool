package pl.brokenranks.tool.broken_ranks_tool.component;

import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;
import pl.brokenranks.tool.broken_ranks_tool.entity.templates.ItemTemplate;
import pl.brokenranks.tool.broken_ranks_tool.repository.ItemTemplateRepository;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private final ItemTemplateRepository repository;

    @Override
    public void run(String... args) throws Exception {
        // Jeśli w bazie są już dane, nie dodajemy ich ponownie
        if (repository.count() > 0) return;

        Path path = Paths.get(new ClassPathResource("items.csv").getURI());
        List<String> lines = Files.readAllLines(path, StandardCharsets.UTF_8);

        for (String line : lines) {
            if (line.isBlank()) continue;

            // Split obsługujący przecinki wewnątrz cudzysłowu (statystyki)
            String[] parts = line.split(",(?=(?:[^\"]*\"[^\"]*\")*[^\"]*$)");

            if (parts.length < 8) continue;

            ItemTemplate template = ItemTemplate.builder()
                    .name(parts[0].trim())
                    .boss(parts[1].trim())
                    .category(parts[2].trim())
                    .tier(parts[3].trim())
                    .reqLevel(Integer.parseInt(parts[4].trim()))
                    .capacity(Integer.parseInt(parts[6].trim()))
                    .stats(parseStats(parts[7]))
                    .build();

            repository.save(template);
        }
        System.out.println("Zakończono importowanie przedmiotów z CSV!");
    }

    private Map<String, Integer> parseStats(String statsText) {
        Map<String, Integer> statMap = new HashMap<>();
        String clean = statsText.replace("\"", "").trim();
        String[] statsArray = clean.split(",");

        for (String s : statsArray) {
            String entry = s.trim();
            if (!entry.contains(":")) continue;

            String[] kv = entry.split(":");
            String name = kv[0].trim().toLowerCase();
            String valuePart = kv[1].trim();

            // 1. Pancerz po ukośnikach: "31/32/31"
            if (name.contains("pancerz") && valuePart.contains("/")) {
                String[] v = valuePart.split("/");
                if (v.length == 3) {
                    statMap.put("Pancerz sieczne", extractLastNumber(v[0]));
                    statMap.put("Pancerz obuchowe", extractLastNumber(v[1]));
                    statMap.put("Pancerz kłute", extractLastNumber(v[2]));
                }
                continue;
            }

            // 2. Odporności - rozbijanie na 4 żywioły
            if (name.contains("odpornoś")) {
                int val = extractLastNumber(valuePart);
                statMap.put("Odporność ogień", val);
                statMap.put("Odporność energia", val);
                statMap.put("Odporność zimno", val);
                statMap.put("Odporność uroki", val);
                continue;
            }

            // 3. Standardowe i mnożniki (np. Pancerz: 3x 50)
            int finalVal = extractLastNumber(valuePart);
            String formalName = name.substring(0, 1).toUpperCase() + name.substring(1);

            // Specjalna obsługa pancerza bez ukośników (np. 3x 50)
            if (name.contains("pancerz") && !valuePart.contains("/")) {
                statMap.put("Pancerz sieczne", finalVal);
                statMap.put("Pancerz obuchowe", finalVal);
                statMap.put("Pancerz kłute", finalVal);
            } else {
                statMap.put(formalName, finalVal);
            }
        }
        return statMap;
    }

    // Pomocnicza metoda, która wyciąga TYLKO ostatnią liczbę z tekstu (np. z "+20" zrobi 20, z "4x 20" zrobi 20)
    private int extractLastNumber(String text) {
        if (text == null || text.isBlank()) return 0;

        // 1. Rozbijamy tekst po spacjach (np. "+20" lub "4x", "+20")
        String[] parts = text.trim().split("\\s+");

        // 2. Bierzemy ostatni człon (to tam w Broken Ranks jest wartość statystyki)
        String lastPart = parts[parts.length - 1];

        // 3. Usuwamy wszystko co nie jest cyfrą (zostanie np. "20")
        String onlyNumbers = lastPart.replaceAll("[^0-9]", "");

        return onlyNumbers.isEmpty() ? 0 : Integer.parseInt(onlyNumbers);
    }
}