import { describe, expect, it } from "vitest";
import { createOptimizerLabels } from "./optimizerLabels";

const rules = {
    bonusTranslations: {
        DAMAGE_MAGIC: "Modyfikator obrażeń magicznych",
        CRITICAL_CHANCE: "Szansa na krytyk",
        ARMOR: "Pancerz",
        MANA_USAGE_REDUCTION: "Redukcja kosztu many",
    },
};
const drifs = [
    { name: "Abaf", bonusType: "DAMAGE_MAGIC", size: "ARCYDRIF" },
    { name: "Abaf", bonusType: "DAMAGE_MAGIC", size: "SUBDRIF" },
    { name: "Band", bonusType: "CRITICAL_CHANCE", size: "SUBDRIF" },
    { name: "Teld", bonusType: "MANA_USAGE_REDUCTION", size: "BIDRIF" },
];
describe("optimizer display names", () => {
    it("keeps the existing descriptions and messages by default", () => {
        const labels = createOptimizerLabels(rules, drifs);
        expect(labels.getName("DAMAGE_MAGIC")).toBe("Modyfikator obrażeń magicznych");
        expect(labels.getName("DAMAGE_MAGIC", "Obrażenia magiczne")).toBe("Obrażenia magiczne");
        expect(labels.formatText("Szansa na krytyk: 59% z 60%; brakuje 1 p.p.")).toBe(
            "Szansa na krytyk: 59% z 60%; brakuje 1 p.p."
        );
    });
    it("uses catalog names while keeping unavailable modifiers readable", () => {
        const labels = createOptimizerLabels(rules, drifs, "DRIFS");
        expect(labels.getName("DAMAGE_MAGIC")).toBe("Abaf");
        expect(labels.getName("ARMOR", "Pancerz")).toBe("Pancerz");
        expect(labels.getName("UNKNOWN", "Nieznany bonus")).toBe("Nieznany bonus");
        expect(labels.getName("UNKNOWN")).toBe("UNKNOWN");
    });
    it("relabels warnings, variant names and advisor sentences without changing numbers or partial words", () => {
        const labels = createOptimizerLabels(rules, drifs, "DRIFS");
        expect(labels.formatText("Szansa na krytyk: 59,45% z 60%; brakuje 0,55 p.p.")).toBe(
            "Band: 59,45% z 60%; brakuje 0,55 p.p."
        );
        expect(labels.formatText("Najlepszy plan: MODYFIKATOR OBRAŻEŃ MAGICZNYCH.")).toBe(
            "Najlepszy plan: Abaf."
        );
        expect(labels.formatText("Redukcja zużycia many: 50% z 60%.")).toBe("Teld: 50% z 60%.");
        expect(labels.formatText("Przenieś SUBDRIF Band 6.")).toBe("Przenieś SUBDRIF Band 6.");
        expect(labels.formatText("Przedmodyfikator obrażeń magicznychowy")).toBe(
            "Przedmodyfikator obrażeń magicznychowy"
        );
        expect(labels.formatText(undefined)).toBeUndefined();
    });
    it("escapes punctuation and avoids guessing ambiguous or empty catalog names", () => {
        const labels = createOptimizerLabels(
            { bonusTranslations: { A: "Bonus (+)", B: "Wspólny", C: "Wspólny", D: "Pusty" } },
            [
                { bonusType: "A", name: "Kamień A" },
                { bonusType: "B", name: "Kamień B" },
                { bonusType: "C", name: "Kamień C" },
                { bonusType: "D", name: " " },
            ],
            "DRIFS"
        );
        expect(labels.formatText("Bonus (+): 5%; Wspólny: 7%; Pusty: 2%.")).toBe(
            "Kamień A: 5%; Wspólny: 7%; Pusty: 2%."
        );
        expect(labels.getName("D")).toBe("Pusty");
    });
    it("chooses names deterministically regardless of catalog order", () => {
        expect(createOptimizerLabels(rules, drifs, "DRIFS").getName("DAMAGE_MAGIC")).toBe(
            createOptimizerLabels(rules, [...drifs].reverse(), "DRIFS").getName("DAMAGE_MAGIC")
        );
    });
});
