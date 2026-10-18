import { requestEquipmentCatalog } from "../features/equipment/useEquipmentCatalog";
import { useCallback, useEffect, useState } from "react";

export const APP_ROUTES = {
    home: "/",
    builder: "/builder",
    optimizer: "/optimizer",
    builds: "/builds",
    progression: "/progression-path",
};

const LEGACY_ROUTES = {
    "/kreator": APP_ROUTES.builder,
    "/optymalizator": APP_ROUTES.optimizer,
    "/buildy": APP_ROUTES.builds,
    "/sciezka-rozwoju": APP_ROUTES.progression,
};

const canonicalPath = (pathname) =>
    Object.hasOwn(LEGACY_ROUTES, pathname)
        ? LEGACY_ROUTES[pathname]
        : Object.values(APP_ROUTES).includes(pathname)
          ? pathname
          : APP_ROUTES.home;

const routeForPath = (pathname) =>
    Object.entries(APP_ROUTES).find(([, path]) => path === canonicalPath(pathname))?.[0] ?? "home";

const canonicalizeLocation = () => {
    const path = canonicalPath(window.location.pathname);
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
            setActiveView(routeForPath(nextPath));
        };
        window.addEventListener("popstate", handlePopState);
        return () => window.removeEventListener("popstate", handlePopState);
    }, []);

    const navigate = useCallback((view) => {
        const path = APP_ROUTES[view] ?? APP_ROUTES.home;
        if (path !== window.location.pathname) window.history.pushState(null, "", path);
        if (view !== "home") requestEquipmentCatalog();
        setActiveView(routeForPath(path));
    }, []);

    return { activeView, navigate };
};
