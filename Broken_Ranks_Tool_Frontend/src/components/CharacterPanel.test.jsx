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

        await user.click(screen.getAllByRole("button", { name: "+" })[0]);
        expect(screen.getByText("+1 pkt")).toBeInTheDocument();
        expect(onStatsChange).toHaveBeenLastCalledWith(
            expect.objectContaining({ Siła: 11, PŻ: 200 }),
            expect.objectContaining({ level: 2, spentPoints: expect.objectContaining({ Siła: 1 }) })
        );

        await user.click(screen.getByRole("button", { name: "Zresetuj" }));
        expect(screen.queryByText("+1 pkt")).not.toBeInTheDocument();
    });

    it("imports bounded character data and removes excess points after lowering level", async () => {
        const user = userEvent.setup();
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

        await user.click(screen.getAllByRole("button", { name: "-" })[0]);
        expect(onStatsChange).toHaveBeenCalled();
    });
});
