import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import { backpackEquipWarning, prepareBackpackEquip } from "./backpackEquipmentTransfer";

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
}) => {
    const current = useRef({ backpack, requestData });
    useLayoutEffect(() => {
        current.current = { backpack, requestData };
    }, [backpack, requestData]);
    const [backpackEquipNotice, setNotice] = useState(null);
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
                current.current = next;
                setRequestData(next.requestData);
                setBackpack(next.backpack);
                onEquip?.(slotKey, zone);
                markEquipmentChanged();
                setNotice(null);
                return true;
            } catch (error) {
                setNotice(error.message);
                return false;
            }
        },
        [data, gameRules, setRequestData, setBackpack, markEquipmentChanged, onEquip]
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
        () => ({ equipBackpackEntry, getBackpackEquipWarning, backpackEquipNotice }),
        [equipBackpackEntry, getBackpackEquipWarning, backpackEquipNotice]
    );
};
