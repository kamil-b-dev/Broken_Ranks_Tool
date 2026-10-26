import { equipmentTopics } from "./content/equipmentTopics.js";
import { backpackTopics } from "./content/backpackTopics.js";
import { optimizerTopics } from "./content/optimizerTopics.js";
import { fromScratchTopics } from "./content/fromScratchTopics.js";
import { advisorTopics } from "./content/advisorTopics.js";
import { reorganizationTopics } from "./content/reorganizationTopics.js";
import { buildTopics } from "./content/buildTopics.js";
import { progressionTopics } from "./content/progressionTopics.js";

export const HELP_TOPICS = [
    ...equipmentTopics,
    ...backpackTopics,
    ...optimizerTopics,
    ...fromScratchTopics,
    ...advisorTopics,
    ...reorganizationTopics,
    ...buildTopics,
    ...progressionTopics,
];

export const HELP_GROUPS = [
    {
        id: "equipment",
        title: "Ekwipunek i statystyki",
        topicIds: [
            "builder",
            "character",
            "stars",
            "capacity",
            "built-in-drifs",
            "orbs",
            "stone-levels",
            "stats",
            "database",
        ],
    },
    {
        id: "backpack",
        title: "Plecak i historia zmian",
        topicIds: [
            "backpack",
            "backpack-equipping",
            "backpack-management",
            "equipment-removal",
            "history",
        ],
    },
    {
        id: "optimization",
        title: "Optymalizator — podstawy",
        topicIds: ["optimizer", "from-scratch", "locks", "results", "labels"],
    },
    {
        id: "from-scratch",
        title: "Od zera — ustawienia",
        topicIds: [
            "simple-profile",
            "priorities",
            "drif-limits",
            "maximization",
            "variants",
            "backpack-drifs",
            "optimizer-config",
        ],
    },
    {
        id: "advisor",
        title: "Doradca",
        topicIds: ["advisor", "advisor-goals", "advisor-changes", "advisor-search"],
    },
    {
        id: "reorganization",
        title: "Reorganizacja",
        topicIds: [
            "reorganization",
            "reorganization-tasks",
            "reorganization-settings",
            "reorganization-report",
        ],
    },
    {
        id: "saved-builds",
        title: "Zapis i porównanie",
        topicIds: ["builds", "library", "library-backup", "comparison"],
    },
    {
        id: "progression",
        title: "Ścieżka rozwoju",
        topicIds: [
            "progression",
            "progression-options",
            "progression-progress",
            "progression-files",
        ],
    },
];

export const HELP_HINTS = {
    locks: "Blokada slotu zachowuje jego obecną konfigurację. Blokada pojedynczego drifa zachowuje go w tym samym gnieździe.",
    protection:
        "Chroniony bonus nie może spaść poniżej ustawionego minimum. Jeśli dopuszczasz stratę, jest ona liczona od wartości nieprzekraczającej capa.",
};

export const findHelpTopic = (id) => HELP_TOPICS.find((topic) => topic.id === id) || HELP_TOPICS[0];
