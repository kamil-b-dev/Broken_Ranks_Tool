import { useTranslation } from "../../shared/i18n/useTranslation";
import CategoryIcon from "../../shared/ui/CategoryIcon";
import { SLOT_NAMES, findTemplate, itemName, stoneDescription } from "./progressionReport";
import { progressionInstructions } from "./progressionStoneActions";
import "../../shared/styles/equipment-icons.css";

export function Stone({ kind, id, level, data, changed = false }) {
    const { t } = useTranslation();

    const template = findTemplate(id, kind === "drif" ? data.drifs : data.orbs);
    return (
        <span className={`progression-stone ${changed ? "is-changed" : ""}`}>
            <CategoryIcon kind={kind} category={template?.category} />
            {t(stoneDescription(kind, id, level, data, t))}
        </span>
    );
}

function EquipmentCard({ slotKey, slot, compare, data, caption, before = false }) {
    const { t } = useTranslation();

    return (
        <div className={`progression-slot-preview ${before ? "is-before" : ""}`}>
            <span
                className={`equipment-slot-icon equipment-slot-icon-${slotKey}`}
                aria-hidden="true"
            />
            <div>
                <small>{t(caption)}</small>
                <strong>
                    {t(
                        slot?.itemId != null
                            ? `${itemName(slot, data, t)} · ${slot.itemStars ?? 1}★`
                            : "Brak przedmiotu w planie"
                    )}
                </strong>
                <div className="progression-stones">
                    {slot?.drifIds?.flatMap((id, index) =>
                        id == null
                            ? []
                            : [
                                  <Stone
                                      key={`d${index}`}
                                      kind="drif"
                                      id={id}
                                      level={slot.drifLevels?.[index] ?? 1}
                                      data={data}
                                      changed={
                                          Boolean(compare) &&
                                          (String(compare.drifIds?.[index]) !== String(id) ||
                                              (compare.drifLevels?.[index] ?? 1) !==
                                                  (slot.drifLevels?.[index] ?? 1))
                                      }
                                  />,
                              ]
                    )}
                    {slot?.orbIds?.flatMap((id, index) =>
                        id == null
                            ? []
                            : [
                                  <Stone
                                      key={`o${index}`}
                                      kind="orb"
                                      id={id}
                                      level={slot.orbLevels?.[index] ?? 1}
                                      data={data}
                                      changed={
                                          Boolean(compare) &&
                                          (String(compare.orbIds?.[index]) !== String(id) ||
                                              (compare.orbLevels?.[index] ?? 1) !==
                                                  (slot.orbLevels?.[index] ?? 1))
                                      }
                                  />,
                              ]
                    )}
                </div>
            </div>
        </div>
    );
}

export function ProgressionConfiguration({ group, data, resSlots }) {
    const { t } = useTranslation();

    const final = group.final.stage.equipment;
    const keys = Object.keys(final.slots).filter(
        (key) =>
            !resSlots.includes(key) &&
            (final.slots[key]?.itemId != null || group.before.slots[key]?.itemId != null)
    );
    return (
        <details className="progression-config">
            <summary>{t("Szczegóły")}</summary>
            <div className="progression-config-slots">
                {keys.map((key) => (
                    <section key={key} aria-label={t(SLOT_NAMES[key])}>
                        <h4>
                            {t(SLOT_NAMES[key])}
                            {group.configurationChanges.includes(key) ? (
                                <span className="progression-change-tag">{t("Zmiana")}</span>
                            ) : null}
                        </h4>
                        <div
                            className={
                                group.configurationChanges.includes(key)
                                    ? "progression-before-after"
                                    : ""
                            }
                        >
                            {group.configurationChanges.includes(key) && (
                                <>
                                    <EquipmentCard
                                        slotKey={key}
                                        slot={group.before.slots[key]}
                                        data={data}
                                        caption="Przed"
                                        before
                                    />
                                    <span className="progression-swap-arrow" aria-hidden="true">
                                        →
                                    </span>
                                </>
                            )}
                            <EquipmentCard
                                slotKey={key}
                                slot={final.slots[key]}
                                compare={group.before.slots[key]}
                                data={data}
                                caption={
                                    group.configurationChanges.includes(key) ? "Po" : "Zachowaj"
                                }
                            />
                        </div>
                    </section>
                ))}
            </div>
            <ProgressionStatistics group={group} data={data} resSlots={resSlots} />
        </details>
    );
}

function ProgressionStatistics({ group, data, resSlots }) {
    const { t } = useTranslation();
    return (
        <section aria-label={t("Podsumowanie statystyk")}>
            <h4>{t("Podsumowanie statystyk")}</h4>
            <dl className="progression-statistics">
                {Object.entries(group.final.calculation.stats).map(([key, value]) => (
                    <div key={key}>
                        <dt>{t(data.gameRules?.bonusTranslations?.[key] ?? key)}</dt>
                        <dd>{t(value)}</dd>
                    </div>
                ))}
            </dl>
            {resSlots.length > 0 && (
                <p className="progression-note">{t("Statystyki nie uwzględniają synergetyków.")}</p>
            )}
        </section>
    );
}

export function ProgressionInstructions({ group, data, resSlots = [] }) {
    const { t } = useTranslation();
    const instructions = progressionInstructions(group, data, t);
    return (
        <details className="progression-instructions">
            <summary>{t("Szczegóły")}</summary>
            {instructions.length > 0 && (
                <ol>
                    {instructions.map((text, index) => (
                        <li key={index}>{text}</li>
                    ))}
                </ol>
            )}
            <ProgressionStatistics group={group} data={data} resSlots={resSlots} />
        </details>
    );
}
