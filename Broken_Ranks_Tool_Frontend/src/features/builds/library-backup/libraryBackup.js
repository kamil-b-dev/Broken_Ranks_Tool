import { parseBuildPayload } from "../buildFile";
import { createBuildPayload } from "../buildPayload";
import { MAX_SAVED_BUILDS, normalizeBuildName } from "../buildLibraryStorage";

export const LIBRARY_BACKUP_FORMAT = "broken-ranks-tool-build-library";
export const MAX_LIBRARY_BACKUP_SIZE = 10 * 1024 * 1024;
export const librarySnapshotIdentity = (builds) => JSON.stringify(builds);
export const createLibraryBackup = (builds) => ({
    format: LIBRARY_BACKUP_FORMAT,
    version: 1,
    exportedAt: new Date().toISOString(),
    builds: structuredClone(builds),
});
const fail = () => {
    throw new Error("Nieobsługiwana lub niepoprawna kopia biblioteki.");
};
const object = (value) => value && typeof value === "object" && !Array.isArray(value);

/** Every build passes the same catalog/domain validation as an individual import. */
export function parseLibraryBackup(payload, data) {
    if (
        payload?.format !== LIBRARY_BACKUP_FORMAT ||
        payload.version !== 1 ||
        !Array.isArray(payload.builds) ||
        payload.builds.length > MAX_SAVED_BUILDS
    )
        fail();
    const ids = new Set();
    return payload.builds.map((record) => {
        if (
            !object(record) ||
            typeof record.id !== "string" ||
            !record.id.length ||
            record.id.length > 128 ||
            ids.has(record.id) ||
            typeof record.name !== "string" ||
            !record.name.trim() ||
            record.name.length > 48 ||
            typeof record.savedAt !== "string" ||
            !Number.isFinite(Date.parse(record.savedAt)) ||
            (record.updatedAt != null &&
                (typeof record.updatedAt !== "string" ||
                    !Number.isFinite(Date.parse(record.updatedAt)))) ||
            (record.stats != null && !object(record.stats)) ||
            (record.statSources != null && !object(record.statSources))
        )
            fail();
        ids.add(record.id);
        const imported = parseBuildPayload(record.payload, data);
        // Keep backup timestamps and cached display stats; opening a build always recalculates.
        const normalized = createBuildPayload(imported);
        normalized.exportedAt = record.payload.exportedAt ?? normalized.exportedAt;
        return {
            id: record.id,
            name: normalizeBuildName(record.name),
            savedAt: record.savedAt,
            updatedAt: record.updatedAt ?? record.savedAt,
            payload: normalized,
            stats: record.stats ?? null,
            statSources: record.statSources ?? {},
        };
    });
}

export async function readLibraryBackup(file, data) {
    if (!file || file.size > MAX_LIBRARY_BACKUP_SIZE)
        throw new Error("Kopia biblioteki jest zbyt duża (maksymalnie 10 MB).");
    let payload;
    try {
        payload = JSON.parse(await file.text());
    } catch {
        throw new Error("Plik nie zawiera poprawnego JSON-a.");
    }
    return parseLibraryBackup(payload, data);
}

export const libraryConflicts = (existing, incoming) =>
    existing.filter(
        (record) =>
            record.id === incoming.id ||
            record.name.trim().toLocaleLowerCase("pl-PL") ===
                incoming.name.trim().toLocaleLowerCase("pl-PL")
    );

export function planLibraryImport(existing, incoming, decisions = {}) {
    const replacements = new Set();
    let added = 0,
        skipped = 0;
    const actions = incoming.map((record) => {
        const conflicts = libraryConflicts(existing, record);
        const choice = Object.hasOwn(decisions, record.id)
            ? decisions[record.id]
            : conflicts.length
              ? "copy"
              : "add";
        if (typeof choice !== "string")
            throw new Error("Sprawdź sposób rozwiązywania konfliktów biblioteki.");
        if (choice === "skip") {
            skipped++;
            return { record, choice };
        }
        if (choice.startsWith("replace:")) {
            const targetId = choice.slice(8);
            if (!conflicts.some((entry) => entry.id === targetId) || replacements.has(targetId))
                throw new Error(
                    "Dwa importowane buildy nie mogą zastępować tego samego zapisu. Sprawdź wybór konfliktów."
                );
            replacements.add(targetId);
            return { record, choice, targetId };
        }
        if (!["copy", "add"].includes(choice) || (choice === "add" && conflicts.length))
            throw new Error("Sprawdź sposób rozwiązywania konfliktów biblioteki.");
        added++;
        return { record, choice };
    });
    const total = existing.length + added;
    return {
        actions,
        added,
        skipped,
        replaced: replacements.size,
        total,
        fits: total <= MAX_SAVED_BUILDS,
    };
}

export function mergeLibraryBackup(
    existing,
    incoming,
    decisions,
    createId = () => crypto.randomUUID()
) {
    const plan = planLibraryImport(existing, incoming, decisions);
    if (!plan.fits)
        throw new Error(
            "Po imporcie biblioteka przekroczyłaby limit 10 buildów. Pomiń wybrane wpisy lub zastąp istniejące."
        );
    const result = structuredClone(existing);
    const usedIds = new Set([...existing, ...incoming].map((entry) => entry.id));
    const usedNames = new Set([...existing, ...incoming].map((entry) => entry.name));
    for (const { record, choice, targetId } of plan.actions) {
        if (choice === "skip") continue;
        const next = structuredClone(record);
        if (targetId != null) {
            const index = result.findIndex((entry) => entry.id === targetId);
            next.id = targetId;
            result[index] = next;
        } else {
            if (choice === "copy" || result.some((entry) => entry.id === next.id)) {
                let id;
                do {
                    id = createId();
                } while (usedIds.has(id));
                usedIds.add(id);
                next.id = id;
                let suffix = 2,
                    name;
                do {
                    const ending = ` (${suffix++})`;
                    name = normalizeBuildName(record.name.slice(0, 48 - ending.length) + ending);
                } while (usedNames.has(name));
                usedNames.add(name);
                next.name = name;
            }
            result.push(next);
        }
    }
    return result;
}
