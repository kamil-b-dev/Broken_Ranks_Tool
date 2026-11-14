import { requestEquipmentCatalog } from "../features/equipment/useEquipmentCatalog";
import { useCallback, useEffect, useState } from "react";
import { APP_ROUTES, canonicalAppPath } from "./routes";
export { APP_ROUTES } from "./routes";

const routeForPath = (pathname) =>
    Object.entries(APP_ROUTES).find(
        ([view, path]) => view !== "help" && path === canonicalAppPath(pathname)
    )?.[0] ?? "home";

const canonicalizeLocation = () => {
    const path = canonicalAppPath(window.location.pathname);
    if (path !== window.location.pathname)
        window.history.replaceState(
            window.history.state,
            "",
            `${path}${window.location.search}${window.location.hash}`
        );
    return path;
};

/** Keeps application navigation in sync with the browser History API. */
export const useAppRoute = () => {
    const [activeView, setActiveView] = useState(() => routeForPath(window.location.pathname));

    useEffect(() => {
        canonicalizeLocation();

        const handlePopState = () => {
            const nextPath = canonicalizeLocation();
            if (nextPath === APP_ROUTES.help) return;
            setActiveView(routeForPath(nextPath));
        };
        window.addEventListener("popstate", handlePopState);
        return () => window.removeEventListener("popstate", handlePopState);
    }, []);

    const navigate = useCallback((view) => {
        const path = APP_ROUTES[view] ?? APP_ROUTES.home;
        if (path !== window.location.pathname) window.history.pushState(null, "", path);
        window.dispatchEvent(new PopStateEvent("popstate"));
        if (path === APP_ROUTES.help) return;
        if (view !== "home") requestEquipmentCatalog();
        setActiveView(routeForPath(path));
    }, []);

    return { activeView, navigate };
};
