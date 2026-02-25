package pl.brokenranks.tool.broken_ranks_tool.entity.enums;

import jakarta.persistence.Entity;
import lombok.AllArgsConstructor;
import lombok.Getter;

@AllArgsConstructor
@Getter
public enum DRIF_BONUS_TYPE {
    CC_PROTECTION("Odpornosc cc"),

    CRITICAL_CHANCE("Szansa kryt"),
    CRITICAL_DAMAGE_CHANCE_REDUCTION("Odpornosc kryt"),
    CRITICAL_DAMAGE_REDUCTION("Redukcja obrazen kryt"),

    DAMAGE_ENERGY("Obrazenia energia"),
    DAMAGE_FIRE("Obrazenia ogien"),
    DAMAGE_FROST("Obrazenia zimno"),
    DAMAGE_MAGIC("Obrazenia magiczne"),
    DAMAGE_PHYSICAL("Obrazenia fizyczne"),
    DAMAGE_REDUCTION("Redukcja obrazen"),
    DAMAGE_REDUCTION_CHANCE("Szansa redukcji obrazen"),

    DEFENSE_MELEE("Obrona wrecz"),
    DEFENSE_MENTAL("Obrona mentalna"),
    DEFENSE_RANGE("Obrona dystansowa"),

    DISPELL_CHANCE("Szansa odczarowanie"),
    DODGE_CHANCE("Szansa unik"),

    DOUBLE_ATTACK_CHANCE("Podwojny atak"),
    DOUBLE_DEFENSE_ROLL_CHANCE("Podwojne losowanie obrony"),
    DOUBLE_HIT_ROLL_CHANCE("Podwojne losowanie trafienia"),

    HIT_CHANCE_MELEE("Mod trafienia wrecz"),
    HIT_CHANCE_MENTAL("Mod trafienia mentalnego"),
    HIT_CHANCE_RANGED("Mod trafienia dystansowego"),

    MANA_REGEN("Regen mana"),
    MANA_STEAL("Wyssanie many"),
    MANA_USAGE_REDUCTION("Zuzycie many"),
    STAMINA_REGEN("Regen kondycja"),
    STAMINA_USAGE_REDUCTION("Zuzycie kondy"),

    MENTAL_DEFENSE_REDUCTION("Przelamanie odpornosci uroki"),
    PASIVE_DAMAGE_REDUCTION("Redukcja obrazen biernych"),
    PERCENTAGE_DAMAGE_REDUCTION("Redukcja obrazen procentowych");

    private final String description;
}
