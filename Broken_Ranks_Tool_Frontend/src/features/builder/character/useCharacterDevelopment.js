import { useLayoutEffect, useMemo, useRef, useState } from "react";
import {
    calculateCharacterStats,
    clampLevel,
    normalizeCharacterConfig,
    spentPointCount,
    totalPointsForLevel,
    trimSpentPoints,
} from "./characterDevelopmentDomain";

const importedConfig = (value) => {
    const normalized = normalizeCharacterConfig(value);
    return {
        ...normalized,
        spentPoints: trimSpentPoints(normalized.spentPoints, totalPointsForLevel(normalized.level)),
    };
};
const sameConfig = (left, right) =>
    left.level === right.level &&
    Object.keys(left.spentPoints).every((key) => left.spentPoints[key] === right.spentPoints[key]);

/** Keeps provisional numeric input local; only committed edits publish character data. */
export const useCharacterDevelopment = ({
    onStatsChange,
    externalConfig,
    externalStats,
    syncTrigger,
}) => {
    const [config, setConfig] = useState(() => importedConfig(externalConfig));
    const [levelInput, setLevelInput] = useState(() => String(config.level));
    const [edited, setEdited] = useState(false);
    const current = useRef(config);
    const previousSyncTrigger = useRef(syncTrigger);
    const level = /^\d+$/.test(levelInput) ? clampLevel(levelInput) : config.level;
    const totalPoints = totalPointsForLevel(level);
    const pointsLeft = Math.max(0, totalPoints - spentPointCount(config.spentPoints));
    const finalStats = useMemo(() => {
        const values = calculateCharacterStats(config.spentPoints);
        return !externalConfig && !edited ? { ...values, ...externalStats } : values;
    }, [config.spentPoints, edited, externalConfig, externalStats]);

    useLayoutEffect(() => {
        if (Object.is(previousSyncTrigger.current, syncTrigger)) return;
        previousSyncTrigger.current = syncTrigger;
        const next = importedConfig(externalConfig);
        current.current = next;
        setConfig(next);
        setLevelInput(String(next.level));
        setEdited(false);
        // An explicit import revision owns synchronization, not ordinary acknowledgements.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [syncTrigger]);

    const publish = (next, force = false) => {
        setLevelInput(String(next.level));
        if (!force && sameConfig(current.current, next)) return;
        current.current = next;
        setConfig(next);
        setEdited(true);
        onStatsChange(calculateCharacterStats(next.spentPoints), next);
    };
    const committedDraft = () => {
        const nextLevel = /^\d+$/.test(levelInput) ? clampLevel(levelInput) : current.current.level;
        return {
            level: nextLevel,
            spentPoints: trimSpentPoints(
                current.current.spentPoints,
                totalPointsForLevel(nextLevel)
            ),
        };
    };
    const changePoints = (name, amount) => {
        const next = committedDraft();
        const available = totalPointsForLevel(next.level) - spentPointCount(next.spentPoints);
        if ((amount > 0 && available < amount) || next.spentPoints[name] + amount < 0) {
            publish(next);
            return;
        }
        publish({
            ...next,
            spentPoints: { ...next.spentPoints, [name]: next.spentPoints[name] + amount },
        });
    };
    return {
        level,
        levelInput,
        spentPoints: config.spentPoints,
        finalStats,
        totalPoints,
        pointsLeft,
        editLevel: setLevelInput,
        commitLevel: () => publish(committedDraft()),
        cancelLevelEdit: () => setLevelInput(String(current.current.level)),
        changeLevel: (value) => {
            const nextLevel = clampLevel(value);
            publish({
                level: nextLevel,
                spentPoints: trimSpentPoints(
                    current.current.spentPoints,
                    totalPointsForLevel(nextLevel)
                ),
            });
        },
        changePoints,
        resetPoints: () => {
            const next = committedDraft();
            publish({ ...next, spentPoints: normalizeCharacterConfig(null).spentPoints }, true);
        },
    };
};
