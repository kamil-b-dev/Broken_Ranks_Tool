import { useEffect, useState } from "react";

const readNavigation = () => {
    const params = new URLSearchParams(window.location.search);
    return { section: params.get("section") || "goals", picking: params.get("pick") === "bonus" };
};

/** Keep the mobile section and bonus picker in browser history, outside run state. */
export const useMobileOptimizerNavigation = (advisory) => {
    const [navigation, setNavigation] = useState(readNavigation);
    useEffect(() => {
        const update = () => setNavigation(readNavigation());
        window.addEventListener("popstate", update);
        return () => window.removeEventListener("popstate", update);
    }, []);
    const change = (section, picking = false, replace = false) => {
        const url = new URL(window.location.href);
        url.searchParams.set("section", section);
        if (picking) url.searchParams.set("pick", "bonus");
        else url.searchParams.delete("pick");
        window.history[replace ? "replaceState" : "pushState"](
            { mobileOptimizerPicker: picking && !replace },
            "",
            url
        );
        setNavigation(readNavigation());
    };
    const section = ["goals", "locks", "result", ...(advisory ? ["changes"] : [])].includes(
        navigation.section
    )
        ? navigation.section
        : "goals";
    return {
        section,
        picking: navigation.picking,
        change,
        closePicker: () => {
            if (window.history.state?.mobileOptimizerPicker) window.history.back();
            else change(section, false, true);
        },
    };
};
