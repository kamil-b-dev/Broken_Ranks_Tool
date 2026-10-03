import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import SimpleProfileGoalsPanel from "./SimpleProfileGoalsPanel";
import { defaultSimpleOptions, normalizeSimpleOptions } from "./simpleProfileDefinitions";

describe("SimpleProfileGoalsPanel", () => {
    it.each(["KNIGHT", "DRUID"])(
        "uses defensive defaults for %s in imports and the form",
        (profile) => {
            const options = normalizeSimpleOptions({ style: "DEFENSIVE" }, profile);
            expect(options).toMatchObject({
                damageDrifs: 4,
                accuracyDrifs: 4,
                passiveDamageReduction: true,
            });
            expect(
                normalizeSimpleOptions(
                    { style: "DEFENSIVE", passiveDamageReduction: false, damageDrifs: 10 },
                    profile
                )
            ).toMatchObject({ damageDrifs: 10, accuracyDrifs: 4, passiveDamageReduction: false });
            render(
                <SimpleProfileGoalsPanel
                    settings={{ simpleProfile: profile, simpleOptions: { style: "DEFENSIVE" } }}
                    onChange={vi.fn()}
                />
            );
            expect(screen.getByRole("spinbutton", { name: /Drify obrażeń/i })).toHaveValue(4);
            expect(screen.getByRole("spinbutton", { name: /Drify celności/i })).toHaveValue(4);
            expect(
                screen.getByRole("checkbox", { name: /Redukcja obrażeń biernych/i })
            ).toBeChecked();
        }
    );

    it.each(["KNIGHT", "DRUID"])(
        "updates defaults on a style change for %s and preserves custom quantities",
        (profile) => {
            const onChange = vi.fn();
            const { rerender } = render(
                <SimpleProfileGoalsPanel
                    settings={{
                        simpleProfile: profile,
                        simpleOptions: defaultSimpleOptions(profile),
                    }}
                    onChange={onChange}
                />
            );
            fireEvent.change(screen.getByRole("combobox", { name: "Styl buildu" }), {
                target: { value: "DEFENSIVE" },
            });
            expect(onChange.mock.lastCall[0].simpleOptions).toMatchObject({
                style: "DEFENSIVE",
                damageDrifs: 4,
                accuracyDrifs: 4,
            });
            rerender(
                <SimpleProfileGoalsPanel settings={onChange.mock.lastCall[0]} onChange={onChange} />
            );
            fireEvent.change(screen.getByRole("combobox", { name: "Styl buildu" }), {
                target: { value: "OFFENSIVE" },
            });
            expect(onChange.mock.lastCall[0].simpleOptions).toMatchObject({
                damageDrifs: 6,
                accuracyDrifs: 5,
            });
            rerender(
                <SimpleProfileGoalsPanel
                    settings={{
                        simpleProfile: profile,
                        simpleOptions: {
                            ...defaultSimpleOptions(profile),
                            damageDrifs: 10,
                            accuracyDrifs: 9,
                        },
                    }}
                    onChange={onChange}
                />
            );
            fireEvent.change(screen.getByRole("combobox", { name: "Styl buildu" }), {
                target: { value: "DEFENSIVE" },
            });
            expect(onChange.mock.lastCall[0].simpleOptions).toMatchObject({
                damageDrifs: 10,
                accuracyDrifs: 9,
            });
        }
    );

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
