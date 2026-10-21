import { useTranslation } from "../../shared/i18n/useTranslation";
import { itemName, SLOT_NAMES } from "./progressionReport";
import { groupStoneTransfers } from "./progressionStoneActions";
import { Stone } from "./ProgressionDetails";

function TransferSource({ action, group, data }) {
    const { t } = useTranslation();
    return (
        <div className="progression-transfer-source">
            <small>{t("Wyjmij z")}</small>
            <strong>
                {action.from
                    ? itemName(group.before.slots[action.from.slot], data, t)
                    : t("Pula wolnych kamieni")}
            </strong>
            {action.from && (
                <span>
                    {t("{0} · gniazdo {1}", [
                        t(SLOT_NAMES[action.from.slot]),
                        action.from.socketIndex + 1,
                    ])}
                </span>
            )}
        </div>
    );
}

export default function ProgressionTransfers({ group, data }) {
    const { t } = useTranslation();
    const destinations = groupStoneTransfers(group.moves);
    return (
        <section className="progression-transfers" aria-label={t("Przenieś")}>
            <h4>{t("Przenieś")}</h4>
            <p className="progression-transfer-order">
                {t("Przed wkładaniem opróżnij wskazane gniazda źródłowe.")}
            </p>
            <div className="progression-transfer-grid">
                {destinations.map(({ slot, moves }) => (
                    <section className="progression-transfer-card" key={slot ?? "pool"}>
                        <header>
                            {slot && (
                                <span
                                    className={`equipment-slot-icon equipment-slot-icon-${slot}`}
                                    aria-hidden="true"
                                />
                            )}
                            <div>
                                <h5>
                                    {slot
                                        ? itemName(group.final.stage.equipment.slots[slot], data, t)
                                        : t("Pula wolnych kamieni")}
                                </h5>
                                <span>{slot ? t(SLOT_NAMES[slot]) : t("Odłóż")}</span>
                            </div>
                        </header>
                        <ul>
                            {moves.map((action) => (
                                <li key={`${action.kind}:${action.instanceId}`}>
                                    <div className="progression-transfer-stone">
                                        <small>
                                            {action.to
                                                ? t("{0} · gniazdo {1}", [
                                                      t(action.kind === "drif" ? "Drif" : "Orb"),
                                                      action.to.socketIndex + 1,
                                                  ])
                                                : t(action.kind === "drif" ? "Drif" : "Orb")}
                                        </small>
                                        <Stone
                                            kind={action.kind}
                                            id={action.templateId}
                                            level={action.level}
                                            data={data}
                                        />
                                    </div>
                                    <TransferSource action={action} group={group} data={data} />
                                </li>
                            ))}
                        </ul>
                    </section>
                ))}
            </div>
        </section>
    );
}
