import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { readBuildShareLink } from "./buildShare";
import { parseBuildPayload } from "../buildFile";
import { SLOTS } from "../../../shared/domain/equipment/equipmentSlots";
import { calculateEquipmentStats } from "../../../shared/api/equipmentApi";
import { useTranslation } from "../../../shared/i18n/useTranslation";
import { stoneLabel, statisticLabel } from "./buildPresentation";

const subscribeHash = (listener) => {
    window.addEventListener("hashchange", listener);
    return () => window.removeEventListener("hashchange", listener);
};
const currentHash = () => window.location.hash;

export default function SharedBuildPreview({ data, library, onOpenBuilder }) {
    const { t } = useTranslation();
    const hash = useSyncExternalStore(subscribeHash, currentHash);
    const shared = useMemo(() => {
        try {
            const record = readBuildShareLink(hash);
            if (!record) return null;
            const parsed = parseBuildPayload(record.payload, data);
            return { ...record, id: "shared", parsed };
        } catch (failure) {
            return { error: failure.message };
        }
    }, [data, hash]);
    if (!shared) return null;
    if (shared.error) return <p role="alert">{t(shared.error)}</p>;
    return (
        <SharedBuildContent
            key={hash}
            shared={shared}
            data={data}
            library={library}
            onOpenBuilder={onOpenBuilder}
        />
    );
}

function SharedBuildContent({ shared, data, library, onOpenBuilder }) {
    const { t } = useTranslation();
    const [stats, setStats] = useState(shared.stats || null);
    const [recalculated, setRecalculated] = useState(false);
    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);
    const pending = useRef(null);
    useEffect(() => () => pending.current?.abort(), []);
    return (
        <section className="workbench shared-build-preview">
            <h2>{shared.name}</h2>
            <p>{t("Udostępniony build — podgląd")}</p>
            {SLOTS.map(({ key, label }) => {
                const slot = shared.parsed.requestData.slots[key];
                if (slot?.synergetic)
                    return (
                        <p key={key}>
                            {t(label)}: {slot.synergetic.name} ·{" "}
                            {Object.entries(slot.synergetic.stats)
                                .map(([name, value]) => `${t(name)}: ${value}`)
                                .join(" · ")}
                        </p>
                    );
                const item = data.items.find((entry) => String(entry.id) === String(slot?.itemId));
                return item ? (
                    <p key={key}>
                        {t(label)}: {item.name} · {slot.itemStars ?? 1}★
                        {(slot.drifIds || [])
                            .flatMap((id, index) => {
                                const drif = data.drifs.find(
                                    (entry) => String(entry.id) === String(id)
                                );
                                return drif
                                    ? [` · ${stoneLabel(drif, slot.drifLevels?.[index] ?? 1)}`]
                                    : [];
                            })
                            .join("")}
                        {(slot.orbIds || [])
                            .flatMap((id, index) => {
                                const orb = data.orbs?.find(
                                    (entry) => String(entry.id) === String(id)
                                );
                                return orb
                                    ? [` · ${stoneLabel(orb, slot.orbLevels?.[index] ?? 1)}`]
                                    : [];
                            })
                            .join("")}
                    </p>
                ) : null;
            })}
            <button
                type="button"
                disabled={busy}
                onClick={async () => {
                    setError("");
                    setBusy(true);
                    const controller = new AbortController();
                    pending.current = controller;
                    try {
                        const response = await calculateEquipmentStats(shared.parsed.requestData, {
                            signal: controller.signal,
                        });
                        if (controller.signal.aborted) return;
                        setStats(response.stats || response);
                        setRecalculated(true);
                    } catch (failure) {
                        if (!controller.signal.aborted) setError(failure.message);
                    } finally {
                        setBusy(false);
                    }
                }}
            >
                {t("Przelicz statystyki")}
            </button>
            <button
                type="button"
                disabled={busy || !library?.loadSnapshot}
                onClick={async () => {
                    setBusy(true);
                    try {
                        if ((await library.loadSnapshot(shared)) !== false) onOpenBuilder();
                    } catch (failure) {
                        setError(failure.message);
                    } finally {
                        setBusy(false);
                    }
                }}
            >
                {t("Skopiuj do kreatora")}
            </button>
            {stats && (
                <section>
                    <h3>{t(recalculated ? "Statystyki" : "Zapisane statystyki")}</h3>
                    <dl>
                        {Object.entries(stats).map(([name, value]) => (
                            <div key={name}>
                                <dt>{statisticLabel(name, data, t)}</dt>
                                <dd>{value}</dd>
                            </div>
                        ))}
                    </dl>
                </section>
            )}
            {error && <p role="alert">{t(error)}</p>}
        </section>
    );
}
