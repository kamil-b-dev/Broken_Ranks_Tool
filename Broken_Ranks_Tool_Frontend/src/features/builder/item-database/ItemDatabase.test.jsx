import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import ItemDatabase from "./ItemDatabase";

const props = {
    items: [
        {
            id: 1,
            name: "Morana",
            category: "HELMET",
            tier: "X",
            rarity: "EPIC",
            stats: { Siła: 5 },
        },
        { id: 2, name: "Prosty hełm", category: "HELMET", tier: "I", rarity: "COMMON" },
    ],
    orbs: [
        {
            id: 10,
            name: "Orb ataku",
            bonusType: "ATTACK",
            category: "OFFENSIVE",
            tier: "I",
            value: 2,
        },
        {
            id: 11,
            name: "Orb ataku",
            bonusType: "ATTACK",
            category: "OFFENSIVE",
            tier: "II",
            value: 3,
        },
    ],
    drifs: [
        {
            id: 20,
            name: "Drif siły",
            bonusType: "STRENGTH",
            category: "OFFENSIVE",
            size: "SUBDRIF",
            value: 1,
        },
        {
            id: 21,
            name: "Drif siły",
            bonusType: "STRENGTH",
            category: "OFFENSIVE",
            size: "BIDRIF",
            value: 2,
        },
    ],
    categoryNames: { HELMET: "Hełmy" },
    orbCategories: { OFFENSIVE: "Ofensywne" },
    drifCategories: { OFFENSIVE: "Ofensywne" },
    gameRules: {
        bonusTranslations: { ATTACK: "Atak", STRENGTH: "Siła" },
        drifBasePowers: { STRENGTH: 2 },
    },
};

describe("ItemDatabase", () => {
    it("renders all matching items across categories without page navigation", () => {
        const items = Array.from({ length: 125 }, (_, index) => ({
            ...props.items[0],
            id: index + 100,
            name: `Przedmiot ${index}`,
            category: index < 70 ? "HELMET" : "BOOTS",
        }));
        render(<ItemDatabase {...props} items={items} />);
        expect(screen.getAllByRole("listitem")).toHaveLength(125);
        expect(
            screen.queryByRole("navigation", { name: "Strony bazy przedmiotów" })
        ).not.toBeInTheDocument();
        const dataTransfer = { setData: vi.fn() };
        fireEvent.dragStart(screen.getByText("Przedmiot 124").closest("li"), { dataTransfer });
        expect(JSON.parse(dataTransfer.setData.mock.calls[0][1]).id).toBe(224);
        fireEvent.change(screen.getByRole("textbox", { name: "Wyszukaj przedmioty" }), {
            target: { value: "^Przedmiot 124$" },
        });
        expect(screen.getAllByRole("listitem")).toHaveLength(1);
        expect(screen.getByText("Przedmiot 124")).toBeInTheDocument();
    });
    it("finds items by boss expressions and recovers from unfinished regex input", () => {
        render(
            <ItemDatabase
                {...props}
                items={[{ ...props.items[0], boss: "Tarul" }, props.items[1]]}
            />
        );
        const search = screen.getByRole("textbox", { name: "Wyszukaj przedmioty" });
        expect(search).toHaveAttribute("placeholder", "Nazwa przedmiotu lub bossa (regex)");
        fireEvent.change(search, { target: { value: "^TARUL$" } });
        expect(screen.getByText("Morana")).toBeInTheDocument();
        expect(screen.queryByText("Prosty hełm")).not.toBeInTheDocument();
        fireEvent.change(search, { target: { value: "[" } });
        expect(search).toHaveAttribute("aria-invalid", "true");
        expect(screen.getByRole("status")).toHaveTextContent("Szukam dosłownie wpisanego tekstu");
        fireEvent.change(search, { target: { value: "Morana|hełm" } });
        expect(search).toHaveAttribute("aria-invalid", "false");
        expect(screen.queryByRole("status")).not.toBeInTheDocument();
        expect(screen.getByText("Morana")).toBeInTheDocument();
        expect(screen.getByText("Prosty hełm")).toBeInTheDocument();
    });
    it("opens details on keyboard focus and closes them with Escape or blur", async () => {
        const user = userEvent.setup();
        render(<ItemDatabase {...props} />);
        const details = screen.getByRole("button", { name: "Szczegóły: Morana X" });
        fireEvent.focus(details);
        expect(screen.getByRole("tooltip")).toHaveTextContent("+5");
        expect(details).toHaveAttribute("aria-describedby", screen.getByRole("tooltip").id);
        fireEvent.keyDown(details, { key: "Escape" });
        expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
        await user.click(details);
        expect(screen.getByRole("tooltip")).toBeInTheDocument();
        await user.tab();
        expect(screen.queryByRole("tooltip")).not.toHaveTextContent("+5");
    });
    it("filters items and clears active filters", async () => {
        const user = userEvent.setup();
        render(<ItemDatabase {...props} />);

        expect(screen.getByText("Morana")).toBeInTheDocument();
        const search = screen.getByRole("textbox", { name: "Wyszukaj przedmioty" });
        expect(screen.getByRole("button", { name: "Przedmioty" })).toHaveAttribute(
            "aria-pressed",
            "true"
        );
        expect(
            screen.getByRole("combobox", { name: "Filtruj przedmioty według kategorii" })
        ).toBeInTheDocument();
        await user.type(search, "brak");
        expect(screen.queryByText("Morana")).not.toBeInTheDocument();
        await user.click(screen.getByRole("button", { name: "Wyczyść filtry" }));
        expect(screen.getByText("Morana")).toBeInTheDocument();

        const dataTransfer = { setData: vi.fn() };
        fireEvent.dragStart(screen.getByText("Morana").closest("li"), {
            dataTransfer,
        });
        expect(dataTransfer.setData).toHaveBeenCalled();
    });

    it("switches between orb and drif variants and applies their filters", async () => {
        const user = userEvent.setup();
        render(<ItemDatabase {...props} />);

        await user.click(screen.getByRole("button", { name: "Orby" }));
        expect(screen.getByRole("button", { name: "Orby" })).toHaveAttribute(
            "aria-pressed",
            "true"
        );
        expect(screen.getByText("Atak")).toBeInTheDocument();
        await user.selectOptions(
            screen.getByRole("combobox", { name: "Filtruj orby według kategorii" }),
            "OFFENSIVE"
        );

        await user.click(screen.getByRole("button", { name: "Drify" }));
        expect(screen.getByText("Siła")).toBeInTheDocument();
        const category = screen.getByRole("combobox", {
            name: "Filtruj drify według kategorii",
        });
        const basePower = screen.getByRole("spinbutton", {
            name: "Filtruj drify według mocy bazowej",
        });
        await user.selectOptions(category, "OFFENSIVE");
        fireEvent.change(basePower, { target: { value: "2" } });
        expect(screen.getByText("Siła")).toBeInTheDocument();
    });
});
