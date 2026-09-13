import { useCallback, useState } from "react";

/** Owns whole-slot and individual-drif locks used by the optimizer. */
export const useEquipmentLocks = () => {
    const [lockedSlots, setLockedSlots] = useState([]);
    const [lockedDrifs, setLockedDrifs] = useState({});

    const toggleSlotLock = useCallback((slotKey) => {
        setLockedSlots((previous) =>
            previous.includes(slotKey)
                ? previous.filter((key) => key !== slotKey)
                : [...previous, slotKey]
        );
    }, []);

    const toggleDrifLock = useCallback((slotKey, drifIndex) => {
        setLockedDrifs((previous) => {
            const current = previous[slotKey] || [];
            const updated = current.includes(drifIndex)
                ? current.filter((index) => index !== drifIndex)
                : [...current, drifIndex];
            return { ...previous, [slotKey]: updated };
        });
    }, []);

    const replaceLocks = useCallback((slots, drifs) => {
        setLockedSlots(slots);
        setLockedDrifs(drifs);
    }, []);

    return { lockedSlots, lockedDrifs, toggleSlotLock, toggleDrifLock, replaceLocks };
};
