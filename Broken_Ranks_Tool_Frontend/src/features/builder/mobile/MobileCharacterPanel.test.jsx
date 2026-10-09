import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, it, vi } from "vitest";
import { useEquipmentSetup } from "../../../shared/state/EquipmentContext";
import MobileCharacterPanel from "./MobileCharacterPanel";

vi.mock("../../../shared/state/EquipmentContext", () => ({ useEquipmentSetup: vi.fn() }));
const update = vi.fn();
beforeEach(() => {
    vi.clearAllMocks();
    useEquipmentSetup.mockReturnValue({
        requestData: { characterStats: {} },
        characterConfig: { level: 140, spentPoints: { Siła: 5 } },
        optimizationTrigger: 0,
        handleCharacterStatsUpdate: update,
    });
});
it("keeps numeric drafts local, cancels them and commits with Enter", async () => {
    const user = userEvent.setup();
    render(<MobileCharacterPanel />);
    const input = screen.getByLabelText("Poziom postaci");
    await user.clear(input);
    await user.type(input, "1{Escape}");
    expect(input).toHaveValue(140);
    expect(update).not.toHaveBeenCalled();
    await user.clear(input);
    await user.type(input, "100{Enter}");
    expect(update).toHaveBeenLastCalledWith(
        expect.objectContaining({ Siła: 15 }),
        expect.objectContaining({ level: 100 })
    );
});
it("trims points only when a lower level is committed", async () => {
    const user = userEvent.setup();
    render(<MobileCharacterPanel />);
    const input = screen.getByLabelText("Poziom postaci");
    await user.clear(input);
    await user.type(input, "1");
    expect(update).not.toHaveBeenCalled();
    await user.tab();
    expect(update).toHaveBeenLastCalledWith(
        expect.objectContaining({ Siła: 10 }),
        expect.objectContaining({ level: 1 })
    );
    expect(screen.getByRole("button", { name: "Odejmij punkt: Siła" })).toBeDisabled();
});
