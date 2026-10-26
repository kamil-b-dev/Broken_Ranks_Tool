import { useCallback } from "react";
import english from "./content/en.json" with { type: "json" };
import { translate } from "../../shared/i18n/translation";
import { useTranslation } from "../../shared/i18n/useTranslation";

export const translateHelp = (source, language = "pl", parameters) =>
    translate(
        language === "en" && Object.hasOwn(english, source) ? english[source] : source,
        language,
        parameters
    );

export function useHelpTranslation() {
    const translation = useTranslation();
    const { language } = translation;
    const t = useCallback(
        (source, parameters) => translateHelp(source, language, parameters),
        [language]
    );
    return { ...translation, t };
}
