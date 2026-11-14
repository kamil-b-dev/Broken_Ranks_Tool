import { useCallback, useLayoutEffect, useMemo, useRef } from "react";
import { useProfession } from "../../shared/state/ProfessionContext";
import { defaultSimpleOptions } from "./simple-profile/simpleProfileDefinitions";

/** Applies the shared profession to UI, saved optimizer settings and outgoing requests together. */
export const useProfessionOptimizerSettings = (stored, onChange) => {
    const shared = useProfession();
    const profession = shared?.resolvedProfession;
    const settings = useMemo(() => {
        if (!profession) return stored;
        return {
            ...stored,
            simpleProfile: profession,
            simpleOptions:
                stored.simpleProfile === profession
                    ? stored.simpleOptions
                    : defaultSimpleOptions(profession),
            advisorProfession: ["FIRE_MAGE", "DRUID", "VOODOO"].includes(profession)
                ? "MAGICAL"
                : "PHYSICAL",
        };
    }, [stored, profession]);
    const current = useRef(settings);
    useLayoutEffect(() => {
        current.current = settings;
    }, [settings]);
    const setProfession = shared?.setProfession;
    const change = useCallback(
        (update) => {
            const previous = current.current;
            const next = typeof update === "function" ? update(previous) : update;
            if (next.simpleProfile !== previous.simpleProfile) setProfession?.(next.simpleProfile);
            current.current = next;
            onChange(next);
        },
        [onChange, setProfession]
    );
    return shared ? [settings, change] : [stored, onChange];
};
