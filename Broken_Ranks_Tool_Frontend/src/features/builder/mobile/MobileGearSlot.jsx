import { useEquipment } from "../../../shared/state/EquipmentContext";
import { useGearSlot } from "../gear-slot/useGearSlot";
import DrifSection from "../gear-slot/DrifSection";
import OrbSection from "../gear-slot/OrbSection";
import MobileItemPicker from "./MobileItemPicker";

export default function MobileGearSlot({ slot, items, pickingItem, onPickItem, onClosePicker }) {
    const { data, requestData, gameRules, handleSlotUpdate, optimizationTrigger } = useEquipment();
    const model = useGearSlot({
        slotKey: slot.key,
        items,
        orbs: data.orbs,
        drifs: data.drifs,
        allSlots: requestData.slots,
        gameRules,
        onUpdate: handleSlotUpdate,
        optimizationTrigger,
        initializeFromSnapshot: true,
    });
    const selectItem = (item) => {
        model.setSelectedItem(item ? String(item.id) : "");
        model.setItemStars(1);
        model.setBuiltInLvls([1, 1]);
        model.setOrbSlots({
            orb1: { id: "", type: "", level: "" },
            orb2: { id: "", type: "", level: "" },
        });
        model.setSelectedDrifs([]);
        model.setDrifTypes({});
        model.setDrifLevels({});
    };
    return (
        <section className="mobile-slot-editor" aria-label={`Edytor slotu: ${slot.label}`}>
            <div className="mobile-card">
                <span className="mobile-eyebrow">Przedmiot</span>
                <h2>{model.fullSelectedItem?.name || slot.label}</h2>
                {model.fullSelectedItem && (
                    <p className="mobile-muted">
                        Tier {model.fullSelectedItem.tier} · poziom{" "}
                        {model.fullSelectedItem.reqLevel || "—"}
                    </p>
                )}
                <button type="button" className="mobile-primary" onClick={onPickItem}>
                    {model.selectedItem ? "Zmień przedmiot" : "Wybierz przedmiot"}
                </button>
                {model.selectedItem && (
                    <>
                        <div className="mobile-field">
                            <label htmlFor={`mobile-stars-${slot.key}`}>Gwiazdki</label>
                            <select
                                id={`mobile-stars-${slot.key}`}
                                value={model.itemStars}
                                onChange={(event) => model.setItemStars(Number(event.target.value))}
                            >
                                {Array.from({ length: 9 }, (_, index) => (
                                    <option key={index} value={index + 1}>
                                        {index + 1} ★
                                    </option>
                                ))}
                            </select>
                        </div>
                        <button
                            className="mobile-back"
                            type="button"
                            onClick={() => selectItem(null)}
                        >
                            Usuń przedmiot ze slotu
                        </button>
                    </>
                )}
            </div>
            {model.selectedItem && (
                <>
                    <div className="mobile-card mobile-stones">
                        <h2>Orby</h2>
                        {(model.isLegendary ? ["orb1", "orb2"] : ["orb1"]).map((key, index) => (
                            <div key={key} role="group" aria-label={`Orb ${index + 1}`}>
                                <h3>Orb {index + 1}</h3>
                                <OrbSection
                                    slotKey={key}
                                    selectedItem={model.selectedItem}
                                    dragOverZone={model.dragOverZone}
                                    handleDragOver={model.handleDragOver}
                                    handleDragLeave={model.handleDragLeave}
                                    handleDrop={model.handleDrop}
                                    orbState={model.orbSlots[key]}
                                    setOrbState={(value) =>
                                        model.setOrbSlots((previous) => ({
                                            ...previous,
                                            [key]:
                                                typeof value === "function"
                                                    ? value(previous[key])
                                                    : value,
                                        }))
                                    }
                                    groupedOrbs={
                                        index === 0 ? model.groupedOrbs1 : model.groupedOrbs2
                                    }
                                    bonusTranslations={gameRules.bonusTranslations || {}}
                                />
                            </div>
                        ))}
                    </div>
                    <div className="mobile-card mobile-stones">
                        <h2>Drify</h2>
                        {model.isOverCapacity && (
                            <p role="alert" className="mobile-error">
                                Przekroczona pojemność: {model.currentPowerUsed}/
                                {model.itemCapacity}. Obniż poziomy lub usuń drif.
                            </p>
                        )}
                        <DrifSection
                            slotKey={slot.key}
                            drifs={data.drifs}
                            fullSelectedItem={model.fullSelectedItem}
                            hookData={model}
                            bonusTranslations={gameRules.bonusTranslations || {}}
                            drifBasePowers={gameRules.drifBasePowers || {}}
                            handleDragOver={model.handleDragOver}
                            handleDragLeave={model.handleDragLeave}
                            handleDrop={model.handleDrop}
                        />
                    </div>
                </>
            )}
            {pickingItem && (
                <MobileItemPicker
                    items={items}
                    slotLabel={slot.label}
                    onClose={onClosePicker}
                    onSelect={(item) => {
                        selectItem(item);
                        onClosePicker();
                    }}
                />
            )}
        </section>
    );
}
