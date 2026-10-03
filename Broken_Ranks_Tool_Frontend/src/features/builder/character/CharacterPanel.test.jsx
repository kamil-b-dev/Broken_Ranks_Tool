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

    it("changes the compact character level with permanently visible controls", async () => {
        const user = userEvent.setup();
        render(<CharacterPanel compact onStatsChange={vi.fn()} />);

        const decrease = screen.getByRole("button", { name: "Zmniejsz poziom postaci" });
        const increase = screen.getByRole("button", { name: "Zwiększ poziom postaci" });
        const level = screen.getByRole("spinbutton", { name: "Poziom postaci" });

        expect(level).toHaveValue(1);
        expect(decrease).toBeDisabled();
        await user.click(increase);
        expect(level).toHaveValue(2);
        expect(decrease).toBeEnabled();
        await user.click(decrease);
        expect(level).toHaveValue(1);
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
    it("does not overwrite existing character stats on mount or import synchronization", () => {
        const onStatsChange = vi.fn();
        const { rerender } = render(
            <CharacterPanel
                onStatsChange={onStatsChange}
                externalStats={{ Siła: 120 }}
                syncTrigger={1}
            />
        );
        expect(onStatsChange).not.toHaveBeenCalled();
        rerender(
            <CharacterPanel
                onStatsChange={onStatsChange}
                externalStats={{ Siła: 20 }}
                externalConfig={{ level: 10, spentPoints: { Siła: 10 } }}
                syncTrigger={2}
            />
        );
        expect(screen.getByRole("spinbutton")).toHaveValue(10);
        expect(screen.getByText("+10 pkt")).toBeInTheDocument();
        expect(onStatsChange).not.toHaveBeenCalled();
        fireEvent.change(screen.getByRole("spinbutton"), { target: { value: "11" } });
        expect(onStatsChange).toHaveBeenLastCalledWith(
            expect.objectContaining({ Siła: 20 }),
            expect.objectContaining({ level: 11 })
        );
    });

    it("starts from saved allocation without publishing a temporary level-one build", () => {
        const onStatsChange = vi.fn();
        render(
            <CharacterPanel
                onStatsChange={onStatsChange}
                externalConfig={{ level: 20, spentPoints: { Siła: 12 } }}
            />
        );
        expect(screen.getByRole("spinbutton")).toHaveValue(20);
        expect(screen.getByText("+12 pkt")).toBeInTheDocument();
        expect(onStatsChange).not.toHaveBeenCalled();
    });
});
