import { parseBuildPayload } from "../builds/buildFile";
import { createBuildPayload } from "../builds/buildPayload";
import { STAT_CONFIG } from "../builder/character/characterConstants";
import { SLOTS } from "../../shared/domain/equipment/equipmentSlots";

export const PROJECT_FORMAT = "broken-ranks-tool-progression-path";
export const PROJECT_STORAGE_KEY = `${PROJECT_FORMAT}.v3`;
const VERSION_TWO_STORAGE_KEY = `${PROJECT_FORMAT}.v2`;
const LEGACY_STORAGE_KEY = `${PROJECT_FORMAT}.v1`;
export const RES_SLOTS = { ring1: "Pierścień 1", ring2: "Pierścień 2", necklace: "Naszyjnik" };
export const clone = (value) => JSON.parse(JSON.stringify(value));
import { PROFESSIONS } from "../../shared/domain/characterClasses";
export { PROFESSIONS };
export const stageFromPayload = (payload, data, id = "target", name = "Cel") => {
    const build = parseBuildPayload(payload, data);
    return {
        id,
        name: String(name).slice(0, 64),
        payload: createBuildPayload(build),
        characterLevel: build.characterConfig?.level ?? 140,
    };
};
export const newProject = () => ({
    characterClass: "ARCHER",
    target: null,
    resSlots: [],
    balanceStats: false,
    minItemLevelGap: 0,
    startingPoint: null,
    requiredItems: [],
});
export const projectPayload = (project) => ({
    format: PROJECT_FORMAT,
    version: 3,
    project: clone({
        characterClass: project.characterClass,
        target: project.target,
        resSlots: project.resSlots,
        balanceStats: project.balanceStats ?? false,
        minItemLevelGap: project.minItemLevelGap ?? 0,
        startingPoint: project.startingPoint ?? null,
        requiredItems: project.requiredItems ?? [],
    }),
});

export const parseProject = (payload, data) => {
    const project = payload?.project;
    if (
        payload?.format !== PROJECT_FORMAT ||
        ![1, 2, 3].includes(payload.version) ||
        !project ||
        !Object.hasOwn(PROFESSIONS, project.characterClass)
    )
        throw new Error("Nieobsługiwany lub niepoprawny projekt ścieżki.");
    const legacy = payload.version === 1;
    if (legacy && (!Array.isArray(project.stages) || project.stages.length > 6))
        throw new Error("Niepoprawny starszy projekt ścieżki.");
    const source = legacy ? (project.stages.at(-1) ?? null) : project.target;
    if (!legacy && source === undefined) throw new Error("Brak celu w projekcie ścieżki.");
    let target = null;
    if (source !== null) {
        if (
            !source ||
            !Number.isInteger(source.characterLevel) ||
            source.characterLevel < 1 ||
            source.characterLevel > 140
        )
            throw new Error("Niepoprawny poziom celu.");
        target = stageFromPayload(source.payload, data, "target", source.name || "Cel");
        if (source.nameSource === "CURRENT_BUILD") target.nameSource = source.nameSource;
        if (
            target.payload.build.characterConfig != null &&
            target.characterLevel !== source.characterLevel
        )
            throw new Error("Poziom celu jest niezgodny z zapisaną konfiguracją postaci.");
        target.characterLevel = source.characterLevel;
    }
    const resSlots = legacy ? [] : project.resSlots;
    if (
        !Array.isArray(resSlots) ||
        resSlots.length > 3 ||
        new Set(resSlots).size !== resSlots.length ||
        resSlots.some((slot) => !Object.hasOwn(RES_SLOTS, slot))
    )
        throw new Error("Niepoprawne sloty res.");
    const balanceStats = legacy ? false : (project.balanceStats ?? false);
    if (typeof balanceStats !== "boolean")
        throw new Error("Niepoprawna opcja równomiernego rozwoju statystyk.");
    const minItemLevelGap = legacy ? 0 : (project.minItemLevelGap ?? 0);
    if (!Number.isInteger(minItemLevelGap) || minItemLevelGap < 0 || minItemLevelGap > 140)
        throw new Error("Odstęp wymian musi być liczbą całkowitą od 0 do 140.");
    let startingPoint = null;
    if (payload.version >= 3 && project.startingPoint != null) {
        const source = project.startingPoint;
        if (
            !Number.isInteger(source.characterLevel) ||
            source.characterLevel < 1 ||
            source.characterLevel > (target?.characterLevel ?? 140)
        )
            throw new Error("Poziom początkowy musi mieścić się między 1 a poziomem celu.");
        startingPoint = stageFromPayload(source.payload, data, "start", source.name || "Początek");
        if (
            startingPoint.payload.build.characterConfig &&
            startingPoint.characterLevel !== source.characterLevel
        )
            throw new Error("Poziom początkowy jest niezgodny z konfiguracją postaci.");
        startingPoint.characterLevel = source.characterLevel;
    }
    const requiredItems =
        payload.version >= 3
            ? normalizeRequiredItems(
                  project.requiredItems ?? [],
                  data,
                  startingPoint?.characterLevel ?? 1,
                  target?.characterLevel ?? 140,
                  resSlots
              )
            : [];
    return {
        characterClass: project.characterClass,
        target,
        resSlots: [...resSlots],
        balanceStats,
        minItemLevelGap,
        startingPoint,
        requiredItems,
        ...(legacy ? { legacyMigration: true } : {}),
    };
};

export const readProjectDraft = (data) => {
    try {
        const saved =
            localStorage.getItem(PROJECT_STORAGE_KEY) ??
            localStorage.getItem(VERSION_TWO_STORAGE_KEY) ??
            localStorage.getItem(LEGACY_STORAGE_KEY);
        const project = saved ? parseProject(JSON.parse(saved), data) : newProject();
        return {
            project,
            warning: project.legacyMigration
                ? "Ze starszego projektu przyjęto ostatni etap jako cel. Etapy wcześniejsze zostaną wygenerowane ponownie; oryginalny projekt v1 pozostaje zapisany."
                : null,
        };
    } catch {
        return {
            project: newProject(),
            warning:
                "Nie udało się odczytać lokalnego projektu. Poprzedni szkic pozostaje zapisany; edycja lub import nowego projektu zastąpi ten zapis.",
        };
    }
};

export const planningRequest = (project, data) => {
    if (!project.target) throw new Error("Wybierz build docelowy.");
    const validated = parseProject(projectPayload(project), data);
    const equipment = clone(parseBuildPayload(validated.target.payload, data).requestData);
    for (const key of validated.resSlots)
        equipment.slots[key] = {
            itemId: null,
            orbIds: [],
            orbLevels: [],
            drifIds: [],
            drifLevels: {},
        };
    return {
        characterClass: validated.characterClass,
        targetLevel: validated.target.characterLevel,
        targetEquipment: equipment,
        resSlots: validated.resSlots,
        balanceStats: validated.balanceStats,
        minItemLevelGap: validated.minItemLevelGap,
        ...(validated.startingPoint
            ? {
                  startingPoint: {
                      characterLevel: validated.startingPoint.characterLevel,
                      equipment: clone(validated.startingPoint.payload.build.requestData),
                      backpack: (validated.startingPoint.payload.build.backpack || []).map(
                          (entry) =>
                              entry.kind === "ITEM"
                                  ? { id: entry.id, kind: entry.kind, equipment: entry.equipment }
                                  : {
                                        id: entry.id,
                                        kind: entry.kind,
                                        templateId: Number(entry.templateId),
                                        level: entry.level,
                                    }
                      ),
                  },
              }
            : {}),
        ...(validated.requiredItems.length ? { requiredItems: validated.requiredItems } : {}),
    };
};

export const normalizeRequiredItems = (
    items,
    data,
    firstLevel = 1,
    targetLevel = 140,
    reserved = []
) => {
    if (!Array.isArray(items) || items.length > 24)
        throw new Error("Możesz wskazać do 24 obowiązkowych przedmiotów.");
    const seen = new Set();
    return items.map((item) => {
        const template = data.items.find(
            (candidate) => String(candidate.id) === String(item?.itemId)
        );
        const slot = SLOTS.find((candidate) => candidate.key === item?.slot);
        const categories = slot ? (Array.isArray(slot.cat) ? slot.cat : [slot.cat]) : [];
        const key = `${item?.slot}:${item?.characterLevel}`;
        if (
            !template ||
            !categories.includes(template.category) ||
            reserved.includes(item.slot) ||
            !Number.isInteger(item.characterLevel) ||
            item.characterLevel < Math.max(firstLevel, template.reqLevel || 1) ||
            item.characterLevel > targetLevel ||
            seen.has(key)
        )
            throw new Error(
                "Sprawdź slot, poziom i przedmiot obowiązkowego etapu. W jednym slocie na danym poziomie może być jeden przedmiot."
            );
        seen.add(key);
        return {
            slot: item.slot,
            characterLevel: item.characterLevel,
            itemId: Number(item.itemId),
        };
    });
};

/** Generated stages export their own allocation, never the target character's full points. */
export const stageBuildPayload = (result) => {
    const stats = result.stage.equipment.characterStats ?? {};
    const points = {};
    let valid = true;
    for (const [key, config] of Object.entries(STAT_CONFIG)) {
        const value = (stats[key] - config.base) / config.ratio;
        if (!Number.isInteger(value) || value < 0) valid = false;
        points[key] = value;
    }
    if (
        Object.values(points).reduce((sum, value) => sum + value, 0) >
        (result.stage.characterLevel - 1) * 4
    )
        valid = false;
    return createBuildPayload({
        requestData: result.stage.equipment,
        characterConfig: valid ? { level: result.stage.characterLevel, spentPoints: points } : null,
        lockedSlots: [],
        lockedDrifs: {},
        backpack: [],
    });
};

export const downloadProject = (project) => {
    const url = URL.createObjectURL(
        new Blob([JSON.stringify(projectPayload(project), null, 2)], { type: "application/json" })
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "broken-ranks-sciezka-rozwoju.json";
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
};
