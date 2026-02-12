package pl.brokenranks.tool.broken_ranks_tool.component;

import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;
import pl.brokenranks.tool.broken_ranks_tool.entity.enums.ITEM_CATEGORY;
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
        if (repository.count() > 0) {
            System.out.println("Baza przedmiotów nie jest pusta. Pomijam import.");
            return;
        }

        System.out.println("--- START IMPORTU PRZEDMIOTÓW ---");

        // Wczytywanie pliku items.csv z resources
        ClassPathResource resource = new ClassPathResource("items.csv");
        if (!resource.exists()) {
            System.err.println("BŁĄD: Nie znaleziono pliku items.csv!");
            return;
        }

        Path path = Paths.get(resource.getURI());
        List<String> lines = Files.readAllLines(path, StandardCharsets.UTF_8);

        int imported = 0;
        // i=1 pomija nagłówek CSV. Zmień na 0, jeśli nie masz nagłówka.
        for (int i = 1; i < lines.size(); i++) {
            String line = lines.get(i);
            if (line.isBlank()) continue;

            // Regex: podział po przecinkach, ale ignoruje przecinki wewnątrz cudzysłowu (dla kolumny statystyk)
            String[] parts = line.split(",(?=(?:[^\"]*\"[^\"]*\")*[^\"]*$)");

            // Sprawdzamy czy linia ma wystarczającą liczbę kolumn (min. 8)
            if (parts.length < 8) {
                System.err.println("Pominięto linię " + i + ": nieprawidłowa liczba kolumn (" + parts.length + ").");
                continue;
            }

            try {
                ItemTemplate template = ItemTemplate.builder()
                        .name(parts[0].trim())
                        .boss(parts[1].trim())
                        // Tu używamy metody mapującej String -> Enum
                        .category(mapCategory(parts[2].trim()))
                        .tier(parts[3].trim())
                        .reqLevel(extractInt(parts[4]))
                        // parts[5] to zazwyczaj rzadkość/waga, pomijamy jeśli nie ma w encji
                        .capacity(extractInt(parts[6]))
                        // Tu używamy metody parsującej String -> Map<String, Integer>
                        .stats(parseStats(parts[7]))
                        .build();

                repository.save(template);
                imported++;
            } catch (Exception e) {
                System.err.println("Błąd przy imporcie linii " + i + " (" + parts[0] + "): " + e.getMessage());
                // e.printStackTrace(); // Odkomentuj do debugowania
            }
        }
        System.out.println("--- Zakończono importowanie przedmiotów! Zaimportowano: " + imported + " ---");
    }

    /**
     * Mapuje polskie nazwy z CSV na Enum ITEM_CATEGORY.
     */
    private ITEM_CATEGORY mapCategory(String csvValue) {
        // Usuwamy ewentualne cudzysłowy i spacje, zmieniamy na małe litery
        String val = csvValue.replace("\"", "").trim().toLowerCase();

        return switch (val) {
            case "hełmy", "hełm" -> ITEM_CATEGORY.HELMET;
            case "zbroje", "zbroja" -> ITEM_CATEGORY.ARMOR;
            case "peleryny", "peleryna","płaszcze" -> ITEM_CATEGORY.CAPE;
            case "nogawice", "spodnie" -> ITEM_CATEGORY.LEGS;
            case "buty" -> ITEM_CATEGORY.BOOTS;
            case "rękawice" -> ITEM_CATEGORY.GLOVES;
            case "pasy", "pas" -> ITEM_CATEGORY.BELT;
            case "karwasze","tarcze", "tarcza"-> ITEM_CATEGORY.OFF_HAND;

            // Biżuteria
            case "pierścienie", "pierścień" -> ITEM_CATEGORY.RING;
            case "naszyjniki", "naszyjnik","amulety" -> ITEM_CATEGORY.NECKLACE;

            // Bronie
            case "broń jednoręczna","miecze jednoręczne","młoty jednoręczne","topory jednoręczne" -> ITEM_CATEGORY.WEAPON_1H;
            case "broń dwuręczna","kastety","topory dwuręczne","kije","młoty dwuręczne","miecze dwuręczne" -> ITEM_CATEGORY.WEAPON_2H;
            case "broń dystansowa","łuki" -> ITEM_CATEGORY.WEAPON_RANGED; // lub po prostu RANGED, zależnie od Twojego Enuma

            // Domyślnie rzucamy błąd, żebyś wiedział, że coś jest nie tak w CSV
            default -> throw new IllegalArgumentException("Nieznana kategoria przedmiotu: " + csvValue);
        };
    }

    /**
     * Parsuje skomplikowany string statystyk (np. "Pancerz: 10/10/10, Siła: +5")
     * na Mapę <Statystyka, Wartość>.
     */
    private Map<String, Integer> parseStats(String statsText) {
        Map<String, Integer> statMap = new HashMap<>();
        // Usuwamy cudzysłowy otaczające całą kolumnę w CSV
        String clean = statsText.replace("\"", "").trim();

        // Dzielimy poszczególne statystyki po przecinku
        String[] statsArray = clean.split(",");

        for (String s : statsArray) {
            String entry = s.trim();
            if (!entry.contains(":")) continue;

            // Dzielimy na nazwę i wartość (np. "Pancerz" : "31/32/31")
            String[] kv = entry.split(":");
            String name = kv[0].trim().toLowerCase();
            String valuePart = kv[1].trim();

            // 1. LOGIKA PANCERZA: "31/32/31" -> Sieczne, Obuchowe, Kłute
            if (name.contains("pancerz") && valuePart.contains("/")) {
                String[] v = valuePart.split("/");
                if (v.length == 3) {
                    statMap.put("Pancerz sieczne", extractLastNumber(v[0]));
                    statMap.put("Pancerz obuchowe", extractLastNumber(v[1]));
                    statMap.put("Pancerz kłute", extractLastNumber(v[2]));
                }
                continue;
            }

            // 2. LOGIKA ODPORNOŚCI: Jedna wartość -> 4 żywioły
            if (name.contains("odpornoś")) {
                int val = extractLastNumber(valuePart);
                statMap.put("Odporność ogień", val);
                statMap.put("Odporność energia", val);
                statMap.put("Odporność zimno", val);
                statMap.put("Odporność uroki", val);
                continue;
            }

            // 3. POZOSTAŁE STATYSTYKI (Siła, Zręczność, HP itp.)
            // Wyciągamy liczbę (obsługuje "+20", "3x 50" itp.)
            int finalVal = extractLastNumber(valuePart);

            // Formatujemy klucz mapy (Pierwsza duża litera)
            String formalName = name.substring(0, 1).toUpperCase() + name.substring(1);

            // Specjalny przypadek: Pancerz podany jako jedna liczba (rzadkie, ale możliwe)
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

    /**
     * Pomocnicza metoda do wyciągania liczby z brudnego stringa (np. "+20" -> 20).
     */
    private int extractLastNumber(String text) {
        if (text == null || text.isBlank()) return 0;
        String[] parts = text.trim().split("\\s+");
        String lastPart = parts[parts.length - 1];
        String onlyNumbers = lastPart.replaceAll("[^0-9]", "");
        return onlyNumbers.isEmpty() ? 0 : Integer.parseInt(onlyNumbers);
    }

    /**
     * Pomocnicza metoda do bezpiecznego parsowania liczb z CSV.
     */
    private int extractInt(String val) {
        if (val == null) return 0;
        String clean = val.replaceAll("[^0-9]", "");
        return clean.isEmpty() ? 0 : Integer.parseInt(clean);
    }
}