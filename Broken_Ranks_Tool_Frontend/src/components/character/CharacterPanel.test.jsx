import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import CharacterPanel from "./CharacterPanel";

describe("CharacterPanel", () => {
    it("allocates and resets points after changing the level", async () => {
        const user = userEvent.setup();
        const onStatsChange = vi.fn();
        render(<CharacterPanel onStatsChange={onStatsChange} />);

        const level = screen.getByRole("spinbutton");
        fireEvent.change(level, { target: { value: "2" } });
        expect(screen.getByText("4 / 4")).toBeInTheDocument();

        await user.click(screen.getByRole("button", { name: "Dodaj punkt: Siła" }));
        expect(screen.getByText("+1 pkt")).toBeInTheDocument();
        expect(onStatsChange).toHaveBeenLastCalledWith(
            expect.objectContaining({ Siła: 11, PŻ: 200 }),
            expect.objectContaining({ level: 2, spentPoints: expect.objectContaining({ Siła: 1 }) })
        );

        await user.click(screen.getByRole("button", { name: "Zresetuj" }));
        expect(screen.queryByText("+1 pkt")).not.toBeInTheDocument();
    });

    it("imports bounded character data and removes excess points after lowering level", () => {
        const onStatsChange = vi.fn();
        const externalConfig = {
            level: 999,
            spentPoints: { Siła: 5, Zręczność: -2, Moc: 2 },
        };
        render(
            <CharacterPanel
                onStatsChange={onStatsChange}
                externalConfig={externalConfig}
                syncTrigger={1}
            />
        );

        const level = screen.getByRole("spinbutton");
        expect(level).toHaveValue(140);
        expect(screen.getByText("+5 pkt")).toBeInTheDocument();

        fireEvent.change(level, { target: { value: "1" } });
        expect(screen.getByText("0 / 0")).toBeInTheDocument();
        expect(screen.queryByText("+5 pkt")).not.toBeInTheDocument();

        expect(screen.getByRole("button", { name: "Odejmij punkt: Siła" })).toBeDisabled();
        expect(onStatsChange).toHaveBeenCalled();
    });

    it("renders the compact workspace controls with accessible stat actions", async () => {
        const user = userEvent.setup();
        const onStatsChange = vi.fn();
        render(<CharacterPanel compact onStatsChange={onStatsChange} />);

        fireEvent.change(screen.getByRole("spinbutton", { name: "Poziom postaci" }), {
            target: { value: "2" },
        });
        await user.click(screen.getByRole("button", { name: "Dodaj punkt: Siła" }));

        expect(screen.getByText("Pozostało")).toBeInTheDocument();
        expect(onStatsChange).toHaveBeenLastCalledWith(
            expect.objectContaining({ Siła: 11 }),
            expect.objectContaining({ level: 2 })
        );
    });

    it("changes compact character stats by ten points with one click", async () => {
        const user = userEvent.setup();
        render(<CharacterPanel compact onStatsChange={vi.fn()} />);

        fireEvent.change(screen.getByRole("spinbutton", { name: "Poziom postaci" }), {
            target: { value: "4" },
        });

        const addTen = screen.getByRole("button", { name: "Dodaj 10 punktów: Siła" });
        const subtractTen = screen.getByRole("button", { name: "Odejmij 10 punktów: Siła" });
        expect(addTen).toBeEnabled();
        expect(subtractTen).toBeDisabled();

        await user.click(addTen);
        expect(screen.getByText("20")).toBeInTheDocument();
        expect(subtractTen).toBeEnabled();

        await user.click(subtractTen);
        expect(screen.getAllByText("10").length).toBeGreaterThan(0);
        expect(subtractTen).toBeDisabled();
    });
});
