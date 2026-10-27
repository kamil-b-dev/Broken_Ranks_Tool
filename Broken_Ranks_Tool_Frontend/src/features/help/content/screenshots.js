import dimensions from "./screenshotDimensions.json";

const screenshot = (name, afterStep, caption) => ({
    id: name,
    afterStep,
    caption,
    sources: Object.fromEntries(
        ["pl", "en"].map((language) => {
            const file = `${name}-${language}.webp`;
            return [
                language,
                {
                    src: new URL(`../../../assets/help/${file}?no-inline`, import.meta.url).href,
                    ...dimensions[file],
                },
            ];
        })
    ),
});

export const HELP_SCREENSHOTS = {
    builder: [
        screenshot(
            "equipment",
            3,
            "Edytor przedmiotu: gwiazdki, orb, drify i wykorzystana pojemność."
        ),
    ],
    character: [screenshot("character", 1)],
    capacity: [screenshot("capacity", 1)],
    "built-in-drifs": [screenshot("built-in-drifs", 1)],
    "stone-levels": [screenshot("stone-levels", 1)],
    stats: [screenshot("stats", 1)],
    database: [screenshot("database", 1)],
    backpack: [
        screenshot(
            "backpack",
            1,
            "Plecak: filtry, dodawanie rzeczy i wybór drifa do optymalizacji."
        ),
    ],
    "backpack-equipping": [screenshot("backpack-source", 1)],
    "backpack-management": [screenshot("backpack-editor", 1)],
    "equipment-removal": [screenshot("equipment-removal", 1)],
    history: [screenshot("history", 1)],
    optimizer: [screenshot("optimizer-modes", 3)],
    "from-scratch": [screenshot("optimizer-settings", 2)],
    locks: [screenshot("locks", 2), screenshot("advisor-protections", 3)],
    results: [screenshot("optimizer-result", 1)],
    labels: [screenshot("labels", 1)],
    "simple-profile": [
        screenshot(
            "simple-profile",
            1,
            "Tryb prosty: profil profesji, liczby drifów i opcje dodatkowe."
        ),
    ],
    priorities: [screenshot("priorities", 1)],
    "drif-limits": [screenshot("drif-limits", 2)],
    maximization: [screenshot("maximization", 1)],
    variants: [screenshot("variants", 4)],
    "backpack-drifs": [screenshot("backpack-drifs", 2)],
    "optimizer-config": [screenshot("optimizer-config", 1)],
    advisor: [screenshot("advisor-result", 4)],
    "advisor-goals": [
        screenshot("advisor", 1, "Doradca: główny bonus, oczekiwany efekt i wartość celu."),
    ],
    "advisor-changes": [screenshot("advisor-changes", 2)],
    "advisor-search": [screenshot("advisor-search", 2)],
    reorganization: [screenshot("reorganization", 1)],
    "reorganization-tasks": [screenshot("reorganization-upgrade", 1)],
    "reorganization-settings": [screenshot("reorganization-reserve", 1)],
    "reorganization-report": [screenshot("reorganization-report", 1)],
    builds: [screenshot("build-files", 1)],
    library: [screenshot("library", 1)],
    "library-backup": [screenshot("library-backup", 2)],
    comparison: [screenshot("comparison", 1)],
    progression: [screenshot("progression-source", 1)],
    "progression-options": [
        screenshot("progression-options", 1),
        screenshot("progression-shopping", 4),
    ],
    "progression-progress": [screenshot("progression-stage", 1)],
    "progression-files": [screenshot("progression-files", 1)],
};
