import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
    calculateCharacterStats,
    clampLevel,
    emptySpentPoints,
    normalizeCharacterConfig,
    spentPointCount,
    totalPointsForLevel,
    trimSpentPoints,
} from "./characterDevelopmentDomain";

/** Owns character point allocation and synchronization with imported builds. */
export const useCharacterDevelopment = ({
    onStatsChange,
    externalConfig,
    externalStats,
    syncTrigger,
}) => {
    const [level, setLevel] = useState(() => normalizeCharacterConfig(externalConfig).level);
    const [spentPoints, setSpentPoints] = useState(() => {
        const imported = normalizeCharacterConfig(externalConfig);
        return trimSpentPoints(imported.spentPoints, totalPointsForLevel(imported.level));
    });
    const [publishChanges, setPublishChanges] = useState(false);
    const previousSyncTrigger = useRef(syncTrigger);
    const totalPoints = totalPointsForLevel(level);
    const pointsLeft = totalPoints - spentPointCount(spentPoints);

    useEffect(() => {
        if (publishChanges) {
            onStatsChange(calculateCharacterStats(spentPoints), { level, spentPoints });
        }
    }, [spentPoints, level, onStatsChange, publishChanges]);
    useLayoutEffect(() => {
        if (Object.is(previousSyncTrigger.current, syncTrigger)) return;
        previousSyncTrigger.current = syncTrigger;
        setPublishChanges(false);
        if (!externalConfig) {
            setLevel(1);
            setSpentPoints(emptySpentPoints());
            return;
        }
        const imported = normalizeCharacterConfig(externalConfig);
        setLevel(imported.level);
        setSpentPoints(trimSpentPoints(imported.spentPoints, totalPointsForLevel(imported.level)));
        // Import synchronization is intentionally driven only by syncTrigger.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [syncTrigger]);

    const changePoints = (name, amount) => {
        if ((amount > 0 && pointsLeft < amount) || (amount < 0 && spentPoints[name] + amount < 0))
            return;
        setPublishChanges(true);
        setSpentPoints((current) => ({ ...current, [name]: current[name] + amount }));
    };
    const changeLevel = (value) => {
        setPublishChanges(true);
        const nextLevel = clampLevel(value);
        setLevel(nextLevel);
        setSpentPoints((current) => trimSpentPoints(current, totalPointsForLevel(nextLevel)));
    };

    return {
        level,
        spentPoints,
        finalStats:
            !externalConfig && !publishChanges
                ? { ...calculateCharacterStats(spentPoints), ...externalStats }
                : calculateCharacterStats(spentPoints),
        totalPoints,
        pointsLeft,
        changePoints,
        changeLevel,
        resetPoints: () => {
            setPublishChanges(true);
            setSpentPoints(emptySpentPoints());
        },
    };
};
