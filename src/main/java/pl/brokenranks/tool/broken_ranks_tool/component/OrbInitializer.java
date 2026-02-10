package pl.brokenranks.tool.broken_ranks_tool.component;

import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;
import pl.brokenranks.tool.broken_ranks_tool.entity.enums.ORB_CATEGORY;
import pl.brokenranks.tool.broken_ranks_tool.entity.templates.OrbTemplate;
import pl.brokenranks.tool.broken_ranks_tool.entity.enums.ORB_BONUS_TYPE;
import pl.brokenranks.tool.broken_ranks_tool.entity.enums.ORB_SIZE;
import pl.brokenranks.tool.broken_ranks_tool.repository.OrbTemplateRepository;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;

@Component
@RequiredArgsConstructor
public class OrbInitializer implements CommandLineRunner {

    private final OrbTemplateRepository orbRepository;

    @Override
    public void run(String... args) throws Exception {
        System.out.println("--- START IMPORTU ORBÓW ---");

        long count = orbRepository.count();
        if (count > 0) {
            System.out.println("Baza orbów nie jest pusta (rekordów: " + count + "). Pomijam import.");
            return;
        }

        // Sprawdzanie pliku
        var resource = new ClassPathResource("orbs.csv");
        if (!resource.exists()) {
            System.err.println("BŁĄD: Nie znaleziono pliku orbs.csv w folderze resources!");
            return;
        }

        Path path = Paths.get(resource.getURI());
        List<String> lines = Files.readAllLines(path, StandardCharsets.UTF_8);
        System.out.println("Wczytano linii z pliku: " + lines.size());

        int imported = 0;
        for (int i = 1; i < lines.size(); i++) {
            String line = lines.get(i);
            if (line.isBlank()) continue;

            // Debugowanie linii
            // System.out.println("Przetwarzam linię " + i + ": " + line);

            String[] parts = line.split(",(?=(?:[^\"]*\"[^\"]*\")*[^\"]*$)");

            if (parts.length < 9) {
                System.err.println("BŁĄD LINII " + i + ": Nieprawidłowa liczba kolumn (" + parts.length + " zamiast 9). Sprawdź separator (czy na pewno przecinek?).");
                continue;
            }

            try {
                OrbTemplate orb = OrbTemplate.builder()
                        .name(parts[0].trim())
                        .size(ORB_SIZE.valueOf(parts[1].trim().toUpperCase()))
                        .category(mapOrbType(parts[2].trim()))
                        .bonusType(mapBonusType(parts[3].trim()))
                        .bonusLvl1(cleanValue(parts[4]))
                        .bonusLvl2(cleanValue(parts[5]))
                        .bonusLvl3(cleanValue(parts[6]))
                        .rankRange(parts[7].trim())
                        .price(Integer.parseInt(parts[8].replaceAll("[^0-9]", "")))
                        .build();

                orbRepository.save(orb);
                imported++;
            } catch (Exception e) {
                System.err.println("BŁĄD KRYTYCZNY w linii " + i + ": " + e.getMessage());
                // e.printStackTrace(); // Odkomentuj jeśli chcesz pełny błąd
            }
        }
        System.out.println("--- KONIEC IMPORTU ORBÓW. Zaimportowano: " + imported + " ---");
    }

    // ... (metody pomocnicze cleanValue, mapOrbType i mapBonusType zostaw bez zmian) ...
    // Pamiętaj, aby metody pomocnicze były wewnątrz klasy!

    private String cleanValue(String val) {
        return val.replace("\"", "").trim();
    }

    private ORB_CATEGORY mapOrbType(String csvValue) {
        // Usuwamy spacje i robimy małe litery dla pewności
        String val = csvValue.trim().toLowerCase();

        return switch (val) {
            case "uniwersalny" -> ORB_CATEGORY.UTILITY;

            // Obsługa starego i nowego nazewnictwa z CSV
            case "atak", "ofensywny" -> ORB_CATEGORY.OFENSIVE;
            case "obrona", "defensywny" -> ORB_CATEGORY.DEFENSIVE;

            default -> {
                System.out.println("Nieznany typ orba: " + csvValue + " -> ustawiam UNIWERSALNY");
                yield ORB_CATEGORY.UTILITY;
            }
        };
    }

    private ORB_BONUS_TYPE mapBonusType(String csvValue) {
        // Tu wklej swoją dużą metodę mapBonusType
        // Jeśli rzuca wyjątek, zobaczymy go teraz w konsoli
        return switch (csvValue.toLowerCase()) {
            case "redukcja rozładowania sprzętu" -> ORB_BONUS_TYPE.EQUIPMENT_DRAIN_REDUCTION;
            case "szybszy odpoczynek" -> ORB_BONUS_TYPE.FASTER_REST;
            case "dodatkowy daimonit" -> ORB_BONUS_TYPE.EXTRA_DAIMONITS;
            case "dodatkowe psychodoświadczenie" -> ORB_BONUS_TYPE.EXTRA_PSYCHO_EXP;
            case "dodatkowe doświadczenie" -> ORB_BONUS_TYPE.EXTRA_EXP;
            case "większy udźwig" -> ORB_BONUS_TYPE.INCREASED_CARRY_WEIGHT;
            case "dodatkowe złoto" -> ORB_BONUS_TYPE.EXTRA_GOLD;

            case "redukcja obrażeń od ataku wręcz" -> ORB_BONUS_TYPE.DMG_REDUCTION_MELEE;
            case "redukcja obrażeń od ataku dystansowego" -> ORB_BONUS_TYPE.DMG_REDUCTION_RANGED;
            case "redukcja obrażeń od ataku mentalnego" -> ORB_BONUS_TYPE.DMG_REDUCTION_MENTAL;
            case "redukcja obrażeń od czempionów i elit" -> ORB_BONUS_TYPE.DMG_REDUCTION_CHAMPION_ELITE;
            case "redukcja obrażeń od ataku obszarowego" -> ORB_BONUS_TYPE.DMG_REDUCTION_AOE;
            case "redukcja obrażeń od zwykłych przeciwników" -> ORB_BONUS_TYPE.DMG_REDUCTION_NORMAL_MOBS;
            case "redukcja obrażeń od bossów" -> ORB_BONUS_TYPE.DMG_REDUCTION_BOSS;

            case "szansa obrony po udanym ataku" -> ORB_BONUS_TYPE.DEFENSE_CHANCE_AFTER_HIT;
            case "szansa na unik gdy ciężko ranny" -> ORB_BONUS_TYPE.DODGE_CHANCE_WHEN_WOUNDED;
            case "większa szansa trafienia po chybieniu" -> ORB_BONUS_TYPE.HIT_CHANCE_AFTER_MISS;
            case "szansa na przejęcie zdrowia" -> ORB_BONUS_TYPE.HEALTH_STEAL_CHANCE;
            case "większa siła ataku gdy ciężko ranny" -> ORB_BONUS_TYPE.ATTACK_POWER_WHEN_WOUNDED;
            case "większe obrażenia na zwykłych przeciwnikach" -> ORB_BONUS_TYPE.DMG_BOOST_NORMAL_MOBS;
            case "szansa na mocniejszy atak krytyczny" -> ORB_BONUS_TYPE.STRONGER_CRIT_CHANCE;
            case "większe obrażenia na czempiony i elity" -> ORB_BONUS_TYPE.DMG_BOOST_CHAMPION_ELITE;
            case "szansa na przejęcie many" -> ORB_BONUS_TYPE.MANA_STEAL_CHANCE;
            case "szansa na przejęcie kondycji" -> ORB_BONUS_TYPE.STAMINA_STEAL_CHANCE;
            case "szansa na przełamanie farida i holma" -> ORB_BONUS_TYPE.BREAK_FARID_HOLM_CHANCE;
            case "większe obrażenia na bossy" -> ORB_BONUS_TYPE.DMG_BOOST_BOSS;

            default -> throw new IllegalArgumentException("Nieznany bonus Orba: " + csvValue);
        };
    }
}