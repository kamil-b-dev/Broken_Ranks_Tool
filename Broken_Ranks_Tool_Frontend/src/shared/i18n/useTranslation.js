import { useCallback, useContext } from "react";
import { LanguageContext } from "./LanguageContext";
import { languageLocale, translate } from "./translation";

export function useTranslation() {
    const { language, setLanguage } = useContext(LanguageContext);
    const t = useCallback(
        (source, parameters) => translate(source, language, parameters),
        [language]
    );
    return { t, language, setLanguage, locale: languageLocale(language) };
}
