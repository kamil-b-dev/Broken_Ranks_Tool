package pl.brokenranks.tool.broken_ranks_tool.component;

import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;
import pl.brokenranks.tool.broken_ranks_tool.entity.enums.DRIF_BONUS_TYPE;
import pl.brokenranks.tool.broken_ranks_tool.entity.enums.DRIF_SIZE;
import pl.brokenranks.tool.broken_ranks_tool.entity.templates.DrifTemplate;
import pl.brokenranks.tool.broken_ranks_tool.repository.DrifTemplateRepository;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;

@Component
@RequiredArgsConstructor
public class DrifInitializer implements CommandLineRunner {

    private final DrifTemplateRepository drifRepository;

    @Override
    public void run(String... args) throws Exception {
        if (drifRepository.count() > 0) return;

        Path path = Paths.get(new ClassPathResource("drifs.csv").getURI());
        List<String> lines = Files.readAllLines(path, StandardCharsets.UTF_8);

        // Pomijamy nagłówek, jeśli istnieje
        for (int i = 1; i < lines.size(); i++) {
            String line = lines.get(i);
            if (line.isBlank()) continue;

            // Split obsługujący przecinki w cudzysłowach
            String[] parts = line.split(",(?=(?:[^\"]*\"[^\"]*\")*[^\"]*$)");

            if (parts.length < 7) continue;

            // Wewnątrz pętli for w DrifInitializer
            DrifTemplate drif = DrifTemplate.builder()
                    .name(parts[0].trim())
                    // Zamieniamy tekst na Enum (np. "Subdrif" -> DRIF_TIER.SUBDRIF)
                    .size(DRIF_SIZE.valueOf(parts[1].trim().toUpperCase()))
                    .bonusType(mapBonusType(parts[2].trim()))
                    .baseValue(parts[3].replace("\"", "").trim())
                    .increment(parts[4].replace("\"", "").trim())
                    .rankRange(parts[5].trim())
                    .price(Integer.parseInt(parts[6].replaceAll("[\\s\\u00A0]", "")))
                    .build();

            drifRepository.save(drif);
        }
        System.out.println("Zakończono importowanie drifów!");
    }
    private DRIF_BONUS_TYPE mapBonusType(String csvValue) {
        if (csvValue == null) throw new IllegalArgumentException("Typ bonusu nie może być nullem");

        String value = csvValue.toLowerCase().trim();

        return switch (value) {
            // Trafienia
            case "modyfikator trafienia wręcz", "mod. trafienia wręcz","modyfikator trafień wręcz" -> DRIF_BONUS_TYPE.HIT_CHANCE_MELEE;
            case "modyfikator trafienia dystansowego", "mod. trafienia dystans.","modyfikator trafień dystansowych" -> DRIF_BONUS_TYPE.HIT_CHANCE_RANGED;
            case "modyfikator trafienia mentalnego", "mod. trafienia mental.","modyfikator trafień mentalnych" -> DRIF_BONUS_TYPE.HIT_CHANCE_MENTAL;

            // Obrażenia i Atak
            case "obrażenia energia","dodatkowe obrażenia od energii" -> DRIF_BONUS_TYPE.DAMAGE_ENERGY;
            case "obrażenia zimno","dodatkowe obrażenia od zimna" -> DRIF_BONUS_TYPE.DAMAGE_FROST;
            case "obrażenia ogień","dodatkowe obrażenia od ognia" -> DRIF_BONUS_TYPE.DAMAGE_FIRE;
            case "obrażenia magiczne","modyfikator obrażeń magicznych" -> DRIF_BONUS_TYPE.DAMAGE_MAGIC;
            case "obrażenia fizyczne","modyfikator obrażeń fizycznych" -> DRIF_BONUS_TYPE.DAMAGE_PHYSICAL;
            case "podwójny atak","szansa na podwójny atak" -> DRIF_BONUS_TYPE.DOUBLE_ATTACK_CHANCE;
            case "szansa na krytyka", "szansa kryt.","szansa na trafienie krytyczne" -> DRIF_BONUS_TYPE.CRITICAL_CHANCE;
            case "podwójne losowanie trafienia" -> DRIF_BONUS_TYPE.DOUBLE_DEFENSE_ROLL_CHANCE;

            // Obrona i Redukcje
            case "obrona dystansowa" -> DRIF_BONUS_TYPE.DEFENSE_RANGE;
            case "obrona wręcz" -> DRIF_BONUS_TYPE.DEFENSE_MELEE;
            case "obrona mentalna" -> DRIF_BONUS_TYPE.DEFENSE_MENTAL;
            case "redukcja obrażeń" -> DRIF_BONUS_TYPE.DAMAGE_REDUCTION;
            case "szansa na unik" -> DRIF_BONUS_TYPE.DODGE_CHANCE;
            case "redukcja obrażeń krytycznych" -> DRIF_BONUS_TYPE.CRITICAL_DAMAGE_REDUCTION;
            case "odporność na krytyka", "odporność kryt.", "odporność na trafienie krytyczne" -> DRIF_BONUS_TYPE.CRITICAL_DAMAGE_CHANCE_REDUCTION;
            case "podwójne losowanie obrony" -> DRIF_BONUS_TYPE.DOUBLE_DEFENSE_ROLL_CHANCE;
            case "szansa na zredukowanie obrażeń" -> DRIF_BONUS_TYPE.DAMAGE_REDUCTION_CHANCE;
            case "redukcja otrzymanych obrażeń biernych" -> DRIF_BONUS_TYPE.PASIVE_DAMAGE_REDUCTION;
            case "red. obrażeń z ataków odbierających % pż" -> DRIF_BONUS_TYPE.PERCENTAGE_DAMAGE_REDUCTION;

            // Zasoby i Regeneracja
            case "zużycie many" -> DRIF_BONUS_TYPE.MANA_USAGE_REDUCTION;
            case "zużycie kondycji", "zużycie kondy" -> DRIF_BONUS_TYPE.STAMINA_USAGE_REDUCTION;
            case "regeneracja kondycji", "regen. kondycji" -> DRIF_BONUS_TYPE.STAMINA_REGEN;
            case "regeneracja many", "regen. many" -> DRIF_BONUS_TYPE.MANA_REGEN;

            // Pozostałe
            case "przełamanie odporności: uroki","przełamanie odporności na uroki" -> DRIF_BONUS_TYPE.MENTAL_DEFENSE_REDUCTION;
            case "szansa na odczarowanie" -> DRIF_BONUS_TYPE.DISPELL_CHANCE;
            case "odporność na cc", "odporność cc","odp. na efekty krępujące i ukazanie" -> DRIF_BONUS_TYPE.CC_PROTECTION;
            case "wyssanie many" -> DRIF_BONUS_TYPE.MANA_STEAL;

            default -> {
                System.err.println("UWAGA: Nieznany typ bonusu w CSV: [" + csvValue + "]. Mapuję na null lub rzucam błąd.");
                throw new IllegalArgumentException("Nieobsłużony typ bonusu: " + csvValue);
            }
        };
    }
}