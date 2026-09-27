import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import SimpleProfileGoalsPanel from "./SimpleProfileGoalsPanel";

describe("SimpleProfileGoalsPanel", () => {
    it("selects the profession in the profile configuration box", async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();
        render(
            <SimpleProfileGoalsPanel
                settings={{ simpleProfile: "BARBARIAN", simpleOptions: {} }}
                onChange={onChange}
            />
        );

        await user.selectOptions(
            screen.getByRole("combobox", { name: /Profil prostego/i }),
            "FIRE_MAGE"
        );

        expect(onChange).toHaveBeenCalledWith(
            expect.objectContaining({
                simpleProfile: "FIRE_MAGE",
                simpleOptions: expect.objectContaining({ damageDrifs: 7, accuracyDrifs: 6 }),
            })
        );
    });

    it("updates profession quantities and optional defenses", async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();
        const settings = {
            simpleProfile: "ARCHER",
            simpleOptions: { damageDrifs: 7, accuracyDrifs: 7 },
        };
        render(<SimpleProfileGoalsPanel settings={settings} onChange={onChange} />);

        fireEvent.change(screen.getByRole("spinbutton", { name: /Drify obrażeń/i }), {
            target: { value: "9" },
        });
        await user.click(screen.getByRole("checkbox", { name: /Holm/i }));
        await user.click(screen.getByRole("checkbox", { name: /Farid/i }));

        expect(onChange).toHaveBeenCalledWith(
            expect.objectContaining({ simpleOptions: expect.objectContaining({ damageDrifs: 9 }) })
        );
        expect(onChange).toHaveBeenCalledWith(
            expect.objectContaining({
                simpleOptions: expect.objectContaining({ damageReductionChance: true }),
            })
        );
        expect(onChange).toHaveBeenCalledWith(
            expect.objectContaining({
                simpleOptions: expect.objectContaining({ dodgeChance: true }),
            })
        );
    });

    it("shows style and element only for professions that support them", () => {
        const onChange = vi.fn();
        const { rerender } = render(
            <SimpleProfileGoalsPanel
                settings={{ simpleProfile: "DRUID", simpleOptions: { style: "DEFENSIVE" } }}
                onChange={onChange}
            />
        );
        expect(screen.getByRole("combobox", { name: "Styl buildu" })).toHaveValue("DEFENSIVE");
        expect(screen.queryByRole("combobox", { name: "Żywioł broni" })).not.toBeInTheDocument();

        rerender(
            <SimpleProfileGoalsPanel
                settings={{ simpleProfile: "SHEED", simpleOptions: { element: "NONE" } }}
                onChange={onChange}
            />
        );
        expect(screen.getByRole("combobox", { name: "Żywioł broni" })).toHaveValue("NONE");
        expect(screen.queryByRole("combobox", { name: "Styl buildu" })).not.toBeInTheDocument();
    });
});
