import { useContext } from "react";
import { useTranslation } from "../../shared/i18n/useTranslation";
import { HelpContext } from "./HelpContext";

export default function HelpButton({
    topic = "builder",
    page = false,
    compact = false,
    className = "help-link",
    icon = "?",
    children,
}) {
    const { t } = useTranslation();
    const help = useContext(HelpContext);
    return (
        <a
            className={`${className}${compact ? " help-link-compact" : ""}`}
            href={page ? "/help" : `/help?topic=${topic}`}
            onClick={(event) => {
                if (!help || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey)
                    return;
                event.preventDefault();
                if (page) help.openPage();
                else help.openTopic(topic);
            }}
        >
            <span aria-hidden="true">{icon}</span>
            <span className="help-link-label">
                {children || t(page ? "Instrukcja" : "Jak korzystać?")}
            </span>
        </a>
    );
}
