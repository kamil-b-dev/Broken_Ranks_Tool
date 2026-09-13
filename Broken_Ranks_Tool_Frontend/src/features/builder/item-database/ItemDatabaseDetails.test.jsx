import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import ItemDatabaseResults from "./ItemDatabaseResults";
import ItemDatabaseTooltip from "./ItemDatabaseTooltip";

describe("ItemDatabaseResults", () => {
    it("renders item rows and forwards drag and hover events", () => {
        const onDragStart = vi.fn();
        const onHover = vi.fn();
        const onLeave = vi.fn();
        const item = { id: 1, name: "Korona", rarity: "EPIC", tier: "X", reqLevel: 140 };
        render(
            <ItemDatabaseResults
                groups={{ Hełmy: [item] }}
                activeTab="items"
                bonusTranslations={{}}
                onDragStart={onDragStart}
                onHover={onHover}
                onLeave={onLeave}
                onClearFilters={vi.fn()}
            />
        );

        const row = screen.getByText("Korona").closest("li");
        fireEvent.dragStart(row);
        fireEvent.mouseMove(row);
        fireEvent.mouseLeave(row);

        expect(screen.getByText("Lvl 140")).toBeInTheDocument();
        expect(onDragStart).toHaveBeenCalledWith(expect.anything(), item, "items");
        expect(onHover).toHaveBeenCalledWith(expect.anything(), item, "items");
        expect(onLeave).toHaveBeenCalled();
    });

    it("renders grouped orb variants and their translated bonus", () => {
        const onDragStart = vi.fn();
        const orb = {
            id: 2,
            name: "Orb szczęścia",
            size: "SUBORB",
            bonusType: "EXTRA_GOLD",
            category: "UTILITY",
        };
        render(
            <ItemDatabaseResults
                groups={{ Użytkowe: [[orb, { ...orb, id: 3, size: "BIDORB" }]] }}
                activeTab="orbs"
                bonusTranslations={{ EXTRA_GOLD: "Dodatkowe złoto" }}
                onDragStart={onDragStart}
                onHover={vi.fn()}
                onLeave={vi.fn()}
                onClearFilters={vi.fn()}
            />
        );

        expect(screen.getByText("Dodatkowe złoto")).toBeInTheDocument();
        const variant = screen.getByTitle("SUBORB");
        fireEvent.dragStart(variant);
        expect(onDragStart).toHaveBeenCalledWith(expect.anything(), orb, "orbs");
    });

    it("offers resetting filters for an empty result", async () => {
        const user = userEvent.setup();
        const onClearFilters = vi.fn();
        render(
            <ItemDatabaseResults
                groups={{}}
                activeTab="items"
                bonusTranslations={{}}
                onDragStart={vi.fn()}
                onHover={vi.fn()}
                onLeave={vi.fn()}
                onClearFilters={onClearFilters}
            />
        );

        await user.click(screen.getByRole("button", { name: "Zresetuj filtry" }));
        expect(onClearFilters).toHaveBeenCalledOnce();
    });
});

describe("ItemDatabaseTooltip", () => {
    const renderTooltip = (item, type) =>
        render(
            <ItemDatabaseTooltip
                tooltip={{ show: true, item, type, x: 10, y: 20 }}
                bonusTranslations={{ DAMAGE_FIRE: "Obrażenia od ognia" }}
                drifBasePowers={{ DAMAGE_FIRE: 3 }}
            />
        );

    it("stays hidden without a selected record", () => {
        const { container } = render(
            <ItemDatabaseTooltip
                tooltip={{ show: false, item: null }}
                bonusTranslations={{}}
                drifBasePowers={{}}
            />
        );
        expect(container).toBeEmptyDOMElement();
    });

    it("shows item stats and the empty-stats fallback", () => {
        const { rerender } = renderTooltip(
            { name: "Korona", rarity: "EPIC", tier: "X", stats: { Siła: 12 } },
            "items"
        );
        expect(screen.getByText("+12")).toBeInTheDocument();

        rerender(
            <ItemDatabaseTooltip
                tooltip={{ show: true, item: { name: "Pusty", stats: {} }, type: "items" }}
                bonusTranslations={{}}
                drifBasePowers={{}}
            />
        );
        expect(screen.getByText("Brak statystyk bazowych.")).toBeInTheDocument();
    });

    it("shows drif power details and doubled arcydrif increment", () => {
        renderTooltip(
            {
                name: "Astah",
                size: "ARCYDRIF",
                bonusType: "DAMAGE_FIRE",
                baseValue: "3",
                increment: "1.5",
            },
            "drifs"
        );

        expect(screen.getByText("Obrażenia od ognia")).toBeInTheDocument();
        expect(screen.getByText("3 pkt")).toBeInTheDocument();
        expect(screen.getByText(/przyrost x2 \(3\)/i)).toBeInTheDocument();
        expect(screen.getByText("x4")).toBeInTheDocument();
    });

    it("shows all three orb levels", () => {
        renderTooltip(
            {
                name: "Orb szczęścia",
                size: "BIDORB",
                bonusType: "EXTRA_GOLD",
                bonusLvl1: "1%",
                bonusLvl2: "2%",
                bonusLvl3: "3%",
            },
            "orbs"
        );

        expect(screen.getByText("1%")).toBeInTheDocument();
        expect(screen.getByText("2%")).toBeInTheDocument();
        expect(screen.getByText("3%")).toBeInTheDocument();
    });
});
