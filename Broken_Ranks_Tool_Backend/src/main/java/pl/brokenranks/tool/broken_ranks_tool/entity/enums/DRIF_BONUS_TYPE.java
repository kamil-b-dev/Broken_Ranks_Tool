package pl.brokenranks.tool.broken_ranks_tool.entity.enums;

import jakarta.persistence.Entity;
import lombok.AllArgsConstructor;
import lombok.Getter;

@AllArgsConstructor
@Getter
public enum DRIF_BONUS_TYPE {
    CC_PROTECTION("Odpornosc cc",1),

    CRITICAL_CHANCE("Szansa kryt",4),
    CRITICAL_DAMAGE_CHANCE_REDUCTION("Odpornosc kryt",4),
    CRITICAL_DAMAGE_REDUCTION("Redukcja obrazen kryt",1),

    DAMAGE_ENERGY("Obrazenia energia",3),
    DAMAGE_FIRE("Obrazenia ogien",3),
    DAMAGE_FROST("Obrazenia zimno",3),
    DAMAGE_MAGIC("Obrazenia magiczne",3),
    DAMAGE_PHYSICAL("Obrazenia fizyczne",3),
    DAMAGE_REDUCTION("Redukcja obrazen",4),
    DAMAGE_REDUCTION_CHANCE("Szansa redukcji obrazen",3),

    DEFENSE_MELEE("Obrona wrecz",1),
    DEFENSE_MENTAL("Obrona mentalna",1),
    DEFENSE_RANGE("Obrona dystansowa",1),

    DISPELL_CHANCE("Szansa odczarowanie",2),
    DODGE_CHANCE("Szansa unik",4),

    DOUBLE_ATTACK_CHANCE("Podwojny atak",4),
    DOUBLE_DEFENSE_ROLL_CHANCE("Podwojne losowanie obrony",2),
    DOUBLE_HIT_ROLL_CHANCE("Podwojne losowanie trafienia",2),

    HIT_CHANCE_MELEE("Mod trafienia wrecz",3),
    HIT_CHANCE_MENTAL("Mod trafienia mentalnego",3),
    HIT_CHANCE_RANGED("Mod trafienia dystansowego",3),

    MANA_REGEN("Regen mana",1),
    MANA_STEAL("Wyssanie many",3),
    MANA_USAGE_REDUCTION("Zuzycie many",2),
    STAMINA_REGEN("Regen kondycja",1),
    STAMINA_USAGE_REDUCTION("Zuzycie kondy",2),

    MENTAL_DEFENSE_REDUCTION("Przelamanie odpornosci uroki",2),
    PASIVE_DAMAGE_REDUCTION("Redukcja obrazen biernych",3),
    PERCENTAGE_DAMAGE_REDUCTION("Redukcja obrazen procentowych",1);

    private final String description;
    private final int basePower;
}
