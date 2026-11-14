import { useTranslation } from "../../../shared/i18n/useTranslation";
export default function AdvisorExclusions({ settings, onChange, data, gameRules }) {
    const { t } = useTranslation();
    const value = settings.advisorExclusions || { itemIds: [], purchaseBonusTypes: [] };
    const update = (field, values) =>
        onChange((previous) => ({ ...previous, advisorExclusions: { ...value, [field]: values } }));
    return (
        <details className="advisor-goal-card">
            <summary>{t("Wykluczenia Doradcy")}</summary>
            <label>
                {t("Nie proponuj przedmiotu")}
                <select
                    value=""
                    onChange={(event) => {
                        if (event.target.value)
                            update("itemIds", [
                                ...new Set([...value.itemIds, Number(event.target.value)]),
                            ]);
                    }}
                >
                    <option value="">{t("Wybierz przedmiot")}</option>
                    {(data?.items || [])
                        .filter((item) => !value.itemIds.includes(Number(item.id)))
                        .map((item) => (
                            <option key={item.id} value={item.id}>
                                {item.name}
                            </option>
                        ))}
                </select>
            </label>
            <ul>
                {value.itemIds.map((id) => (
                    <li key={id}>
                        {data?.items?.find((item) => Number(item.id) === id)?.name || id}
                        <button
                            type="button"
                            onClick={() =>
                                update(
                                    "itemIds",
                                    value.itemIds.filter((value) => value !== id)
                                )
                            }
                        >
                            {t("Usuń wykluczenie")}
                        </button>
                    </li>
                ))}
            </ul>
            <label>
                {t("Nie kupuj typu drifa")}
                <select
                    value=""
                    onChange={(event) => {
                        if (event.target.value)
                            update("purchaseBonusTypes", [
                                ...new Set([...value.purchaseBonusTypes, event.target.value]),
                            ]);
                    }}
                >
                    <option value="">{t("Wybierz typ drifa")}</option>
                    {Object.entries(gameRules?.bonusTranslations || {})
                        .filter(
                            ([key]) =>
                                gameRules.drifBasePowers?.[key] != null &&
                                !value.purchaseBonusTypes.includes(key)
                        )
                        .map(([key, label]) => (
                            <option key={key} value={key}>
                                {t(label)}
                            </option>
                        ))}
                </select>
            </label>
            <ul>
                {value.purchaseBonusTypes.map((key) => (
                    <li key={key}>
                        {t(gameRules?.bonusTranslations?.[key] || key)}
                        <button
                            type="button"
                            onClick={() =>
                                update(
                                    "purchaseBonusTypes",
                                    value.purchaseBonusTypes.filter((value) => value !== key)
                                )
                            }
                        >
                            {t("Usuń wykluczenie")}
                        </button>
                    </li>
                ))}
            </ul>
        </details>
    );
}
