import { useEffect, useState } from "react";
import {
    calculateCharacterStats,
    clampLevel,
    emptySpentPoints,
    normalizeCharacterConfig,
    spentPointCount,
    totalPointsForLevel,
    trimSpentPoints,
} from "../components/character/characterDevelopmentDomain";

/** Owns character point allocation and synchronization with imported builds. */
export const useCharacterDevelopment = ({ onStatsChange, externalConfig, syncTrigger }) => {
    const [level, setLevel] = useState(1);
    const [spentPoints, setSpentPoints] = useState(emptySpentPoints);
    const totalPoints = totalPointsForLevel(level);
    const pointsLeft = totalPoints - spentPointCount(spentPoints);

    useEffect(
        () => onStatsChange(calculateCharacterStats(spentPoints), { level, spentPoints }),
        [spentPoints, level, onStatsChange]
    );
    useEffect(() => {
        if (!externalConfig) return;
        const imported = normalizeCharacterConfig(externalConfig);
        setLevel(imported.level);
        setSpentPoints(imported.spentPoints);
        // Import synchronization is intentionally driven only by syncTrigger.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [syncTrigger]);

    const changePoints = (name, amount) => {
        if ((amount > 0 && pointsLeft < amount) || (amount < 0 && spentPoints[name] + amount < 0))
            return;
        setSpentPoints((current) => ({ ...current, [name]: current[name] + amount }));
    };
    const changeLevel = (value) => {
        const nextLevel = clampLevel(value);
        setLevel(nextLevel);
        setSpentPoints((current) => trimSpentPoints(current, totalPointsForLevel(nextLevel)));
    };

    return {
        level,
        spentPoints,
        finalStats: calculateCharacterStats(spentPoints),
        totalPoints,
        pointsLeft,
        changePoints,
        changeLevel,
        resetPoints: () => setSpentPoints(emptySpentPoints()),
    };
};
