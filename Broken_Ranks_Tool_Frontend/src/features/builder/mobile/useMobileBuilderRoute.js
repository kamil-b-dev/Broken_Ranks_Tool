import { useEffect, useState } from "react";
import { SLOTS } from "../../../shared/domain/equipment/equipmentSlots";

const readRoute = () => {
    const params = new URLSearchParams(window.location.search);
    const section = ["character", "stats"].includes(params.get("section"))
        ? params.get("section")
        : "equipment";
    const slot =
        section === "equipment" ? SLOTS.find((entry) => entry.key === params.get("slot")) : null;
    return { section, slot, pickingItem: Boolean(slot && params.get("pick") === "item") };
};

/** Nested mobile navigation uses browser history without changing desktop routing. */
export const useMobileBuilderRoute = () => {
    const [route, setRoute] = useState(readRoute);
    useEffect(() => {
        const update = () => setRoute(readRoute());
        window.addEventListener("popstate", update);
        return () => window.removeEventListener("popstate", update);
    }, []);
    const change = ({ section = route.section, slot = null, pick = null }, replace = false) => {
        const url = new URL(window.location.href);
        for (const [key, value] of Object.entries({ section, slot, pick })) {
            if (value) url.searchParams.set(key, value);
            else url.searchParams.delete(key);
        }
        window.history[replace ? "replaceState" : "pushState"](
            { ...window.history.state, mobileBuilder: !replace },
            "",
            url
        );
        setRoute(readRoute());
    };
    const back = () => {
        if (window.history.state?.mobileBuilder) window.history.back();
        else change({ slot: route.pickingItem ? route.slot?.key : null }, true);
    };
    return { ...route, change, back };
};
