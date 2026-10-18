import { useEffect, useMemo, useState } from "react";
import { LanguageContext } from "./LanguageContext";
import { LANGUAGE_STORAGE_KEY, normalizeLanguage, translate } from "./translation";
import "./language.css";

function readLanguage() {
    try {
        return normalizeLanguage(localStorage.getItem(LANGUAGE_STORAGE_KEY));
    } catch {
        return "pl";
    }
}

export default function LanguageProvider({ children }) {
    const [language, setLanguageState] = useState(readLanguage);
    const value = useMemo(
        () => ({ language, setLanguage: (next) => setLanguageState(normalizeLanguage(next)) }),
        [language]
    );
    useEffect(() => {
        document.documentElement.lang = language;
        document
            .querySelectorAll(
                'meta[name="description"], meta[property="og:description"], meta[name="twitter:description"]'
            )
            .forEach((element) => {
                element.content = translate(
                    "Kalkulator ekwipunku i optymalizator postaci do gry Broken Ranks.",
                    language
                );
            });
        document
            .querySelector('meta[property="og:locale"]')
            ?.setAttribute("content", language === "en" ? "en_GB" : "pl_PL");
        try {
            localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
        } catch {
            // The selected language still works when browser storage is unavailable.
        }
    }, [language]);
    useEffect(() => {
        const synchronize = (event) => {
            if (event.key === LANGUAGE_STORAGE_KEY)
                setLanguageState(normalizeLanguage(event.newValue));
        };
        window.addEventListener("storage", synchronize);
        return () => window.removeEventListener("storage", synchronize);
    }, []);
    return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}
