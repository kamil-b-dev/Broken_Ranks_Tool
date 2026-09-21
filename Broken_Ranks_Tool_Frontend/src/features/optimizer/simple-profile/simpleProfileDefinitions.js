export const SIMPLE_PROFILES = [
    { value: "MAGICAL", label: "Magiczny" },
    { value: "PHYSICAL_MELEE", label: "Fizyczny — wręcz" },
    { value: "PHYSICAL_RANGED", label: "Fizyczny — dystans" },
];

export const SIMPLE_ASPECTS = [
    {
        key: "DAMAGE",
        label: "Obrażenia",
        description: "Główne obrażenia, krytyk i podwójny atak.",
    },
    {
        key: "ACCURACY",
        label: "Celność",
        description: "Trafienie właściwe dla profilu i dodatkowe losowanie.",
    },
    {
        key: "SURVIVABILITY",
        label: "Przeżywalność",
        description: "Redukcja obrażeń, unik i obrona przed krytykami.",
    },
    {
        key: "RESOURCES",
        label: "Zasoby",
        description: "Zużycie oraz odzyskiwanie many albo kondycji.",
    },
    {
        key: "RESISTANCE",
        label: "Odporności",
        description: "Ochrona przed kontrolą i obrażeniami specjalnymi.",
    },
    {
        key: "UTILITY",
        label: "Użyteczność",
        description: "Odczarowanie i dodatkowa ochrona sytuacyjna.",
    },
];

export const SIMPLE_IMPORTANCE = [
    { value: "NORMAL", label: "Normalne" },
    { value: "IMPORTANT", label: "Ważne" },
    { value: "KEY", label: "Kluczowe" },
];

export const DEFAULT_SIMPLE_ASPECTS = {
    DAMAGE: "IMPORTANT",
    ACCURACY: "IMPORTANT",
    SURVIVABILITY: "NORMAL",
};
