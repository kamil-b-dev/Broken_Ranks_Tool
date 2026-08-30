import { useCallback, useState } from "react";
import { optimizeEquipmentDrifs } from "../api/equipmentApi";
import { createEquipmentOptimizationRequest } from "../components/optimization/equipmentOptimizationRequest";

const failureMessage = (error) =>
    error.response?.data?.summary?.message ||
    error.response?.data?.message ||
    error.response?.data?.error ||
    (error.code === "ECONNABORTED" ? "Przekroczono limit czasu optymalizacji." : error.message);

/** Owns equipment optimization requests, setup application, and workspace refresh signaling. */
export const useEquipmentOptimization = ({ slots, setRequestData, lockedSlots, lockedDrifs }) => {
    const [optimizationTrigger, setOptimizationTrigger] = useState(0);

    const markEquipmentChanged = useCallback(() => {
        setOptimizationTrigger((previous) => previous + 1);
    }, []);

    const applyOptimizationSetup = useCallback(
        (setup) => {
            if (!setup?.slots) return false;
            setRequestData((previous) => ({ ...previous, slots: setup.slots }));
            markEquipmentChanged();
            return true;
        },
        [markEquipmentChanged, setRequestData]
    );

    const runDrifOptimization = useCallback(
        async (configuration) => {
            if (!slots || Object.values(slots).every((slot) => !slot.itemId)) {
                return {
                    success: false,
                    message: "Wybierz przynajmniej jeden przedmiot, aby uruchomić optymalizację.",
                    applied: false,
                };
            }

            const request = createEquipmentOptimizationRequest({
                slots,
                configuration,
                lockedSlots,
                lockedDrifs,
            });
            try {
                const { optimizedSetup, summary } = await optimizeEquipmentDrifs(request);
                return { ...summary, applied: applyOptimizationSetup(optimizedSetup) };
            } catch (error) {
                console.error("Błąd optymalizacji drifów:", error);
                return { success: false, message: failureMessage(error), applied: false };
            }
        },
        [slots, lockedSlots, lockedDrifs, applyOptimizationSetup]
    );

    return {
        optimizationTrigger,
        markEquipmentChanged,
        applyOptimizationSetup,
        runDrifOptimization,
    };
};
