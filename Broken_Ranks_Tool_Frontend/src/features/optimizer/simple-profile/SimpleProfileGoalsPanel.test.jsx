import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import SimpleProfileGoalsPanel from "./SimpleProfileGoalsPanel";

describe("SimpleProfileGoalsPanel", () => {
    it("adds, removes and weights build aspects", async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();
        const settings = { simpleAspects: { DAMAGE: "IMPORTANT" } };
        const { rerender } = render(
            <SimpleProfileGoalsPanel settings={settings} onChange={onChange} />
        );

        await user.click(screen.getByRole("checkbox", { name: /Przeżywalność/i }));
        expect(onChange).toHaveBeenCalledWith(
            expect.objectContaining({
                simpleAspects: { DAMAGE: "IMPORTANT", SURVIVABILITY: "IMPORTANT" },
            })
        );

        rerender(
            <SimpleProfileGoalsPanel
                settings={{ simpleAspects: { DAMAGE: "IMPORTANT", SURVIVABILITY: "IMPORTANT" } }}
                onChange={onChange}
            />
        );
        await user.selectOptions(
            screen.getByRole("combobox", { name: /Znaczenie: Przeżywalność/i }),
            "KEY"
        );
        expect(onChange).toHaveBeenLastCalledWith(
            expect.objectContaining({
                simpleAspects: { DAMAGE: "IMPORTANT", SURVIVABILITY: "KEY" },
            })
        );
    });
});
