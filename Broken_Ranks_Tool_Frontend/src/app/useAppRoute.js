import { useCallback, useEffect, useState } from "react";

export const APP_ROUTES = {
    home: "/",
    builder: "/kreator",
    optimizer: "/optymalizator",
    builds: "/buildy",
};

const routeForPath = (pathname) =>
    Object.entries(APP_ROUTES).find(([, path]) => path === pathname)?.[0] ?? "home";

const canonicalPath = (pathname) =>
    Object.values(APP_ROUTES).includes(pathname) ? pathname : APP_ROUTES.home;

/** Keeps application navigation in sync with the browser History API. */
export const useAppRoute = () => {
    const [activeView, setActiveView] = useState(() => routeForPath(window.location.pathname));

    useEffect(() => {
        const path = canonicalPath(window.location.pathname);
        if (path !== window.location.pathname) window.history.replaceState(null, "", path);

        const handlePopState = () => {
            const nextPath = canonicalPath(window.location.pathname);
            if (nextPath !== window.location.pathname) {
                window.history.replaceState(null, "", nextPath);
            }
            setActiveView(routeForPath(nextPath));
        };
        window.addEventListener("popstate", handlePopState);
        return () => window.removeEventListener("popstate", handlePopState);
    }, []);

    const navigate = useCallback((view) => {
        const path = APP_ROUTES[view] ?? APP_ROUTES.home;
        if (path !== window.location.pathname) window.history.pushState(null, "", path);
        setActiveView(routeForPath(path));
    }, []);

    return { activeView, navigate };
};
