import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import BuiltInDrifSlots from "./BuiltInDrifSlots";

describe("BuiltInDrifSlots", () => {
    it("updates the selected level without changing other built-in drifs", async () => {
        const user = userEvent.setup();
        const onLevelsChange = vi.fn();
        render(
            <BuiltInDrifSlots
                drifs={[
                    { id: 1, bonusType: "A", displayName: "Krytyk" },
                    { id: 2, bonusType: "B", displayName: "Unik" },
                ]}
                levels={[3, 7]}
                onLevelsChange={onLevelsChange}
            />
        );

        await user.selectOptions(screen.getByLabelText("Poziom wbudowanego drifu Krytyk"), "5");
        expect(onLevelsChange).toHaveBeenCalledWith([5, 7]);
    });

    it("disables the level when the built-in drif has no matching template", () => {
        render(
            <BuiltInDrifSlots
                drifs={[{ id: null, bonusType: "UNKNOWN", displayName: "Nieznany" }]}
                levels={[1]}
                onLevelsChange={vi.fn()}
            />
        );

        expect(screen.getByLabelText("Poziom wbudowanego drifu Nieznany")).toBeDisabled();
    });
});
