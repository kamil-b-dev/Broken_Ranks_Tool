export const APP_ROUTES = {
    home: "/",
    builder: "/builder",
    optimizer: "/optimizer",
    builds: "/builds",
    progression: "/progression-path",
    help: "/help",
};

export const LEGACY_ROUTES = {
    "/kreator": APP_ROUTES.builder,
    "/optymalizator": APP_ROUTES.optimizer,
    "/buildy": APP_ROUTES.builds,
    "/sciezka-rozwoju": APP_ROUTES.progression,
};

export const canonicalAppPath = (pathname) => {
    const path = pathname.replace(/\/index\.html$|\/$/, "") || "/";
    return LEGACY_ROUTES[path] ?? (Object.values(APP_ROUTES).includes(path) ? path : "/");
};
