import { useEffect, useRef, useState } from "react";
import { useEquipment } from "../../../shared/state/EquipmentContext";
import { SLOTS } from "../../../shared/domain/equipment/equipmentSlots";
import { useBuilderWorkspace } from "../useBuilderWorkspace";
import { maximizeStoneLevels } from "../maximizeStoneLevels";
import { useMobileBuilderRoute } from "./useMobileBuilderRoute";
import MobileGearSlot from "./MobileGearSlot";
import MobileCharacterPanel from "./MobileCharacterPanel";
import MobileStatsPanel from "./MobileStatsPanel";
import "./mobile-builder.css";

export default function MobileBuilderWorkspace() {
    const equipment = useEquipment();
    const { data, requestData, gameRules, handleSlotUpdate } = equipment;
    const model = useBuilderWorkspace({ items: data.items, slots: requestData.slots });
    const route = useMobileBuilderRoute();
    const heading = useRef(null);
    const lastSlot = useRef(null);
    const listScrollPosition = useRef(0);
    const [warnings, setWarnings] = useState([]);
    const [revision, setRevision] = useState(0);
    useEffect(() => {
        if (!route.slot && lastSlot.current && route.section === "equipment") {
            window.scrollTo({ top: listScrollPosition.current, behavior: "instant" });
            document
                .getElementById(`mobile-slot-${lastSlot.current}`)
                ?.focus({ preventScroll: true });
        } else {
            window.scrollTo({ top: 0, behavior: "instant" });
            heading.current?.focus({ preventScroll: true });
        }
        lastSlot.current = route.slot?.key;
    }, [route.section, route.slot]);

    const maximize = (kind) => {
        const result = maximizeStoneLevels({ slots: requestData.slots, ...data, gameRules, kind });
        Object.entries(result.updates).forEach(([key, slot]) => handleSlotUpdate(key, slot));
        setWarnings(result.warnings);
        setRevision((value) => value + 1);
    };

    return (
        <main id="workspace-content" className="mobile-builder">
            <div className="mobile-page-title">
                <div>
                    <span className="mobile-eyebrow">Kreator ekwipunku</span>
                    {route.slot ? (
                        <h1 ref={heading} tabIndex={-1}>
                            {route.slot.label}
                        </h1>
                    ) : (
                        <h1 className="sr-only">Kreator ekwipunku</h1>
                    )}
                </div>
                <span className="mobile-count">
                    {model.equippedSlotCount}
                    <small> / 12</small>
                </span>
            </div>
            {route.slot ? (
                <>
                    <button type="button" className="mobile-back" onClick={route.back}>
                        ← Wszystkie sloty
                    </button>
                    <MobileGearSlot
                        key={`${route.slot.key}:${equipment.optimizationTrigger}:${revision}`}
                        slot={route.slot}
                        items={model.itemsBySlot[route.slot.key] || []}
                        pickingItem={route.pickingItem}
                        onPickItem={() => route.change({ slot: route.slot.key, pick: "item" })}
                        onClosePicker={route.back}
                    />
                </>
            ) : (
                <>
                    <nav className="mobile-sections" aria-label="Sekcje kreatora">
                        {[
                            ["equipment", "Ekwipunek"],
                            ["character", "Postać"],
                            ["stats", "Statystyki"],
                        ].map(([key, label]) => (
                            <button
                                key={key}
                                type="button"
                                aria-current={route.section === key ? "page" : undefined}
                                onClick={() => route.change({ section: key })}
                            >
                                {label}
                            </button>
                        ))}
                    </nav>
                    {route.section === "equipment" ? (
                        <>
                            <div className="mobile-slot-list" aria-label="Sloty ekwipunku">
                                {SLOTS.map((slot) => {
                                    const item = model.itemForSlot(slot);
                                    const current = requestData.slots[slot.key];
                                    return (
                                        <button
                                            key={slot.key}
                                            id={`mobile-slot-${slot.key}`}
                                            type="button"
                                            className={`mobile-slot-card ${item ? "is-equipped" : ""}`}
                                            onClick={() => {
                                                listScrollPosition.current = window.scrollY;
                                                route.change({ slot: slot.key });
                                            }}
                                            aria-label={`Edytuj slot: ${slot.label}`}
                                        >
                                            <span
                                                className={`equipment-slot-icon equipment-slot-icon-${slot.key}`}
                                                aria-hidden="true"
                                            />
                                            <span className="mobile-slot-copy">
                                                <strong>{slot.label}</strong>
                                                <span>{item?.name || "Wybierz przedmiot"}</span>
                                                {item && (
                                                    <small>
                                                        {current.itemStars || 1} ★ · Drify:{" "}
                                                        {current.drifIds?.filter(Boolean).length ||
                                                            0}{" "}
                                                        · Orby:{" "}
                                                        {current.orbIds?.filter(Boolean).length ||
                                                            0}{" "}
                                                    </small>
                                                )}
                                            </span>
                                            <span aria-hidden="true">›</span>
                                        </button>
                                    );
                                })}
                            </div>
                            <section
                                className="mobile-card mobile-bulk-actions"
                                aria-label="Poziomy wszystkich kamieni"
                            >
                                <button type="button" onClick={() => maximize("drifs")}>
                                    Maksymalne poziomy drifów
                                </button>
                                <button type="button" onClick={() => maximize("orbs")}>
                                    Maksymalne poziomy orbów
                                </button>
                            </section>
                            {warnings.length > 0 && (
                                <div role="status" className="mobile-card">
                                    {warnings.map((warning, index) => (
                                        <p key={index}>{warning}</p>
                                    ))}
                                </div>
                            )}
                            <button
                                type="button"
                                className="mobile-primary"
                                onClick={() => route.change({ section: "stats" })}
                            >
                                Statystyki buildu <span aria-hidden="true">→</span>
                            </button>
                        </>
                    ) : route.section === "character" ? (
                        <MobileCharacterPanel />
                    ) : (
                        <MobileStatsPanel />
                    )}
                </>
            )}
        </main>
    );
}
