import { describe, expect, it } from "vitest";
import english from "./en.json";
import { translate } from "./translation";
import { formatComparisonValue } from "../../features/builds/comparison/comparisonValues";
import { formatAverage } from "../../features/builds/comparison/comparisonPresentation";
import { formatPotentialValue } from "../../features/optimizer/optimizerDomain";

describe("interface messages", () => {
    it("translates reorganization source locations while preserving the stone name", () => {
        expect(translate("Siła · 16 lvl · Hełm, gniazdo 1", "en")).toBe(
            "Siła · level 16 · Helmet, socket 1"
        );
    });
    it("formats report and comparison numbers with the selected locale", () => {
        expect(formatComparisonValue(1234.5, "en-GB")).toBe("1,234.5");
        expect(formatComparisonValue(1234.5, "pl-PL")).toBe((1234.5).toLocaleString("pl-PL"));
        expect(formatAverage(12.5, "en-GB")).toBe("12.5");
        expect(formatPotentialValue(1234.5, "en-GB")).toBe("1,234.5%");
    });
    it("keeps Polish as default and interpolates parameters in either language", () => {
        expect(translate("Poziom {0}: {1}", "pl", [120, "Żmij"])).toBe("Poziom 120: Żmij");
        expect(translate("Poziom {0}: {1}", "en", [120, "Żmij"])).toBe("Level 120: Żmij");
        expect(translate("Zapisz lokalnie")).toBe("Zapisz lokalnie");
        expect(translate("unknown message", "en")).toBe("unknown message");
        expect(translate(null, "en")).toBeNull();
        expect(translate(120, "en")).toBe(120);
    });

    it("translates stored validation messages and nested errors without altering names", () => {
        expect(
            translate(
                "Nie udało się wczytać buildu: Wbudowane drify nie pasują do przedmiotu w slocie weapon.",
                "en"
            )
        ).toBe("Unable to load build: Built-in drifs do not match the item in slot weapon.");
        expect(translate("Zapisano lokalnie build „Siła”.", "en")).toBe(
            "Saved build “Siła” locally."
        );
        expect(translate("Kup i załóż: broń — Żmij (1★).", "en")).toBe(
            "Buy and equip: weapon — Żmij (1★)."
        );
        expect(
            translate("Przenieś SUBDRIF Band 1 z hełm, gniazdo 1 do broń, gniazdo 2", "en")
        ).toBe("Move SUBDRIF Band 1 from helmet, socket 1 to weapon, socket 2");
    });

    it("translates separate sentences, number strings and stat labels", () => {
        expect(
            translate(
                "Nie znaleziono poprawy przy wybranych ustawieniach. Sprawdź ochrony bonusów i dozwolone zmiany. Analizę zatrzymano; pokazano sprawdzone wyniki.",
                "en"
            )
        ).toBe(
            "No improvement found with these settings. Check bonus protections and allowed changes. Analysis stopped; checked results are shown."
        );
        expect(translate(" 1,25% ", "en")).toBe(" 1.25% ");
        expect(translate("Redukcja obrazen", "en")).toBe("Damage reduction");
        expect(translate("Dodaj punkt: {0}", "en", [translate("Siła", "en")])).toBe(
            "Add point: Strength"
        );
    });

    it("preserves every interpolation placeholder in the English catalogue", () => {
        for (const [source, target] of Object.entries(english)) {
            expect(source, source).toBe(source.trim());
            expect(target.trim(), source).not.toBe("");
            expect([...target.matchAll(/\{\d+\}/g)].map(([key]) => key).sort(), source).toEqual(
                [...source.matchAll(/\{\d+\}/g)].map(([key]) => key).sort()
            );
        }
    });
});
