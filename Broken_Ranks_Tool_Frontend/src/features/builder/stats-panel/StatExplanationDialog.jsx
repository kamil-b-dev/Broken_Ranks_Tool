import { useId, useLayoutEffect, useRef } from "react";
import { useTranslation } from "../../../shared/i18n/useTranslation";
import { SLOTS } from "../../../shared/domain/equipment/equipmentSlots";
import "./stat-explanation.css";

const KIND_NAMES = {
    DEFAULT: "Wartość domyślna",
    CHARACTER: "Statystyki postaci",
    ITEM: "Przedmiot",
    DRIF: "Drif",
    ORB: "Orb",
};

export default function StatExplanationDialog({ model, gameRules }) {
    const { t, locale } = useTranslation();
    const dialog = useRef(null);
    const titleId = useId();
    const { selected, data, error, close, retry, opener: sourceOpener } = model;
    useLayoutEffect(() => {
        const element = dialog.current;
        const opener = sourceOpener || document.activeElement;
        const overflow = document.body.style.overflow;
        element.showModal();
        document.body.style.overflow = "hidden";
        return () => {
            element.close();
            document.body.style.overflow = overflow;
            if (opener?.isConnected) opener.focus({ preventScroll: true });
            queueMicrotask(() => {
                if (opener?.isConnected && !document.querySelector("dialog[open]"))
                    opener.focus({ preventScroll: true });
            });
        };
    }, [sourceOpener]);
    const number = (value) =>
        new Intl.NumberFormat(locale, { maximumFractionDigits: 4 }).format(value);
    const format = (value, percent) => `${number(value)}${percent ? "%" : ""}`;
    const sources = data?.contributions?.[selected] ?? [];
    const cap = data?.caps?.[selected];
    const raw = data?.stats?.[selected];
    const total = Number.parseFloat(String(raw).replace(",", "."));
    const excess = cap == null ? 0 : Math.max(0, (total - cap) * (cap < 0 ? -1 : 1));
    const drif = sources.find(({ source }) => source.kind === "DRIF");
    return (
        <dialog
            ref={dialog}
            className="stat-explanation"
            aria-labelledby={titleId}
            onCancel={(event) => {
                event.preventDefault();
                close();
            }}
        >
            <header>
                <button type="button" onClick={close}>
                    {t("Wróć do statystyk")}
                </button>
                <h2 id={titleId}>{t(gameRules?.bonusTranslations?.[selected] || selected)}</h2>
                {data && <strong className="stat-explanation-total">{t(raw ?? "—")}</strong>}
            </header>
            <div className="stat-explanation-body" aria-busy={!data && !error}>
                {!data && !error && <p role="status">{t("Wczytywanie źródeł statystyki…")}</p>}
                {error && (
                    <div role="alert">
                        <p>{t("Nie udało się wczytać szczegółów statystyki.")}</p>
                        <button type="button" onClick={retry}>
                            {t("Spróbuj ponownie")}
                        </button>
                    </div>
                )}
                {data && (
                    <>
                        {cap != null && (
                            <p>
                                {t("Cap: {0}", [format(cap, true)])}
                                {excess > 0 && (
                                    <>
                                        {" "}
                                        ·{" "}
                                        {t("Nadmiar bez dodatkowej korzyści: {0} p.p.", [
                                            number(excess),
                                        ])}
                                    </>
                                )}
                            </p>
                        )}
                        {drif?.source.repeatCount > 3 && (
                            <p>
                                {t("Drify tego typu: {0}. Mnożnik {1} obejmuje każdy z nich.", [
                                    number(drif.source.repeatCount),
                                    number(drif.source.penaltyMultiplier),
                                ])}
                            </p>
                        )}
                        <ul className="stat-source-list">
                            {sources.map(({ source, baseValue, value, percentage }, index) => (
                                <li key={index}>
                                    <details>
                                        <summary>
                                            <span>
                                                <strong>
                                                    {source.stoneName ||
                                                        source.itemName ||
                                                        t(KIND_NAMES[source.kind])}
                                                </strong>
                                                {source.slotKey && (
                                                    <small>
                                                        {t(
                                                            SLOTS.find(
                                                                (slot) =>
                                                                    slot.key === source.slotKey
                                                            )?.label || source.slotKey
                                                        )}{" "}
                                                        · {source.itemName} · {source.itemStars}★
                                                    </small>
                                                )}
                                                {source.stoneName && (
                                                    <small>
                                                        {t(source.size)} · {t("Poziom")}{" "}
                                                        {source.level}
                                                        {source.builtIn && <> · {t("Wbudowany")}</>}
                                                    </small>
                                                )}
                                            </span>
                                            <b>{format(value, percentage)}</b>
                                        </summary>
                                        <dl>
                                            <div>
                                                <dt>
                                                    {t(
                                                        source.kind === "DRIF" ||
                                                            source.kind === "ORB"
                                                            ? "Wartość kamienia na tym poziomie"
                                                            : "Wartość bazowa"
                                                    )}
                                                </dt>
                                                <dd>{format(baseValue, percentage)}</dd>
                                            </div>
                                            {source.kind === "ITEM" && value !== baseValue && (
                                                <div>
                                                    <dt>{t("Przydział z gwiazdek")}</dt>
                                                    <dd>{number(value - baseValue)}</dd>
                                                </div>
                                            )}
                                            {source.kind === "DRIF" && (
                                                <>
                                                    <div>
                                                        <dt>{t("Bonus przedmiotu do drifów")}</dt>
                                                        <dd>
                                                            {format(source.itemBonus * 100, true)}
                                                        </dd>
                                                    </div>
                                                    <div>
                                                        <dt>{t("Bonus gwiazdek do drifów")}</dt>
                                                        <dd>
                                                            {format(source.starBonus * 100, true)}
                                                        </dd>
                                                    </div>
                                                    <div>
                                                        <dt>{t("Mnożnik za powtórzenia")}</dt>
                                                        <dd>×{number(source.penaltyMultiplier)}</dd>
                                                    </div>
                                                    <div className="stat-source-formula">
                                                        <dt>{t("Obliczenie")}</dt>
                                                        <dd>
                                                            {format(baseValue, percentage)} × (1 +{" "}
                                                            {number(source.itemBonus)} +{" "}
                                                            {number(source.starBonus)}) ×{" "}
                                                            {number(source.penaltyMultiplier)}
                                                        </dd>
                                                    </div>
                                                </>
                                            )}
                                            {source.kind === "ORB" && (
                                                <div>
                                                    <dt>{t("Bonus gwiazdek do orba")}</dt>
                                                    <dd>{format(source.starBonus * 100, true)}</dd>
                                                </div>
                                            )}
                                            <div>
                                                <dt>{t("Wkład do wyniku")}</dt>
                                                <dd>{format(value, percentage)}</dd>
                                            </div>
                                        </dl>
                                    </details>
                                </li>
                            ))}
                        </ul>
                        <p className="stat-source-rounding">
                            {t(
                                "Składniki pokazano do 4 miejsc po przecinku. Wynik jest zaokrąglany po zsumowaniu."
                            )}
                        </p>
                    </>
                )}
            </div>
        </dialog>
    );
}
