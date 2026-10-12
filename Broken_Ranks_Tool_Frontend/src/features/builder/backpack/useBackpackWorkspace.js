import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { backpackStoneDropWarning, placeBackpackStone } from "./backpackStoneTransfer";
import {
    backpackTemplate,
    createBackpackEntry,
    MAX_BACKPACK_ENTRIES,
    moveBackpackEntry,
    normalizeBackpack,
} from "./backpackDomain";

/** Selection and list editing remain independent of equipped slots and calculator requests. */
export const useBackpackWorkspace = ({ entries, onChange, data, gameRules }) => {
    const currentEntries = useRef(entries);
    useLayoutEffect(() => {
        currentEntries.current = entries;
    }, [entries]);
    const [editRevision, setEditRevision] = useState(0);
    const [selectedId, setSelectedId] = useState(null);
    const [creatingKind, setCreatingKind] = useState(null);
    const [notice, setNotice] = useState(null);
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
                currentEntries.current = next;
                onChange(next);
                setEditRevision((revision) => revision + 1);
                setSelectedId(targetId);
                setCreatingKind(null);
                setNotice(null);
                return true;
            } catch (error) {
                setNotice(error.message);
                return false;
            }
        },
        [data, gameRules, onChange]
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
