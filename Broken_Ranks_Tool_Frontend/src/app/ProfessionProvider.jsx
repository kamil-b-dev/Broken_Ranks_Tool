import { useCallback, useEffect, useMemo, useState } from "react";
import { ProfessionContext } from "../shared/state/ProfessionContext";
import { PROFESSIONS } from "../shared/domain/characterClasses";

const STORAGE_KEY = "broken-ranks-tool.profession.v1";
const normalize = (value) => (Object.hasOwn(PROFESSIONS, value) ? value : "AUTO");
const readProfession = () => {
    try {
        return normalize(localStorage.getItem(STORAGE_KEY));
    } catch {
        return "AUTO";
    }
};

/** Owns the profession selection shared by builder, backpack, optimizer and progression. */
export default function ProfessionProvider({ children, slots = {}, items = [] }) {
    const [profession, setSelection] = useState(readProfession);
    const setProfession = useCallback((value) => setSelection(normalize(value)), []);
    const weapon = items.find((item) => String(item.id) === String(slots.weapon?.itemId));
    const inferred =
        weapon?.allowedClasses?.length === 1 ? normalize(weapon.allowedClasses[0]) : "AUTO";
    const resolvedProfession = profession === "AUTO" ? inferred : profession;
    const value = useMemo(
        () => ({
            profession,
            resolvedProfession: resolvedProfession === "AUTO" ? null : resolvedProfession,
            setProfession,
        }),
        [profession, resolvedProfession, setProfession]
    );
    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, profession);
        } catch {
            // Like language preferences, selection remains usable without browser storage.
        }
    }, [profession]);
    return <ProfessionContext.Provider value={value}>{children}</ProfessionContext.Provider>;
}
