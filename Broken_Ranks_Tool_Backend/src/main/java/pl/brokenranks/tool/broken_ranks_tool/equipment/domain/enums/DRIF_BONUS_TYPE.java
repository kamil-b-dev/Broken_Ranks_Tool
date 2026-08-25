package pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

/** Defines all bonus types available from drifs. */
@Getter
@RequiredArgsConstructor
public enum DRIF_BONUS_TYPE {
    // Defensywne
    CC_PROTECTION("Odpornosc cc", 1, DRIF_CATEGORY.DEFENSIVE,60),
    CRITICAL_DAMAGE_CHANCE_REDUCTION("Odpornosc kryt", 2, DRIF_CATEGORY.DEFENSIVE,60),
    CRITICAL_DAMAGE_REDUCTION("Redukcja obrazen kryt", 1, DRIF_CATEGORY.DEFENSIVE,60),
    DAMAGE_REDUCTION("Redukcja obrazen", 4, DRIF_CATEGORY.DEFENSIVE,40),
    DAMAGE_REDUCTION_CHANCE("Szansa redukcji obrazen", 3, DRIF_CATEGORY.DEFENSIVE,60),
    DEFENSE_MELEE("Obrona wrecz", 1, DRIF_CATEGORY.DEFENSIVE,null),
    DEFENSE_MENTAL("Obrona mentalna", 1, DRIF_CATEGORY.DEFENSIVE,null),
    DEFENSE_RANGE("Obrona dystansowa", 1, DRIF_CATEGORY.DEFENSIVE,null),
    DODGE_CHANCE("Szansa unik", 4, DRIF_CATEGORY.DEFENSIVE,60),
    DOUBLE_DEFENSE_ROLL_CHANCE("Podwojne losowanie obrony", 2, DRIF_CATEGORY.DEFENSIVE,80),
    PASIVE_DAMAGE_REDUCTION("Redukcja obrazen biernych", 3, DRIF_CATEGORY.DEFENSIVE,80),
    PERCENTAGE_DAMAGE_REDUCTION("Redukcja obrazen procentowych", 1, DRIF_CATEGORY.DEFENSIVE,60),

    // Ofensywne
    CRITICAL_CHANCE("Szansa kryt", 4, DRIF_CATEGORY.OFFENSIVE,60),
    DAMAGE_ENERGY("Obrazenia energia", 3, DRIF_CATEGORY.OFFENSIVE,null),
    DAMAGE_FIRE("Obrazenia ogien", 3, DRIF_CATEGORY.OFFENSIVE,null),
    DAMAGE_FROST("Obrazenia zimno", 3, DRIF_CATEGORY.OFFENSIVE,null),
    DAMAGE_MAGIC("Obrazenia magiczne", 3, DRIF_CATEGORY.OFFENSIVE,null),
    DAMAGE_PHYSICAL("Obrazenia fizyczne", 3, DRIF_CATEGORY.OFFENSIVE,null),
    DOUBLE_ATTACK_CHANCE("Podwojny atak", 4, DRIF_CATEGORY.OFFENSIVE,60),
    DOUBLE_HIT_ROLL_CHANCE("Podwojne losowanie trafienia", 2, DRIF_CATEGORY.OFFENSIVE,60),
    HIT_CHANCE_MELEE("Mod trafienia wrecz", 3, DRIF_CATEGORY.OFFENSIVE,null),
    HIT_CHANCE_MENTAL("Mod trafienia mentalnego", 3, DRIF_CATEGORY.OFFENSIVE,null),
    HIT_CHANCE_RANGED("Mod trafienia dystansowego", 3, DRIF_CATEGORY.OFFENSIVE,null),
    MENTAL_DEFENSE_REDUCTION("Przelamanie odpornosci uroki", 2, DRIF_CATEGORY.OFFENSIVE,60),

    // Użytkowe
    DISPELL_CHANCE("Szansa odczarowanie", 2, DRIF_CATEGORY.UTILITY,60),
    MANA_REGEN("Regen mana", 1, DRIF_CATEGORY.UTILITY,80),
    MANA_STEAL("Wyssanie many", 3, DRIF_CATEGORY.UTILITY,40),
    MANA_USAGE_REDUCTION("Zuzycie many", 2, DRIF_CATEGORY.UTILITY,-60),
    STAMINA_REGEN("Regen kondycja", 1, DRIF_CATEGORY.UTILITY,80),
    STAMINA_USAGE_REDUCTION("Zuzycie kondy", 2, DRIF_CATEGORY.UTILITY,-60);

    private final String description;
    private final int basePower;
    private final DRIF_CATEGORY category;
    private final Integer maxCap;
}
