import { APP_ROUTES, canonicalAppPath } from "../routes.js";

export const DEFAULT_SITE_URL = "https://www.brokenrankstool.pl";

export const SITE_PAGES = [
    {
        path: APP_ROUTES.home,
        label: "Strona główna",
        heading: "Broken Ranks Tool",
        title: "Broken Ranks Tool – kalkulator ekwipunku i optymalizator drifów",
        description:
            "Twórz buildy do Broken Ranks, obliczaj statystyki ekwipunku, dobieraj drify i planuj kolejne etapy rozwoju postaci.",
    },
    {
        path: APP_ROUTES.builder,
        label: "Kreator ekwipunku",
        heading: "Kalkulator ekwipunku Broken Ranks",
        title: "Kalkulator ekwipunku i kreator buildu – Broken Ranks Tool",
        description:
            "Dobierz przedmioty, gwiazdki, drify i orby. Sprawdź statystyki swojego buildu w kalkulatorze ekwipunku Broken Ranks.",
    },
    {
        path: APP_ROUTES.optimizer,
        label: "Optymalizator drifów",
        heading: "Optymalizator drifów Broken Ranks",
        title: "Optymalizator drifów i Doradca – Broken Ranks Tool",
        description:
            "Dobierz rozmieszczenie i poziomy drifów na swoim ekwipunku. W trybie Doradcy sprawdź propozycje zmian z ochroną wybranych bonusów.",
    },
    {
        path: APP_ROUTES.progression,
        label: "Ścieżka rozwoju",
        heading: "Ścieżka rozwoju ekwipunku Broken Ranks",
        title: "Ścieżka rozwoju ekwipunku – Broken Ranks Tool",
        description:
            "Zaplanuj etapy dojścia do docelowego buildu w Broken Ranks: zmiany przedmiotów, przenoszenie drifów i ulepszenia kamieni.",
    },
    {
        path: APP_ROUTES.help,
        label: "Instrukcja",
        heading: "Instrukcja Broken Ranks Tool",
        title: "Instrukcja kalkulatora i optymalizatora – Broken Ranks Tool",
        description:
            "Poznaj obsługę kreatora ekwipunku, optymalizatora drifów, Doradcy i ścieżki rozwoju. Sprawdź, jak zapisywać i importować buildy.",
    },
    {
        path: APP_ROUTES.builds,
        label: "Buildy lokalne",
        heading: "Biblioteka buildów",
        title: "Lokalna biblioteka buildów – Broken Ranks Tool",
        description:
            "Zapisuj, porównuj i importuj swoje buildy Broken Ranks w lokalnej bibliotece.",
        noindex: true,
    },
];

export function normalizeSiteUrl(value = DEFAULT_SITE_URL) {
    const url = new URL(value);
    if (
        !["https:", "http:"].includes(url.protocol) ||
        url.username ||
        url.password ||
        url.pathname !== "/" ||
        url.search ||
        url.hash
    )
        throw new Error("VITE_SITE_URL must be an HTTP(S) origin without a path or credentials.");
    return url.origin;
}

export const pageForPath = (path) =>
    SITE_PAGES.find((page) => page.path === canonicalAppPath(path)) ?? SITE_PAGES[0];
