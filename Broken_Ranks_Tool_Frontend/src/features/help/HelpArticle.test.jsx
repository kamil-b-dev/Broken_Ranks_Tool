import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import HelpArticle from "./HelpArticle";
import { findHelpTopic } from "./helpContent";
import { HELP_SCREENSHOTS } from "./content/screenshots";
import { LanguageContext } from "../../shared/i18n/LanguageContext";
import {
    calculateItemCapacity,
    calculateMaximumDrifSlots,
    getDrifMaxLevel,
    getOrbMaxLevel,
} from "../../shared/domain/equipment/equipmentRules";

afterEach(cleanup);

it.each(["pl", "en"])(
    "renders every illustrated topic in %s without visible captions",
    (language) => {
        for (const [id, screenshots] of Object.entries(HELP_SCREENSHOTS)) {
            const topic = findHelpTopic(id);
            expect(topic.id).toBe(id);
            const { container, unmount } = render(
                <LanguageContext.Provider value={{ language, setLanguage: vi.fn() }}>
                    <HelpArticle topic={topic} onSelect={vi.fn()} />
                </LanguageContext.Provider>
            );
            expect(screen.getAllByRole("img")).toHaveLength(screenshots.length);
            for (const screenshot of screenshots) {
                const source = screenshot.sources[language];
                expect(source.src).toContain(`${screenshot.id}-${language}.webp`);
                expect(source.src).not.toMatch(/^data:/);
                expect(source.width).toBeGreaterThan(0);
                expect(source.height).toBeGreaterThan(0);
                const step =
                    container.querySelectorAll(".help-article > ol > li")[screenshot.afterStep - 1];
                const image = within(step).getByRole("img");
                expect(image).toHaveAttribute("src", source.src);
                expect(image).toHaveAttribute("alt", expect.any(String));
                expect(image.getAttribute("alt")).not.toBe("");
                expect(image).toHaveAttribute("width", String(source.width));
                expect(image).toHaveAttribute("height", String(source.height));
                expect(image.closest("figure").textContent).toBe("");
            }
            expect(container.querySelector(".help-screenshot figcaption")).toBeNull();
            unmount();
        }
    }
);

it("illustrates the relevant step and switches the screenshot with the guide language", () => {
    const topic = findHelpTopic("builder");
    const { rerender } = render(<HelpArticle topic={topic} onSelect={vi.fn()} />);
    const image = screen.getByRole("img", { name: /Edytor przedmiotu/ });
    expect(within(screen.getAllByRole("listitem")[2]).getByRole("img")).toBe(image);
    expect(image).toHaveAttribute("loading", "lazy");
    expect(image).toHaveAttribute("src", expect.stringContaining("equipment-pl.webp"));
    const link = screen.getByRole("link", { name: /Powiększ zrzut:.*nowa karta/ });
    expect(link).toHaveAttribute("href", image.getAttribute("src"));
    expect(link).toHaveAttribute("target", "_blank");
    rerender(
        <LanguageContext.Provider value={{ language: "en", setLanguage: vi.fn() }}>
            <HelpArticle topic={topic} onSelect={vi.fn()} />
        </LanguageContext.Provider>
    );
    expect(screen.getByRole("img", { name: /Item editor/ })).toHaveAttribute(
        "src",
        expect.stringContaining("equipment-en.webp")
    );
    expect(screen.getByRole("link", { name: /Enlarge screenshot:.*new tab/ })).toHaveAttribute(
        "href",
        screen.getByRole("img").getAttribute("src")
    );
    rerender(<HelpArticle topic={findHelpTopic("stars")} onSelect={vi.fn()} />);
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
});

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
