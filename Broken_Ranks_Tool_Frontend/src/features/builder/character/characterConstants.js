export const STAT_CONFIG = {
    PŻ: { base: 200, ratio: 10, label: "Życie" },
    Mana: { base: 200, ratio: 10 },
    Kondycja: { base: 200, ratio: 10 },
    Siła: { base: 10, ratio: 1 },
    Zręczność: { base: 10, ratio: 1 },
    Moc: { base: 10, ratio: 1 },
    Wiedza: { base: 10, ratio: 1 },
    Inteligencja: { base: 10, ratio: 1 },
};

export const INITIAL_SPENT_POINTS = Object.fromEntries(
    Object.keys(STAT_CONFIG).map((name) => [name, 0])
);
