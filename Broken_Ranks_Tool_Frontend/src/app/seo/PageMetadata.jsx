import { useEffect, useSyncExternalStore } from "react";
import { useTranslation } from "../../shared/i18n/useTranslation";
import { normalizeSiteUrl, pageForPath } from "./pages";

const subscribe = (update) => {
    window.addEventListener("popstate", update);
    return () => window.removeEventListener("popstate", update);
};
const readPath = () => window.location.pathname;

function setMeta(attribute, key, content) {
    const selector = `meta[${attribute}="${key}"]`;
    let element = document.head.querySelector(selector);
    if (!element) {
        element = document.createElement("meta");
        element.setAttribute(attribute, key);
        document.head.append(element);
    }
    element.content = content;
}

/** Keep in-app navigation and language changes consistent with the initial HTML. */
export default function PageMetadata() {
    const path = useSyncExternalStore(subscribe, readPath);
    const { t, language } = useTranslation();
    useEffect(() => {
        const page = pageForPath(path);
        const canonical = `${normalizeSiteUrl(import.meta.env.VITE_SITE_URL)}${page.path}`;
        const title = t(page.title);
        const description = t(page.description);
        document.title = title;
        setMeta("name", "description", description);
        setMeta("name", "robots", page.noindex ? "noindex, follow" : "index, follow");
        setMeta("property", "og:title", title);
        setMeta("property", "og:description", description);
        setMeta("property", "og:url", canonical);
        setMeta("property", "og:locale", language === "en" ? "en_GB" : "pl_PL");
        setMeta("name", "twitter:title", title);
        setMeta("name", "twitter:description", description);
        let link = document.head.querySelector('link[rel="canonical"]');
        if (!link) {
            link = document.createElement("link");
            link.rel = "canonical";
            document.head.append(link);
        }
        link.href = canonical;
    }, [path, t, language]);
    return null;
}
