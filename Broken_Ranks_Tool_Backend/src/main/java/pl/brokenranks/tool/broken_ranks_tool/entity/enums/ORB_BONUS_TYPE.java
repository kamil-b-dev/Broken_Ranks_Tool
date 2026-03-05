package pl.brokenranks.tool.broken_ranks_tool.entity.enums;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public enum ORB_BONUS_TYPE {
    EQUIPMENT_DRAIN_REDUCTION("Redukcja rozladowania sprzetu"),
    FASTER_REST("Szybszy odpoczynek"),
    EXTRA_DAIMONITS("Dodatkowy daimonit"),
    EXTRA_PSYCHO_EXP("Dodatkowe psychodoswiadczenie"),
    EXTRA_EXP("Dodatkowe doswiadczenie"),
    INCREASED_CARRY_WEIGHT("Wiekszy udzwig"),
    EXTRA_GOLD("Dodatkowe zloto"),

    DMG_REDUCTION_MELEE("Redukcja obrazen od ataku wrecz"),
    DMG_REDUCTION_RANGED("Redukcja obrazen od ataku dystansowego"),
    DMG_REDUCTION_MENTAL("Redukcja obrazen od ataku mentalnego"),
    DMG_REDUCTION_CHAMPION_ELITE("Redukcja obrazen od czempionow i elit"),
    DMG_REDUCTION_AOE("Redukcja obrazen od ataku obszarowego"),
    DMG_REDUCTION_NORMAL_MOBS("Redukcja obrazen od zwyklych przeciwnikow"),
    DMG_REDUCTION_BOSS("Redukcja obrazen od bossow"),

    DEFENSE_CHANCE_AFTER_HIT("Szansa obrony po udanym ataku"),
    DODGE_CHANCE_WHEN_WOUNDED("Szansa na unik gdy ciezko ranny"),
    HIT_CHANCE_AFTER_MISS("Wieksza szansa trafienia po chybieniu"),
    ATTACK_POWER_WHEN_WOUNDED("Wieksza sila ataku gdy ciezko ranny"),
    STRONGER_CRIT_CHANCE("Szansa na mocniejszy atak krytyczny"),
    BREAK_FARID_HOLM_CHANCE("Szansa na przelamanie farida i holma"),

    HEALTH_STEAL_CHANCE("Szansa na przejecie zdrowia"),
    MANA_STEAL_CHANCE("Szansa na przejecie many"),
    STAMINA_STEAL_CHANCE("Szansa na przejecie kondycji"),

    DMG_BOOST_NORMAL_MOBS("Wieksze obrazenia na zwyklych przeciwnikach"),
    DMG_BOOST_CHAMPION_ELITE("Wieksze obrazenia na czempiony i elity"),
    DMG_BOOST_BOSS("Wieksze obrazenia na bossy");

    private final String name;
}
