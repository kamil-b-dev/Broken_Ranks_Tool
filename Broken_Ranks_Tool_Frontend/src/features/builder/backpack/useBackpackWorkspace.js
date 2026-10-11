import { useCallback, useState } from "react";
import {
    backpackTemplate,
    createBackpackEntry,
    MAX_BACKPACK_ENTRIES,
    moveBackpackEntry,
    normalizeBackpack,
} from "./backpackDomain";

/** Selection and list editing remain independent of equipped slots and calculator requests. */
export const useBackpackWorkspace = ({ entries, onChange, data, gameRules }) => {
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
    const name = (entry) => backpackTemplate(entry, data)?.name || "Nieznany obiekt";
    return {
        activeEntry,
        creatingKind,
        notice,
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
