import { useEffect, useRef, useState } from "react";
import { useTranslation } from "../../../shared/i18n/useTranslation";
import { calculateEquipmentStats } from "../../../shared/api/equipmentApi";
import { parseBuildPayload } from "../buildFile";

export default function BuildComparisonRefresh({ builds, library, data }) {
    const { t } = useTranslation();
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const pending = useRef(null);
    const identity = JSON.stringify(builds.map(({ id, payload }) => [id, payload]));
    useEffect(() => () => pending.current?.abort(), [identity, data]);
    return (
        <div>
            <button
                type="button"
                disabled={busy || !builds.length || !library?.updateCalculation}
                onClick={async () => {
                    const controller = new AbortController();
                    pending.current = controller;
                    setBusy(true);
                    setError("");
                    try {
                        for (const build of builds) {
                            const request = parseBuildPayload(build.payload, data).requestData;
                            const response = await calculateEquipmentStats(request, {
                                signal: controller.signal,
                            });
                            if (controller.signal.aborted) break;
                            if (
                                !(await library.updateCalculation(
                                    build.id,
                                    JSON.stringify(build.payload),
                                    response
                                ))
                            )
                                throw new Error(
                                    "Nie zapisano przeliczenia. Sprawdź komunikat biblioteki."
                                );
                        }
                    } catch (failure) {
                        if (!controller.signal.aborted)
                            setError(failure.response?.data?.message || failure.message);
                    } finally {
                        setBusy(false);
                        if (pending.current === controller) pending.current = null;
                    }
                }}
            >
                {t("Przelicz wybrane buildy")}
            </button>
            {error && <p role="alert">{t(error)}</p>}
        </div>
    );
}
