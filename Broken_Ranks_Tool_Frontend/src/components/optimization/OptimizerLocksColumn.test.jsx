import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import OptimizerLocksColumn from "./OptimizerLocksColumn";

const props = {
    active: true,
    slots: { helmet: { itemId: 7, drifIds: [9] } },
    items: [{ id: 7, name: "Hełm testowy" }],
    drifs: [{ id: 9, name: "Drif krytyczny", size: "BIDRIF" }],
    lockedSlots: [],
    lockedDrifs: {},
    onToggleSlot: vi.fn(),
    onToggleDrif: vi.fn(),
};

describe("OptimizerLocksColumn", () => {
    it("delegates slot and drif lock changes", async () => {
        const user = userEvent.setup();
        render(<OptimizerLocksColumn {...props} />);

        expect(screen.getByText("Hełm testowy")).toBeInTheDocument();
        expect(screen.getByText("Drif krytyczny (BIDRIF)")).toBeInTheDocument();
        await user.click(screen.getByTitle("Zablokuj cały slot"));
        await user.click(screen.getByTitle("Zablokuj drif"));

        expect(props.onToggleSlot).toHaveBeenCalledWith("helmet");
        expect(props.onToggleDrif).toHaveBeenCalledWith("helmet", 0);
    });

    it("prevents changing a drif locked by its whole slot", () => {
        render(<OptimizerLocksColumn {...props} lockedSlots={["helmet"]} />);

        expect(screen.getByTitle("Odblokuj slot")).toBeInTheDocument();
        expect(screen.getByTitle("Odblokuj drif")).toBeDisabled();
    });
});
