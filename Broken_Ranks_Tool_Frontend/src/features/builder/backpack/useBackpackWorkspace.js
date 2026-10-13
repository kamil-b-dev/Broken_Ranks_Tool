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
            currentEntries.current = next;
            onChange(next);
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
        if (entries.length >= MAX_BACKPACK_ENTRIES) {
            setNotice(`Plecak mieści do ${MAX_BACKPACK_ENTRIES} obiektów.`);
            return;
        }
        const entry = createBackpackEntry(kind, template, data, gameRules);
        onChange([...entries, entry]);
        select(entry.id);
    };
    const update = useCallback(
        (id, changes) => {
            const next = normalizeBackpack(
                entries.map((entry) => (entry.id === id ? { ...entry, ...changes } : entry))
            );
            if (JSON.stringify(next) !== JSON.stringify(entries)) onChange(next);
        },
        [entries, onChange]
    );
    const remove = (id) => {
        onChange(entries.filter((entry) => entry.id !== id));
        setNotice(null);
    };
    const duplicate = (entry) => {
        if (entries.length >= MAX_BACKPACK_ENTRIES) {
            setNotice(`Plecak mieści do ${MAX_BACKPACK_ENTRIES} obiektów.`);
            return;
        }
        const copy = normalizeBackpack([{ ...entry, id: crypto.randomUUID() }])[0];
        onChange([...entries, copy]);
        select(copy.id);
    };
    const move = (id, targetId) => onChange(moveBackpackEntry(entries, id, targetId));
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
