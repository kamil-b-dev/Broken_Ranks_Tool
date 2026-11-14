import { SLOTS } from "../../../shared/domain/equipment/equipmentSlots";
import { stoneLabel, statisticLabel } from "./buildPresentation";

/** Render a text card locally; no remote images or user data leave the browser. */
export const downloadBuildCard = async (record, data, t = (value) => value) => {
    const rows = SLOTS.flatMap(({ key, label }) => {
        const slot = record.payload.build.requestData.slots[key];
        if (slot?.synergetic)
            return [
                `${t(label)}: ${slot.synergetic.name}`,
                ...Object.entries(slot.synergetic.stats).map(
                    ([name, value]) => `   ${t(name)}: ${value}`
                ),
            ];
        if (!slot?.itemId) return [];
        const item = data.items.find((entry) => String(entry.id) === String(slot.itemId));
        const stones = (slot.drifIds || []).flatMap((id, index) => {
            const drif = data.drifs.find((entry) => String(entry.id) === String(id));
            return drif ? [stoneLabel(drif, slot.drifLevels?.[index] ?? 1)] : [];
        });
        const orbs = (slot.orbIds || []).flatMap((id, index) => {
            const orb = data.orbs.find((entry) => String(entry.id) === String(id));
            return orb ? [stoneLabel(orb, slot.orbLevels?.[index] ?? 1)] : [];
        });
        return [
            `${t(label || key)}: ${item?.name || slot.itemId} · ${slot.itemStars ?? 1}★`,
            ...[...orbs, ...stones].map((name) => `   ${name}`),
        ];
    });
    const statistics = Object.entries(record.stats || {}).map(
        ([name, value]) => `${statisticLabel(name, data, t)}: ${value}`
    );
    const lines = [record.name, "Broken Ranks Tool", "", ...rows, "", ...statistics];
    const canvas = document.createElement("canvas");
    canvas.width = 1000;
    canvas.height = 70 + lines.length * 30;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Przeglądarka nie obsługuje eksportu grafiki.");
    context.fillStyle = "#12100e";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.textBaseline = "top";
    lines.forEach((line, index) => {
        context.font = `${index === 0 ? "bold 28" : "20"}px Inter, sans-serif`;
        context.fillStyle = index === 0 ? "#d5ae69" : "#eee7da";
        context.fillText(line, 32, 28 + index * 30, 936);
    });
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
    if (!blob) throw new Error("Nie udało się utworzyć grafiki.");
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "broken-ranks-build.png";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
};
