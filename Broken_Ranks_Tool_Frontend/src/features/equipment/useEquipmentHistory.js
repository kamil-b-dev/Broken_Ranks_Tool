import { useCallback, useLayoutEffect, useRef, useState } from "react";

export const EQUIPMENT_HISTORY_LIMIT = 50;

/** Records committed build transactions, never calculated results or provisional input. */
export function useEquipmentHistory({ value, enabled, catalog, gameRules, onRestore }) {
    const history = useRef({ past: [], present: null, future: [], catalog, gameRules });
    const restore = useRef(onRestore);
    const [counts, setCounts] = useState({ undo: 0, redo: 0 });

    useLayoutEffect(() => {
        restore.current = onRestore;
        const current = history.current;
        if (!enabled) return;
        const signature = JSON.stringify(value);
        const present = { signature, value: structuredClone(value) };
        if (!current.present || current.catalog !== catalog || current.gameRules !== gameRules) {
            history.current = { past: [], present, future: [], catalog, gameRules };
            // Publish after React commits all fields of an atomic build transaction.
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setCounts({ undo: 0, redo: 0 });
        } else if (current.present.signature !== signature) {
            current.past = [...current.past, current.present].slice(-EQUIPMENT_HISTORY_LIMIT);
            current.present = present;
            current.future = [];
            setCounts({ undo: current.past.length, redo: 0 });
        }
    }, [value, enabled, catalog, gameRules, onRestore]);

    const move = useCallback((direction) => {
        const current = history.current;
        const source = direction === "undo" ? current.past : current.future;
        if (!source.length) return false;
        const next = source.at(-1);
        if (direction === "undo") {
            current.past = current.past.slice(0, -1);
            current.future = [...current.future, current.present];
        } else {
            current.future = current.future.slice(0, -1);
            current.past = [...current.past, current.present];
        }
        current.present = next;
        restore.current(structuredClone(next.value));
        setCounts({ undo: current.past.length, redo: current.future.length });
        return true;
    }, []);
    const undo = useCallback(() => move("undo"), [move]);
    const redo = useCallback(() => move("redo"), [move]);
    return { canUndo: enabled && counts.undo > 0, canRedo: enabled && counts.redo > 0, undo, redo };
}
