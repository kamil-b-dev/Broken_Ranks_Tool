import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import OrbSection from "./OrbSection";

const groupedOrbs = {
    EXTRA_GOLD: [
        { id: 1, size: "SUBORB", category: "UTILITY" },
        { id: 2, size: "BIDORB", category: "UTILITY" },
    ],
};

const Harness = ({ selectedItem = "item", onDragOver = vi.fn() }) => {
    const [orbState, setOrbState] = useState({ type: "", id: "", level: "" });
    return (
        <OrbSection
            slotKey="orb1"
            selectedItem={selectedItem}
            dragOverZone="orb1"
            handleDragOver={onDragOver}
            handleDragLeave={vi.fn()}
            handleDrop={vi.fn()}
            orbState={orbState}
            setOrbState={setOrbState}
            groupedOrbs={groupedOrbs}
            bonusTranslations={{ EXTRA_GOLD: "Dodatkowe złoto" }}
        />
    );
};

describe("OrbSection", () => {
    it("selects a regular orb and one of its three levels", async () => {
        const user = userEvent.setup();
        render(<Harness />);

        await user.selectOptions(screen.getByLabelText("Wybierz rodzaj orba"), "EXTRA_GOLD");
        await user.selectOptions(screen.getByLabelText("Wybierz wielkość orba"), "2");
        await user.selectOptions(screen.getByLabelText("Wybierz poziom orba"), "3");

        expect(screen.getByLabelText("Wybierz wielkość orba")).toHaveValue("2");
        expect(screen.getByLabelText("Wybierz poziom orba")).toHaveValue("3");
    });

    it("automatically fixes a suborb at level one", async () => {
        const user = userEvent.setup();
        render(<Harness />);

        await user.selectOptions(screen.getByLabelText("Wybierz rodzaj orba"), "EXTRA_GOLD");
        await user.selectOptions(screen.getByLabelText("Wybierz wielkość orba"), "1");

        expect(screen.getByLabelText("Wybierz poziom orba")).toHaveValue("1");
        expect(screen.getByLabelText("Wybierz poziom orba")).toBeDisabled();
    });

    it("disables selection without an item and forwards drag events", () => {
        const onDragOver = vi.fn();
        const { container } = render(<Harness selectedItem="" onDragOver={onDragOver} />);

        expect(screen.getByLabelText("Wybierz rodzaj orba")).toBeDisabled();
        fireEvent.dragOver(container.firstChild);
        expect(onDragOver).toHaveBeenCalledWith(expect.anything(), "orb1");
    });
});
