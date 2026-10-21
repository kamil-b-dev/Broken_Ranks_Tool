import { describe, expect, it } from "vitest";
import { translate } from "../../shared/i18n/translation";
import { createProgressionView } from "./progressionReport";
import { legendReport, reportData } from "./progressionReport.fixtures";
import {
    progressionInstructions,
    replacedStone,
    stoneActionContext,
    stonePositionName,
} from "./progressionStoneActions";

const t = (source, parameters) => translate(source, "pl", parameters);
const en = (source, parameters) => translate(source, "en", parameters);
const helmet = { slot: "helmet", socketIndex: 0 };
const weapon = { slot: "weapon", socketIndex: 0 };
const data = {
    items: [
        { id: 10, name: "Martumal" },
        { id: 11, name: "Khalam" },
        { id: 12, name: "Tężec" },
    ],
    drifs: [
        { id: 1, name: "Ling", size: "SUBDRIF" },
        { id: 2, name: "Abaf", size: "SUBDRIF" },
        { id: 3, name: "Ling", size: "BIDRIF" },
    ],
    orbs: [],
};
const equipment = (itemId, drifId = 1, level = 6) => ({
    slots: {
        helmet: { itemId, itemStars: 1, drifIds: [drifId], drifLevels: { 0: level } },
        weapon: { itemId: 12, itemStars: 1, drifIds: [1], drifLevels: { 0: 6 } },
    },
});
const move = (instanceId, from, to, templateId = 1, level = 6) => ({
    type: "MOVE",
    instanceId,
    from,
    to,
    templateId,
    level,
});
const group = (before, after, actions) => {
    const result = { stage: { equipment: after }, actions, orbActions: [], equipmentChanges: [] };
    return { before, final: result, steps: [{ before, result }] };
};

describe("named stone operations", () => {
    it("names the old and new item when transferring the same stone during replacement", () => {
        const report = group(equipment(10), equipment(11), [
            move("internal:4", helmet, null),
            move("internal:4", null, helmet),
        ]);
        const original = structuredClone(report);
        expect(progressionInstructions(report, data, t)).toEqual([
            "Wyjmij Ling (subdrif, poz. 6) z przedmiotu Martumal (Hełm, gniazdo 1).",
            "Włóż Ling (subdrif, poz. 6) do przedmiotu Khalam (Hełm, gniazdo 1).",
        ]);
        expect(report).toEqual(original);
    });

    it("describes which stone replaces which in the same item", () => {
        const arrival = move("new", null, helmet, 2);
        const report = group(equipment(11), equipment(11, 2), [
            move("old", helmet, null),
            { type: "ACQUIRE", instanceId: "new", templateId: 2, level: 6 },
            arrival,
        ]);
        expect(replacedStone(arrival, "drif", report, data)).toEqual({ templateId: 1, level: 6 });
        expect(progressionInstructions(report, data, t).at(-1)).toBe(
            "Zamień Ling (subdrif, poz. 6) na Abaf (subdrif, poz. 6) w przedmiocie Khalam (Hełm, gniazdo 1)."
        );
    });

    it("keeps a physical stone's size and level upgrade distinct from replacement", () => {
        const upgrade = {
            type: "UPGRADE",
            instanceId: "same",
            beforeTemplateId: 1,
            beforeLevel: 6,
            templateId: 3,
            level: 11,
        };
        const arrival = move("same", null, helmet, 3, 11);
        const report = group(equipment(11), equipment(11, 3, 11), [
            move("same", helmet, null),
            upgrade,
            arrival,
        ]);
        expect(replacedStone(arrival, "drif", report, data)).toBeNull();
        expect(stoneActionContext(upgrade, "drif", report, data, t)).toBe(
            "Do przedmiotu: Khalam (Hełm, gniazdo 1)"
        );
        expect(progressionInstructions(report, data, t)[1]).toBe(
            "Ulepsz Ling (subdrif, poz. 6) → Ling (bidrif, poz. 11). Do przedmiotu: Khalam (Hełm, gniazdo 1)"
        );
        expect(progressionInstructions(report, data, t).join(" ")).not.toContain("Zamień");
    });

    it("distinguishes identical drifs by their source items without invented numbers", () => {
        const report = group(equipment(10), equipment(11), [
            move("one", helmet, null),
            move("two", weapon, null),
        ]);
        expect(
            stoneActionContext(report.steps[0].result.actions[0], "drif", report, data, t)
        ).toContain("Martumal (Hełm");
        expect(
            stoneActionContext(report.steps[0].result.actions[1], "drif", report, data, t)
        ).toContain("Tężec (Broń");
        expect(progressionInstructions(report, data, t).join(" ")).not.toMatch(
            /Drif \d|internal:|one|two/
        );
    });

    it("distinguishes the two ring slots even when the item and socket are identical", () => {
        const rings = { slots: { ring1: { itemId: 10 }, ring2: { itemId: 10 } } };
        expect(stonePositionName({ slot: "ring1", socketIndex: 0 }, rings, data, t)).toBe(
            "Martumal (Pierścień 1, gniazdo 1)"
        );
        expect(stonePositionName({ slot: "ring2", socketIndex: 0 }, rings, data, t)).toBe(
            "Martumal (Pierścień 2, gniazdo 1)"
        );
    });

    it("uses each intermediate snapshot when an epic turns into a legend at one level", () => {
        const report = createProgressionView(legendReport(), reportData).groups[1];
        const instructions = progressionInstructions(report, reportData, t);
        expect(instructions).toContain(
            "Wyjmij Czuf (magniorb, poz. 3) z przedmiotu Żmij · epik (Broń, gniazdo 1)."
        );
        expect(instructions).toContain(
            "Włóż Czuf (magniorb, poz. 3) do przedmiotu Żmij · legenda (Broń, gniazdo 1)."
        );
        expect(instructions.indexOf("Ulepsz epik Żmij do 9★.")).toBeLessThan(
            instructions.indexOf("Ulepsz epik Żmij (9★) do legendy (1★).")
        );
    });

    it("translates complete instructions and slot names while preserving item and stone names", () => {
        const report = group(equipment(10), equipment(11), [
            move("x", helmet, null),
            move("x", null, helmet),
        ]);
        expect(progressionInstructions(report, data, en)).toEqual([
            "Remove Ling (subdrif, lvl 6) from item Martumal (Helmet, socket 1).",
            "Insert Ling (subdrif, lvl 6) into item Khalam (Helmet, socket 1).",
        ]);
    });

    it("describes a direct transfer with its source and destination", () => {
        const report = group(equipment(10), equipment(11), [move("x", helmet, weapon)]);
        expect(progressionInstructions(report, data, t)).toEqual([
            "Przenieś Ling (subdrif, poz. 6) z przedmiotu Martumal (Hełm, gniazdo 1) do przedmiotu Tężec (Broń, gniazdo 1).",
        ]);
    });
});
