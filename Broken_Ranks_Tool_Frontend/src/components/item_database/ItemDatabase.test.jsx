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
