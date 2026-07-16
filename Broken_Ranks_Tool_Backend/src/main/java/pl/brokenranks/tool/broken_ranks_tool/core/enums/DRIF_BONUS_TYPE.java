package pl.brokenranks.tool.broken_ranks_tool.core.enums;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

/**
 * Reprezentuje wszystkie możliwe typy bonusów dostępne z drifów.
 */
@Getter
@RequiredArgsConstructor
public enum DRIF_BONUS_TYPE {
    // Defensywne
    CC_PROTECTION("Odpornosc cc", 1, DRIF_CATEGORY.DEFENSIVE),
    CRITICAL_DAMAGE_CHANCE_REDUCTION("Odpornosc kryt", 4, DRIF_CATEGORY.DEFENSIVE),
    CRITICAL_DAMAGE_REDUCTION("Redukcja obrazen kryt", 1, DRIF_CATEGORY.DEFENSIVE),
    DAMAGE_REDUCTION("Redukcja obrazen", 4, DRIF_CATEGORY.DEFENSIVE),
    DAMAGE_REDUCTION_CHANCE("Szansa redukcji obrazen", 3, DRIF_CATEGORY.DEFENSIVE),
    DEFENSE_MELEE("Obrona wrecz", 1, DRIF_CATEGORY.DEFENSIVE),
    DEFENSE_MENTAL("Obrona mentalna", 1, DRIF_CATEGORY.DEFENSIVE),
    DEFENSE_RANGE("Obrona dystansowa", 1, DRIF_CATEGORY.DEFENSIVE),
    DODGE_CHANCE("Szansa unik", 4, DRIF_CATEGORY.DEFENSIVE),
    DOUBLE_DEFENSE_ROLL_CHANCE("Podwojne losowanie obrony", 2, DRIF_CATEGORY.DEFENSIVE),
    PASIVE_DAMAGE_REDUCTION("Redukcja obrazen biernych", 3, DRIF_CATEGORY.DEFENSIVE),
    PERCENTAGE_DAMAGE_REDUCTION("Redukcja obrazen procentowych", 1, DRIF_CATEGORY.DEFENSIVE),

    // Ofensywne
    CRITICAL_CHANCE("Szansa kryt", 4, DRIF_CATEGORY.OFENSIVE),
    DAMAGE_ENERGY("Obrazenia energia", 3, DRIF_CATEGORY.OFENSIVE),
    DAMAGE_FIRE("Obrazenia ogien", 3, DRIF_CATEGORY.OFENSIVE),
    DAMAGE_FROST("Obrazenia zimno", 3, DRIF_CATEGORY.OFENSIVE),
    DAMAGE_MAGIC("Obrazenia magiczne", 3, DRIF_CATEGORY.OFENSIVE),
    DAMAGE_PHYSICAL("Obrazenia fizyczne", 3, DRIF_CATEGORY.OFENSIVE),
    DOUBLE_ATTACK_CHANCE("Podwojny atak", 4, DRIF_CATEGORY.OFENSIVE),
    DOUBLE_HIT_ROLL_CHANCE("Podwojne losowanie trafienia", 2, DRIF_CATEGORY.OFENSIVE),
    HIT_CHANCE_MELEE("Mod trafienia wrecz", 3, DRIF_CATEGORY.OFENSIVE),
    HIT_CHANCE_MENTAL("Mod trafienia mentalnego", 3, DRIF_CATEGORY.OFENSIVE),
    HIT_CHANCE_RANGED("Mod trafienia dystansowego", 3, DRIF_CATEGORY.OFENSIVE),
    MENTAL_DEFENSE_REDUCTION("Przelamanie odpornosci uroki", 2, DRIF_CATEGORY.OFENSIVE),

    // Użytkowe
    DISPELL_CHANCE("Szansa odczarowanie", 2, DRIF_CATEGORY.UTILITY),
    MANA_REGEN("Regen mana", 1, DRIF_CATEGORY.UTILITY),
    MANA_STEAL("Wyssanie many", 3, DRIF_CATEGORY.UTILITY),
    MANA_USAGE_REDUCTION("Zuzycie many", 2, DRIF_CATEGORY.UTILITY),
    STAMINA_REGEN("Regen kondycja", 1, DRIF_CATEGORY.UTILITY),
    STAMINA_USAGE_REDUCTION("Zuzycie kondy", 2, DRIF_CATEGORY.UTILITY);

    private final String description;
    private final int basePower;
    private final DRIF_CATEGORY category;
}
