import { SLOTS } from "../../constants/equipment";
import EquipmentSlotOverview from "../equipment/EquipmentSlotOverview";
import GearSlot from "../GearSlot";

const BuilderEquipmentWorkbench = ({
    model,
    data,
    requestData,
    gameRules,
    optimizationTrigger,
    onSlotUpdate,
}) => {
    const renderOverview = (slot) => (
        <EquipmentSlotOverview
            key={slot.key}
            slotKey={slot.key}
            label={slot.label}
            slotData={requestData.slots?.[slot.key]}
            item={model.itemForSlot(slot)}
            active={slot.key === model.activeSlot.key}
            onSelect={() => model.selectSlot(slot)}
        />
    );
    return (
        <section className="workbench builder-equipment-column flex flex-col p-5 md:p-6">
            <div className="workbench-heading">
                <div>
                    <p className="section-kicker">Konfiguracja</p>
                    <h2>Ekwipunek</h2>
                </div>
                <p className="workbench-help">
                    Wybierz przedmiot lub przeciągnij go z bazy. Karmazynowa obwódka oznacza aktywne
                    pole.
                </p>
            </div>
            <span className="equipment-ornament-divider" aria-hidden="true" />
            <div className="equipment-figure-heading" aria-live="polite">
                <span>Ekwipunek</span>
                <strong>
                    {model.equippedSlotCount}/{SLOTS.length}
                </strong>
            </div>
            <div className="equipment-figure-layout">
                <div className="equipment-slot-column">{SLOTS.slice(0, 6).map(renderOverview)}</div>
                <figure className="equipment-character-figure" aria-hidden="true">
                    <span className="equipment-figure-aura" />
                    <span className="equipment-body-layers" aria-hidden="true">
                        {SLOTS.map((slot) => {
                            const equipped = Boolean(model.itemForSlot(slot));
                            const active = slot.key === model.activeSlot.key;
                            return (
                                <i
                                    key={slot.key}
                                    className={`equipment-body-layer equipment-body-layer-${slot.key}${equipped ? " equipment-body-layer-equipped" : ""}${active ? " equipment-body-layer-active" : ""}`}
                                />
                            );
                        })}
                    </span>
                </figure>
                <div className="equipment-slot-column">{SLOTS.slice(6).map(renderOverview)}</div>
            </div>
            <section className="selected-slot-editor" aria-label="Edytor wybranego slotu">
                <div className="selected-slot-editor-heading">
                    <div>
                        <p className="section-kicker">Edytowany slot</p>
                        <h3>{model.activeSlot.label}</h3>
                    </div>
                    <span>{model.activeItem?.name || "Brak wybranego przedmiotu"}</span>
                </div>
                <div className="selected-slot-editor-content">
                    {SLOTS.map((slot) => (
                        <div
                            key={slot.key}
                            className={slot.key === model.activeSlot.key ? "block" : "hidden"}
                        >
                            <GearSlot
                                expanded
                                slotKey={slot.key}
                                label={slot.label}
                                items={model.itemsBySlot[slot.key] || []}
                                orbs={data.orbs}
                                drifs={data.drifs}
                                allSlots={requestData.slots || {}}
                                onUpdate={onSlotUpdate}
                                gameRules={gameRules}
                                optimizationTrigger={optimizationTrigger}
                            />
                        </div>
                    ))}
                </div>
            </section>
        </section>
    );
};

export default BuilderEquipmentWorkbench;
