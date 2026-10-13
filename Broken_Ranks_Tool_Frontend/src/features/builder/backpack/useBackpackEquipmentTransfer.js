import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import { backpackEquipWarning, prepareBackpackEquip } from "./backpackEquipmentTransfer";
import { prepareEquipmentRemoval, prepareEquipmentRemovalUndo } from "./backpackEquipmentRemoval";

/** Commits equipment and inventory together and refreshes any mounted slot draft. */
export const useBackpackEquipmentTransfer = ({
    backpack,
    requestData,
    data,
    gameRules,
    setBackpack,
    setRequestData,
    markEquipmentChanged,
    onEquip,
    lockedDrifs = {},
    onDrifLocksChange,
}) => {
    const current = useRef({ backpack, requestData, lockedDrifs });
    useLayoutEffect(() => {
        current.current = { backpack, requestData, lockedDrifs };
    }, [backpack, requestData, lockedDrifs]);
    const [backpackEquipNotice, setNotice] = useState(null);
    const undos = useRef({});
    const [removalUndos, setRemovalUndos] = useState({});
    const clearRemovalHistory = useCallback(() => {
        undos.current = {};
        setRemovalUndos({});
        setNotice(null);
    }, []);
    const commitRemoval = useCallback(
        (next) => {
            current.current = { ...current.current, ...next };
            setRequestData(next.requestData);
            setBackpack(next.backpack);
            onDrifLocksChange?.(next.lockedDrifs);
            markEquipmentChanged();
            setNotice(null);
        },
        [setRequestData, setBackpack, onDrifLocksChange, markEquipmentChanged]
    );
    const removeEquipment = useCallback(
        (kind, slotKey, zone) => {
            try {
                const next = prepareEquipmentRemoval({
                    ...current.current,
                    data,
                    kind,
                    slotKey,
                    zone,
                });
                commitRemoval(next);
                undos.current = { ...undos.current, [next.undo.key]: next.undo };
                setRemovalUndos(undos.current);
                return true;
            } catch (error) {
                setNotice(error.message);
                return false;
            }
        },
        [data, commitRemoval]
    );
    const undoRemoval = useCallback(
        (key) => {
            try {
                const next = prepareEquipmentRemovalUndo({
                    ...current.current,
                    data,
                    gameRules,
                    undo: undos.current[key],
                });
                commitRemoval(next);
                const nextUndos = { ...undos.current };
                delete nextUndos[key];
                undos.current = nextUndos;
                setRemovalUndos(nextUndos);
                return true;
            } catch (error) {
                setNotice(error.message);
                return false;
            }
        },
        [data, gameRules, commitRemoval]
    );
    const getRemovalWarning = useCallback(
        (kind, slotKey, zone) => {
            try {
                let index = 0;
                prepareEquipmentRemoval({
                    backpack,
                    requestData,
                    data,
                    kind,
                    slotKey,
                    zone,
                    createId: () => {
                        let id;
                        do {
                            id = `preview-${++index}`;
                        } while (backpack.some((entry) => entry.id === id));
                        return id;
                    },
                });
                return null;
            } catch (error) {
                return error.message;
            }
        },
        [backpack, requestData, data]
    );
    const getUndoWarning = useCallback(
        (key) => {
            try {
                prepareEquipmentRemovalUndo({
                    backpack,
                    requestData,
                    lockedDrifs,
                    data,
                    gameRules,
                    undo: removalUndos[key],
                });
                return null;
            } catch (error) {
                return error.message;
            }
        },
        [backpack, requestData, lockedDrifs, data, gameRules, removalUndos]
    );
    const equipmentRemoval = useMemo(
        () => ({ removeEquipment, undoRemoval, getRemovalWarning, getUndoWarning }),
        [removeEquipment, undoRemoval, getRemovalWarning, getUndoWarning]
    );
    const equipBackpackEntry = useCallback(
        (entryId, slotKey, zone = "item") => {
            try {
                const next = prepareBackpackEquip({
                    ...current.current,
                    data,
                    gameRules,
                    entryId,
                    slotKey,
                    zone,
                });
                const nextLocks = { ...current.current.lockedDrifs };
                if (zone === "item") delete nextLocks[slotKey];
                else if (zone.startsWith("drif-"))
                    nextLocks[slotKey] = (nextLocks[slotKey] || []).filter(
                        (index) => index !== Number(zone.slice(5))
                    );
                current.current = { ...current.current, ...next, lockedDrifs: nextLocks };
                setRequestData(next.requestData);
                setBackpack(next.backpack);
                onDrifLocksChange?.(nextLocks);
                onEquip?.(slotKey, zone);
                markEquipmentChanged();
                setNotice(null);
                return true;
            } catch (error) {
                setNotice(error.message);
                return false;
            }
        },
        [
            data,
            gameRules,
            setRequestData,
            setBackpack,
            markEquipmentChanged,
            onEquip,
            onDrifLocksChange,
        ]
    );
    const getBackpackEquipWarning = useCallback(
        (entryId, slotKey, zone = "item") =>
            backpackEquipWarning({
                backpack,
                requestData,
                data,
                gameRules,
                entryId,
                slotKey,
                zone,
            }),
        [backpack, requestData, data, gameRules]
    );
    return useMemo(
        () => ({
            equipBackpackEntry,
            getBackpackEquipWarning,
            backpackEquipNotice,
            equipmentRemoval,
            clearRemovalHistory,
        }),
        [
            equipBackpackEntry,
            getBackpackEquipWarning,
            backpackEquipNotice,
            equipmentRemoval,
            clearRemovalHistory,
        ]
    );
};
