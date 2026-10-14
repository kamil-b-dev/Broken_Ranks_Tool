import { useCallback, useLayoutEffect, useRef, useState } from "react";
import {
    backpackStoneDropWarning,
    placeBackpackStone,
    removeBackpackStone,
    undoBackpackStoneRemoval,
    backpackStoneRemovalWarning,
    backpackStoneRemovalUndoWarning,
} from "./backpackStoneTransfer";
import {
    backpackTemplate,
    createBackpackEntry,
    MAX_BACKPACK_ENTRIES,
    moveBackpackEntry,
    normalizeBackpack,
} from "./backpackDomain";

/** Selection and list editing remain independent of equipped slots and calculator requests. */
export const useBackpackWorkspace = ({
    entries,
    onChange,
    data,
    gameRules,
    importRevision = 0,
}) => {
    const currentEntries = useRef(entries);
    useLayoutEffect(() => {
        currentEntries.current = entries;
    }, [entries]);
    const [editRevision, setEditRevision] = useState(0);
    const [selectedId, setSelectedId] = useState(null);
    const [creatingKind, setCreatingKind] = useState(null);
    const [notice, setNotice] = useState(null);
    const undos = useRef({});
    const [removalUndos, setRemovalUndos] = useState({});
    const [removalRevision, setRemovalRevision] = useState(importRevision);
    if (removalRevision !== importRevision) {
        setRemovalRevision(importRevision);
        setRemovalUndos({});
        setNotice(null);
    }
    useLayoutEffect(() => {
        undos.current = {};
    }, [importRevision]);
    const commitStoneOperation = useCallback(
        (next, targetId) => {
            onChange(next);
            currentEntries.current = next;
            setEditRevision((revision) => revision + 1);
            setSelectedId(targetId);
            setCreatingKind(null);
            setNotice(null);
        },
        [onChange]
    );
    const removeStone = useCallback(
        (kind, targetId, zone) => {
            try {
                const next = removeBackpackStone({
                    entries: currentEntries.current,
                    data,
                    kind,
                    targetId,
                    zone,
                });
                commitStoneOperation(next.entries, targetId);
                undos.current = { ...undos.current, [next.undo.key]: next.undo };
                setRemovalUndos(undos.current);
                return true;
            } catch (error) {
                setNotice(error.message);
                return false;
            }
        },
        [data, commitStoneOperation]
    );
    const undoStoneRemoval = useCallback(
        (key) => {
            try {
                const undo = undos.current[key];
                const next = undoBackpackStoneRemoval({
                    entries: currentEntries.current,
                    data,
                    gameRules,
                    undo,
                });
                commitStoneOperation(next, undo.targetId);
                const remaining = { ...undos.current };
                delete remaining[key];
                undos.current = remaining;
                setRemovalUndos(remaining);
                return true;
            } catch (error) {
                setNotice(error.message);
                return false;
            }
        },
        [data, gameRules, commitStoneOperation]
    );
    const getStoneRemovalWarning = useCallback(
        (kind, targetId, zone) =>
            backpackStoneRemovalWarning({ entries, data, kind, targetId, zone }),
        [entries, data]
    );
    const getStoneRemovalUndoWarning = useCallback(
        (key) =>
            backpackStoneRemovalUndoWarning({ entries, data, gameRules, undo: removalUndos[key] }),
        [entries, data, gameRules, removalUndos]
    );
    const activeEntry = creatingKind
        ? null
        : entries.find((entry) => entry.id === selectedId) || entries[0] || null;
    const select = (id) => {
        setSelectedId(id);
        setCreatingKind(null);
        setNotice(null);
    };
    const begin = (kind) => {
        setCreatingKind(kind);
        setNotice(null);
    };
    const add = (kind, template) => {
        const current = currentEntries.current;
        if (current.length >= MAX_BACKPACK_ENTRIES) {
            setNotice(`Plecak mieści do ${MAX_BACKPACK_ENTRIES} obiektów.`);
            return;
        }
        try {
            const entry = createBackpackEntry(kind, template, data, gameRules);
            const next = normalizeBackpack([...current, entry]);
            onChange(next);
            currentEntries.current = next;
            select(entry.id);
            return true;
        } catch (error) {
            setNotice(error.message);
            return false;
        }
    };
    const update = useCallback(
        (id, changes) => {
            try {
                const current = currentEntries.current;
                const entry = current.find((candidate) => candidate.id === id);
                if (!entry) throw new Error("Ta rzecz nie znajduje się już w plecaku.");
                if (
                    !changes ||
                    typeof changes !== "object" ||
                    Array.isArray(changes) ||
                    (Object.hasOwn(changes, "id") && changes.id !== id) ||
                    (Object.hasOwn(changes, "kind") && changes.kind !== entry.kind)
                )
                    throw new Error("Nie można zmieniać tożsamości ani rodzaju rzeczy w plecaku.");
                const next = normalizeBackpack(
                    current.map((candidate) =>
                        candidate.id === id ? { ...candidate, ...changes } : candidate
                    )
                );
                if (JSON.stringify(next) !== JSON.stringify(current)) {
                    onChange(next);
                    currentEntries.current = next;
                }
                setNotice(null);
                return true;
            } catch (error) {
                setNotice(error.message);
                return false;
            }
        },
        [onChange]
    );
    const remove = (id) => {
        const next = currentEntries.current.filter((entry) => entry.id !== id);
        onChange(next);
        currentEntries.current = next;
        setNotice(null);
    };
    const duplicate = (entry) => {
        const current = currentEntries.current;
        if (current.length >= MAX_BACKPACK_ENTRIES) {
            setNotice(`Plecak mieści do ${MAX_BACKPACK_ENTRIES} obiektów.`);
            return;
        }
        try {
            const source = current.find((candidate) => candidate.id === entry?.id);
            if (!source) throw new Error("Ta rzecz nie znajduje się już w plecaku.");
            const copy = { ...source, id: crypto.randomUUID() };
            const next = normalizeBackpack([...current, copy]);
            onChange(next);
            currentEntries.current = next;
            select(copy.id);
            return true;
        } catch (error) {
            setNotice(error.message);
            return false;
        }
    };
    const move = (id, targetId) => {
        const next = moveBackpackEntry(currentEntries.current, id, targetId);
        onChange(next);
        currentEntries.current = next;
    };
    const placeStone = useCallback(
        (resource, targetId, zone) => {
            try {
                const next = placeBackpackStone({
                    entries: currentEntries.current,
                    data,
                    gameRules,
                    resource,
                    targetId,
                    zone,
                });
                commitStoneOperation(next, targetId);
                return true;
            } catch (error) {
                setNotice(error.message);
                return false;
            }
        },
        [data, gameRules, commitStoneOperation]
    );
    const getStoneDropWarning = useCallback(
        (resource, targetId, zone) =>
            backpackStoneDropWarning({ entries, data, gameRules, resource, targetId, zone }),
        [entries, data, gameRules]
    );
    const name = (entry) => backpackTemplate(entry, data)?.name || "Nieznany obiekt";
    return {
        activeEntry,
        creatingKind,
        notice,
        editRevision,
        placeStone,
        getStoneDropWarning,
        removeStone,
        undoStoneRemoval,
        getStoneRemovalWarning,
        getStoneRemovalUndoWarning,
        begin,
        select,
        add,
        update,
        remove,
        duplicate,
        move,
        name,
    };
};
