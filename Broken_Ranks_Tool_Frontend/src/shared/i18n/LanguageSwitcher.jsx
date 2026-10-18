import { useTranslation } from "./useTranslation";

export default function LanguageSwitcher() {
    const { t, language, setLanguage } = useTranslation();
    return (
        <div className="language-switcher" role="group" aria-label={t("Język interfejsu")}>
            {["pl", "en"].map((option) => (
                <button
                    key={option}
                    type="button"
                    lang={option}
                    aria-label={option === "pl" ? "Polski" : "English"}
                    aria-pressed={language === option}
                    onClick={() => setLanguage(option)}
                >
                    {option.toUpperCase()}
                </button>
            ))}
        </div>
    );
}
