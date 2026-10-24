import { useTranslation } from "../../../shared/i18n/useTranslation";
import {
    useEquipmentCatalogState,
    useEquipmentSetup,
    useEquipmentBackpack,
} from "../../../shared/state/EquipmentContext";
import { useGearSlot } from "../gear-slot/useGearSlot";
import DrifSection from "../gear-slot/DrifSection";
import OrbSection from "../gear-slot/OrbSection";
import MobileItemPicker from "./MobileItemPicker";
import { useRef } from "react";
import BackpackEquipmentSelect from "../backpack/BackpackEquipmentSelect";
import BackpackItemChoices from "../backpack/BackpackItemChoices";
import EquipmentRemovalAction from "../backpack/EquipmentRemovalAction";
import { ItemUpgradeHint } from "../gear-slot/UpgradeHints";

export default function MobileGearSlot({ slot, items, pickingItem, onPickItem, onClosePicker }) {
    const { t } = useTranslation();

    const pickerOpener = useRef(null);
    const { data, gameRules } = useEquipmentCatalogState();
    const { requestData, handleSlotUpdate, optimizationTrigger } = useEquipmentSetup();
    const {
        backpack,
        equipBackpackEntry,
        getBackpackEquipWarning,
        backpackEquipNotice,
        equipmentRemoval,
    } = useEquipmentBackpack();
    const model = useGearSlot({
        slotKey: slot.key,
        items,
        orbs: data.orbs,
        drifs: data.drifs,
        allSlots: requestData.slots,
        gameRules,
        onUpdate: handleSlotUpdate,
        optimizationTrigger,
        onBackpackEquip: equipBackpackEntry,
        getBackpackEquipWarning,
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
        <section
            className="mobile-slot-editor"
            aria-label={t("Edytor slotu: {0}", [t(slot.label)])}
        >
            {backpackEquipNotice && (
                <p className="mobile-error" role="alert">
                    {t(backpackEquipNotice)}
                </p>
            )}
            <div className="mobile-card">
                <span className="mobile-eyebrow">{t("Przedmiot")}</span>
                <h2>{model.fullSelectedItem?.name || slot.label}</h2>
                {model.fullSelectedItem && (
                    <p className="mobile-muted">
                        {t("Tier ")}
                        {t(model.fullSelectedItem.tier)}
                        {t(" · poziom")}
                        {t(" ")}
                        {t(model.fullSelectedItem.reqLevel || "—")}
                    </p>
                )}
                <button
                    ref={pickerOpener}
                    type="button"
                    className="mobile-primary"
                    onClick={onPickItem}
                >
                    {t(model.selectedItem ? "Zmień przedmiot" : "Wybierz przedmiot")}
                </button>
                {model.selectedItem && (
                    <>
                        <div className="mobile-field">
                            <label htmlFor={`mobile-stars-${slot.key}`}>{t("Gwiazdki")}</label>
                            <select
                                id={`mobile-stars-${slot.key}`}
                                value={model.itemStars}
                                onChange={(event) => model.setItemStars(Number(event.target.value))}
                            >
                                {Array.from({ length: 9 }, (_, index) => (
                                    <option key={index} value={index + 1}>
                                        {t(index + 1)} ★
                                    </option>
                                ))}
                            </select>
                        </div>
                        <ItemUpgradeHint item={model.fullSelectedItem} stars={model.itemStars} />
                        <button
                            className="mobile-back"
                            type="button"
                            onClick={() => selectItem(null)}
                        >
                            {t("Usuń przedmiot ze slotu")}
                        </button>
                    </>
                )}
            </div>
            {model.selectedItem && (
                <>
                    <div className="mobile-card mobile-stones">
                        <h2>{t("Orby")}</h2>
                        {(model.isLegendary ? ["orb1", "orb2"] : ["orb1"]).map((key, index) => (
                            <div key={key} role="group" aria-label={t("Orb {0}", [t(index + 1)])}>
                                <h3>
                                    {t("Orb ")}
                                    {t(index + 1)}
                                </h3>
                                <OrbSection
                                    equipmentSlotKey={slot.key}
                                    removalActions={equipmentRemoval}
                                    showCategoryIcons={false}
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
                                <BackpackEquipmentSelect
                                    entries={backpack}
                                    data={data}
                                    kind="ORB"
                                    slotKey={slot.key}
                                    zone={key}
                                    label={t("Orb {0} z plecaka", [t(index + 1)])}
                                    onEquip={equipBackpackEntry}
                                    getWarning={getBackpackEquipWarning}
                                />
                            </div>
                        ))}
                    </div>
                    <div className="mobile-card mobile-stones">
                        <h2>{t("Drify")}</h2>
                        {model.isOverCapacity && (
                            <p role="alert" className="mobile-error">
                                {t("Przekroczona pojemność: ")}
                                {t(model.currentPowerUsed)}/{t(model.itemCapacity)}
                                {t(". Obniż poziomy lub usuń drif.")}
                            </p>
                        )}
                        <DrifSection
                            renderStoneActions={(index) => (
                                <EquipmentRemovalAction
                                    iconOnly
                                    actions={equipmentRemoval}
                                    kind="DRIF"
                                    slotKey={slot.key}
                                    zone={`drif-${index}`}
                                    label={t("Zdejmij drif {0} do plecaka", [t(index + 1)])}
                                />
                            )}
                            showCategoryIcons={false}
                            slotKey={slot.key}
                            drifs={data.drifs}
                            fullSelectedItem={model.fullSelectedItem}
                            hookData={model}
                            bonusTranslations={gameRules.bonusTranslations || {}}
                            drifBasePowers={gameRules.drifBasePowers || {}}
                            handleDragOver={model.handleDragOver}
                            handleDragLeave={model.handleDragLeave}
                            handleDrop={model.handleDrop}
                            renderBackpackPicker={(index) => (
                                <BackpackEquipmentSelect
                                    entries={backpack}
                                    data={data}
                                    kind="DRIF"
                                    slotKey={slot.key}
                                    zone={`drif-${index}`}
                                    label={t("Drif {0} z plecaka", [t(index + 1)])}
                                    onEquip={equipBackpackEntry}
                                    getWarning={getBackpackEquipWarning}
                                />
                            )}
                        />
                    </div>
                </>
            )}
            {pickingItem && (
                <MobileItemPicker
                    openerRef={pickerOpener}
                    backpackContent={
                        <BackpackItemChoices
                            entries={backpack}
                            items={items}
                            data={data}
                            gameRules={gameRules}
                            slotKey={slot.key}
                            getWarning={getBackpackEquipWarning}
                            onSelect={(entryId) => {
                                if (equipBackpackEntry(entryId, slot.key)) onClosePicker();
                            }}
                        />
                    }
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
