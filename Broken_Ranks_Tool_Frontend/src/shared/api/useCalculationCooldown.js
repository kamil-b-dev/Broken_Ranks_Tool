import { useSyncExternalStore } from "react";
import { getCalculationCooldown, subscribeCalculationCooldown } from "./calculationCooldown";

export const useCalculationCooldown = () =>
    useSyncExternalStore(subscribeCalculationCooldown, getCalculationCooldown);
