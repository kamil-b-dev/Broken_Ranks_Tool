import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import HelpArticle from "./HelpArticle";
import { findHelpTopic } from "./helpContent";
import { LanguageContext } from "../../shared/i18n/LanguageContext";
import {
    calculateItemCapacity,
    calculateMaximumDrifSlots,
    getDrifMaxLevel,
    getOrbMaxLevel,
} from "../../shared/domain/equipment/equipmentRules";

afterEach(cleanup);

it("shows orb categories, rarity rules and size limits as tables", () => {
    render(<HelpArticle topic={findHelpTopic("orbs")} onSelect={vi.fn()} />);
    expect(screen.getAllByRole("table")).toHaveLength(5);
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
    const rarity = screen.getByRole("table", { name: "Orby według rzadkości" });
    const rarityRows = within(rarity).getAllByRole("row").slice(1);
    expect(
        within(rarityRows[0])
            .getAllByRole("cell")
            .map((cell) => cell.textContent)
    ).toEqual(["Według slotu", "Brak"]);
    expect(
        within(rarityRows[1])
            .getAllByRole("cell")
            .map((cell) => cell.textContent)
    ).toEqual(["Według slotu lub ofensywny", "Ofensywny"]);
    const limits = screen.getByRole("table", { name: "Rozmiar i poziom orba według tieru" });
    const rows = within(limits).getAllByRole("row").slice(1);
    const sizes = ["SUBORB", "BIORB", "MAGNIORB", "ARCYORB"];
    expect(rows).toHaveLength(sizes.length);
    rows.forEach((row, index) => {
        const cells = within(row).getAllByRole("cell");
        expect(cells[0].textContent.toUpperCase()).toBe(sizes[index]);
        expect(Number(cells[1].textContent)).toBe(getOrbMaxLevel(sizes[index]));
    });
    const starBonuses = screen.getByRole("table", { name: "Bonus orba z gwiazdek" });
    const starRows = within(starBonuses).getAllByRole("row").slice(1);
    expect(starRows).toHaveLength(9);
    expect(within(starRows[3]).getByRole("cell")).toHaveTextContent("+5%");
    expect(within(starRows[8]).getByRole("cell")).toHaveTextContent("+75%");
});

it("translates the orb category and rule tables", () => {
    render(
        <LanguageContext.Provider value={{ language: "en", setLanguage: vi.fn() }}>
            <HelpArticle topic={findHelpTopic("orbs")} onSelect={vi.fn()} />
        </LanguageContext.Provider>
    );
    const categories = screen.getByRole("table", { name: "Orb categories by slot" });
    expect(
        within(categories).getByRole("rowheader", { name: "Helmet, armor, pants, boots" })
    ).toBeVisible();
    const rules = screen.getByRole("table", { name: "Orb rules" });
    expect(within(rules).getByRole("cell", { name: "Once in the entire setup" })).toBeVisible();
});

it("places drif tier limits in the third capacity step", () => {
    const { container } = render(
        <HelpArticle topic={findHelpTopic("capacity")} onSelect={vi.fn()} />
    );
    const steps = screen.getAllByRole("listitem");
    expect(steps).toHaveLength(4);
    expect(steps[0]).toHaveTextContent(
        "Suma potęg wszystkich zwykłych drifów musi mieścić się w pojemności przedmiotu."
    );
    expect(container.querySelector(".help-intro")).not.toBeInTheDocument();
    const table = within(steps[2]).getByRole("table", {
        name: "Rozmiar i poziom drifa według tieru",
    });
    const rows = within(table).getAllByRole("row").slice(1);
    const sizes = ["SUBDRIF", "BIDRIF", "MAGNIDRIF", "ARCYDRIF"];
    expect(rows).toHaveLength(sizes.length);
    rows.forEach((row, index) => {
        const cells = within(row).getAllByRole("cell");
        expect(cells[0].textContent.toUpperCase()).toBe(sizes[index]);
        expect(Number(cells[1].textContent)).toBe(getDrifMaxLevel(sizes[index]));
    });
});

it("shows star bonuses and socket thresholds consistent with equipment rules", () => {
    render(<HelpArticle topic={findHelpTopic("stars")} onSelect={vi.fn()} />);
    const bonuses = screen.getByRole("table", { name: "Bonusy za gwiazdki" });
    expect(within(bonuses).getByRole("columnheader", { name: "Gwiazdki" })).toHaveAttribute(
        "aria-label",
        "Gwiazdki"
    );
    const rows = within(bonuses).getAllByRole("row").slice(1);
    expect(rows).toHaveLength(9);
    rows.forEach((row, index) => {
        const capacity = within(row).getAllByRole("cell").at(-1).textContent;
        expect(Number(capacity)).toBe(calculateItemCapacity({ capacity: 10 }, index + 1) - 10);
    });
    const values = (row) =>
        within(row)
            .getAllByRole("cell")
            .map((cell) => cell.textContent);
    expect(values(rows[3])).toEqual(["+10%", "+5%", "+0%", "0"]);
    expect(values(rows[6])).toEqual(["+25%", "+30%", "+3%", "+1"]);
    expect(values(rows[8])).toEqual(["+50%", "+75%", "+15%", "+4"]);
    const sockets = screen.getByRole("table", { name: "Liczba zwykłych gniazd drifów" });
    const tierRows = within(sockets).getAllByRole("row").slice(1);
    [1, 2, 4, 7, 10].forEach((tier, index) => {
        expect(values(tierRows[index]).map(Number)).toEqual(
            [6, 7].map((stars) =>
                calculateMaximumDrifSlots({ hasItem: true, isEpicOrSet: false, tier, stars })
            )
        );
    });
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
});

it("labels keyboard-accessible table regions and translates table text", () => {
    render(
        <LanguageContext.Provider value={{ language: "en", setLanguage: vi.fn() }}>
            <HelpArticle topic={findHelpTopic("stars")} onSelect={vi.fn()} />
        </LanguageContext.Provider>
    );
    for (const name of ["Star bonuses", "Ordinary drif socket counts"]) {
        const region = screen.getByRole("region", { name });
        expect(region).toHaveAttribute("tabindex", "0");
        expect(within(region).getByRole("table", { name })).toBeVisible();
    }
});
