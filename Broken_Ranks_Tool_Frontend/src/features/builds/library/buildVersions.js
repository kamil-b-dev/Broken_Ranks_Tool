const clone = (value) => JSON.parse(JSON.stringify(value));
export const MAX_BUILD_REVISIONS = 10;

export const archiveBuildVersion = (record, next) => {
    const { payload, stats, statSources, updatedAt, savedAt } = record;
    return {
        ...record,
        ...next,
        revisions: [
            ...(record.revisions || []),
            clone({
                payload,
                stats: stats || null,
                statSources: statSources || {},
                updatedAt: updatedAt || savedAt,
            }),
        ].slice(-MAX_BUILD_REVISIONS),
    };
};

export const validBuildExtras = (record) =>
    (record.notes == null || (typeof record.notes === "string" && record.notes.length <= 2000)) &&
    (record.tags == null ||
        (Array.isArray(record.tags) &&
            record.tags.length <= 10 &&
            record.tags.every((tag) => typeof tag === "string" && tag.length <= 32))) &&
    (record.revisions == null ||
        (Array.isArray(record.revisions) &&
            record.revisions.length <= MAX_BUILD_REVISIONS &&
            record.revisions.every(
                (revision) =>
                    revision &&
                    typeof revision === "object" &&
                    !revision.revisions &&
                    revision.payload?.build &&
                    typeof revision.updatedAt === "string" &&
                    (revision.stats == null ||
                        (typeof revision.stats === "object" && !Array.isArray(revision.stats))) &&
                    revision.statSources &&
                    typeof revision.statSources === "object" &&
                    !Array.isArray(revision.statSources)
            )));

export const restoreBuildVersion = (record, index) => {
    const revision = record.revisions?.[index];
    if (!Number.isInteger(index) || !revision?.payload?.build)
        throw new Error("Nie znaleziono wersji buildu.");
    return archiveBuildVersion(record, { ...clone(revision), updatedAt: new Date().toISOString() });
};

export const updateBuildMetadata = (record, { notes = "", tags = [] }) => {
    if (
        typeof notes !== "string" ||
        notes.length > 2000 ||
        !Array.isArray(tags) ||
        tags.length > 10 ||
        tags.some((tag) => typeof tag !== "string" || tag.trim().length > 32)
    )
        throw new Error("Notatka może mieć 2000 znaków, a build do 10 oznaczeń po 32 znaki.");
    return {
        ...record,
        notes,
        tags: [...new Set(tags.map((tag) => tag.trim()).filter(Boolean))],
        updatedAt: new Date().toISOString(),
    };
};
