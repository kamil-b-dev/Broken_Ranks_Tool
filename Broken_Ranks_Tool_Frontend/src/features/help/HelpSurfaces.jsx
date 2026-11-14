import { useEffect, useId, useLayoutEffect, useRef } from "react";
import LanguageSwitcher from "../../shared/i18n/LanguageSwitcher";
import { useHelpTranslation as useTranslation } from "./helpTranslation";
import { HELP_GROUPS, findHelpTopic } from "./helpContent";
import HelpArticle from "./HelpArticle";
import "./help.css";

function HelpDialog({ topicId, onSelect, onClose, onOpenPage }) {
    const { t } = useTranslation();
    const dialog = useRef(null);
    const titleId = useId();
    const article = useRef(null);
    useLayoutEffect(() => {
        const element = dialog.current;
        const opener = document.activeElement;
        const overflow = document.body.style.overflow;
        element.showModal();
        document.body.style.overflow = "hidden";
        return () => {
            element.close();
            document.body.style.overflow = overflow;
            if (opener?.isConnected) opener.focus({ preventScroll: true });
        };
    }, []);
    useEffect(() => {
        article.current.scrollTop = 0;
        article.current.focus({ preventScroll: true });
    }, [topicId]);
    return (
        <dialog
            ref={dialog}
            className="help-dialog"
            aria-labelledby={titleId}
            onCancel={(event) => {
                event.preventDefault();
                onClose();
            }}
        >
            <header className="help-toolbar">
                <button type="button" onClick={onClose}>
                    {t("Wróć do pracy")}
                </button>
                <a
                    href={`/help?topic=${topicId}`}
                    onClick={(event) => {
                        if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey)
                            return;
                        event.preventDefault();
                        onOpenPage(topicId);
                    }}
                >
                    {t("Wszystkie tematy")}
                </a>
            </header>
            <div ref={article} tabIndex={-1} className="help-dialog-body">
                <HelpArticle topic={findHelpTopic(topicId)} onSelect={onSelect} titleId={titleId} />
            </div>
        </dialog>
    );
}

function HelpPage({ topicId, onSelect, onClose }) {
    const { t } = useTranslation();
    const heading = useRef(null);
    const navigation = useRef(null);
    const titleId = useId();
    useEffect(() => {
        heading.current.focus({ preventScroll: true });
        const group = navigation.current.querySelector("[data-current-group]");
        if (group) group.open = true;
    }, [topicId]);
    return (
        <main className="help-page" id="help-content">
            <header className="help-page-heading">
                <div className="help-page-title">
                    <svg
                        className="help-emblem"
                        aria-hidden="true"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.4"
                    >
                        <path d="M12 5v15M12 5C9 3 5 3 2 4v14c3-1 7-1 10 2 3-3 7-3 10-2V4c-3-1-7-1-10 1Z" />
                        <path d="M5 7h4M5 11h4M15 7h4M15 11h4" />
                    </svg>
                    <h1>{t("Instrukcja")}</h1>
                </div>
                <div className="help-toolbar">
                    <button type="button" onClick={onClose}>
                        {t("Wróć do aplikacji")}
                    </button>
                    <LanguageSwitcher />
                </div>
            </header>
            <label className="help-topic-picker">
                {t("Wybierz temat")}
                <select value={topicId} onChange={(event) => onSelect(event.target.value)}>
                    {HELP_GROUPS.map((group) => (
                        <optgroup key={group.id} label={t(group.title)}>
                            {group.topicIds.map((id) => (
                                <option key={id} value={id}>
                                    {t(findHelpTopic(id).title)}
                                </option>
                            ))}
                        </optgroup>
                    ))}
                </select>
            </label>
            <div className="help-page-layout">
                <nav ref={navigation} className="help-topics" aria-label={t("Tematy pomocy")}>
                    {HELP_GROUPS.map((group) => (
                        <details
                            key={group.id}
                            className="help-topic-group"
                            name={`${titleId}-groups`}
                            open={group.topicIds.includes(topicId)}
                            data-current-group={group.topicIds.includes(topicId) ? "" : undefined}
                            aria-labelledby={`${titleId}-${group.id}`}
                        >
                            <summary id={`${titleId}-${group.id}`}>{t(group.title)}</summary>
                            <div>
                                {group.topicIds.map((id) => (
                                    <a
                                        key={id}
                                        href={`/help?topic=${id}`}
                                        aria-current={id === topicId ? "page" : undefined}
                                        onClick={(event) => {
                                            if (
                                                event.ctrlKey ||
                                                event.metaKey ||
                                                event.shiftKey ||
                                                event.altKey
                                            )
                                                return;
                                            event.preventDefault();
                                            onSelect(id);
                                        }}
                                    >
                                        {t(findHelpTopic(id).title)}
                                    </a>
                                ))}
                            </div>
                        </details>
                    ))}
                </nav>
                <div
                    ref={heading}
                    tabIndex={-1}
                    className="help-page-article"
                    aria-labelledby={titleId}
                >
                    <HelpArticle
                        topic={findHelpTopic(topicId)}
                        onSelect={onSelect}
                        titleId={titleId}
                    />
                </div>
            </div>
        </main>
    );
}

export default function HelpSurfaces({
    pageTopic,
    dialogTopic,
    onSelectPage,
    onClosePage,
    onSelectDialog,
    onCloseDialog,
}) {
    return (
        <>
            {pageTopic && (
                <HelpPage
                    topicId={findHelpTopic(pageTopic).id}
                    onSelect={onSelectPage}
                    onClose={onClosePage}
                />
            )}
            {dialogTopic && (
                <HelpDialog
                    topicId={findHelpTopic(dialogTopic).id}
                    onSelect={onSelectDialog}
                    onClose={onCloseDialog}
                    onOpenPage={onSelectPage}
                />
            )}
        </>
    );
}
