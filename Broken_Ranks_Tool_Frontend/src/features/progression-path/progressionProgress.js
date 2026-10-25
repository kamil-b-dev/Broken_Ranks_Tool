import { equipmentRequestIdentity } from "../../shared/domain/equipment/equipmentRequestIdentity";

export const PROGRESSION_PROGRESS_KEY = "broken-ranks-tool.progression-progress.v1";
const canonical = (value) =>
    JSON.stringify(value, function (_key, entry) {
        return entry && typeof entry === "object" && !Array.isArray(entry)
            ? Object.fromEntries(
                  Object.keys(entry)
                      .sort()
                      .map((key) => [key, entry[key]])
              )
            : entry;
    });

export const progressionInputKey = (project) => {
    if (!project.target) return null;
    const request = structuredClone(project.target.payload.build.requestData);
    for (const slot of project.resSlots) delete request.slots[slot];
    return canonical([
        project.characterClass,
        project.target.characterLevel,
        equipmentRequestIdentity(request),
        [...project.resSlots].sort(),
        project.balanceStats ?? false,
        project.minItemLevelGap ?? 0,
    ]);
};

/** Bind checkmarks to actual instructions and equipment, never to translated labels or timings. */
export const progressionPlanKey = async (report) => {
    const bytes = new TextEncoder().encode(
        canonical({
            stages: report.stages.map(({ stage, actions, orbActions }) => ({
                stage: { characterLevel: stage.characterLevel, equipment: stage.equipment },
                actions,
                orbActions: orbActions ?? [],
            })),
            resSlots: report.resSlots ?? [],
        })
    );
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join(
        ""
    );
};

const valid = (value) =>
    value?.version === 1 &&
    typeof value.inputKey === "string" &&
    value.inputKey.length <= 500_000 &&
    /^[a-f0-9]{64}$/.test(value.planKey) &&
    Number.isInteger(value.playerLevel) &&
    value.playerLevel >= 1 &&
    value.playerLevel <= 140 &&
    Array.isArray(value.completed) &&
    value.completed.length <= 140 &&
    (value.prepared == null ||
        (Array.isArray(value.prepared) &&
            value.prepared.length <= 10000 &&
            value.prepared.every((id) => typeof id === "string" && id.length <= 256) &&
            new Set(value.prepared).size === value.prepared.length)) &&
    value.completed.every((level) => Number.isInteger(level) && level >= 1 && level <= 140) &&
    new Set(value.completed).size === value.completed.length;

export function readProgressionProgress(storage) {
    try {
        storage ??= localStorage;
        const raw = storage.getItem(PROGRESSION_PROGRESS_KEY);
        if (raw == null) return { progress: null, warning: null };
        const progress = JSON.parse(raw);
        if (!valid(progress)) throw new Error("invalid progress");
        return { progress, warning: null };
    } catch {
        return {
            progress: null,
            warning:
                "Nie udało się odczytać zapisanego postępu ścieżki. Etapy wymagają ponownego sprawdzenia.",
        };
    }
}

export function restoreProgressionProgress(saved, inputKey, planKey, levels) {
    const matches = saved?.inputKey === inputKey && saved.planKey === planKey;
    return {
        playerLevel: Math.min(saved?.playerLevel ?? 1, levels.at(-1) ?? 140),
        completed: matches ? saved.completed.filter((level) => levels.includes(level)) : [],
        ...(matches && saved.prepared ? { prepared: saved.prepared } : {}),
        warning:
            (saved?.completed.length || saved?.prepared?.length) && !matches
                ? "Plan się zmienił. Poprzednie oznaczenia wykonania nie zostały przeniesione; sprawdź etapy ponownie."
                : null,
    };
}

export function writeProgressionProgress(value, storage) {
    try {
        storage ??= localStorage;
        const record = { version: 1, ...value };
        if (!valid(record)) return false;
        const previous = readProgressionProgress(storage);
        if (previous.warning) {
            const raw = storage.getItem(PROGRESSION_PROGRESS_KEY);
            if (raw != null) {
                const key = `${PROGRESSION_PROGRESS_KEY}.recovery.${crypto.randomUUID()}`;
                storage.setItem(key, raw);
                if (storage.getItem(key) !== raw) return false;
            }
        }
        storage.setItem(PROGRESSION_PROGRESS_KEY, JSON.stringify(record));
        return true;
    } catch {
        return false;
    }
}
