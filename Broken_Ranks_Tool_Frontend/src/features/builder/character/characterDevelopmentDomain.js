import { INITIAL_SPENT_POINTS, STAT_CONFIG } from "./characterConstants";

export const clampLevel = (value) => Math.min(140, Math.max(1, Number.parseInt(value) || 1));
export const totalPointsForLevel = (level) => (level - 1) * 4;
export const spentPointCount = (spentPoints) =>
    Object.values(spentPoints).reduce((sum, value) => sum + value, 0);
export const calculateCharacterStats = (spentPoints) =>
    Object.fromEntries(
        Object.entries(STAT_CONFIG).map(([name, config]) => [
            name,
            config.base + spentPoints[name] * config.ratio,
        ])
    );
const normalizePoints = (value) => {
    const numeric = Number(value);
    return Number.isFinite(numeric)
        ? Math.min(totalPointsForLevel(140), Math.max(0, Math.trunc(numeric)))
        : 0;
};
export const normalizeCharacterConfig = (config) => ({
    level: clampLevel(config?.level),
    spentPoints: Object.fromEntries(
        Object.keys(STAT_CONFIG).map((name) => [name, normalizePoints(config?.spentPoints?.[name])])
    ),
});
export const trimSpentPoints = (spentPoints, maximum) => {
    const updated = Object.fromEntries(
        Object.entries(spentPoints).map(([name, value]) => [name, normalizePoints(value)])
    );
    maximum = normalizePoints(maximum);
    let excess = spentPointCount(updated) - maximum;
    const names = Object.keys(updated);
    while (excess > 0)
        for (const name of names)
            if (updated[name] > 0 && excess > 0) {
                updated[name] -= 1;
                excess -= 1;
            }
    return updated;
};
export const emptySpentPoints = () => ({ ...INITIAL_SPENT_POINTS });
