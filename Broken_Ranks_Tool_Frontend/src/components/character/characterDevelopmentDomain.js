import { INITIAL_SPENT_POINTS, STAT_CONFIG } from "../../constants/character";

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
export const normalizeCharacterConfig = (config) => ({
    level: clampLevel(config?.level),
    spentPoints: Object.fromEntries(
        Object.keys(STAT_CONFIG).map((name) => [
            name,
            Math.max(0, Number(config?.spentPoints?.[name]) || 0),
        ])
    ),
});
export const trimSpentPoints = (spentPoints, maximum) => {
    const updated = { ...spentPoints };
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
