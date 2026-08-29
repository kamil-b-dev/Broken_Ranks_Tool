import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import EquipmentSlotOverview from "./EquipmentSlotOverview";

describe("EquipmentSlotOverview", () => {
    it("shows only data that exists in the configured slot", async () => {
        const user = userEvent.setup();
        const onSelect = vi.fn();
        render(
            <EquipmentSlotOverview
                label="Broń"
                item={{ id: 7, name: "Gorthdar", tier: "XII" }}
                slotData={{ itemId: 7, itemStars: 5, orbIds: [10, 11], drifIds: [20, null, 21] }}
                active
                onSelect={onSelect}
            />
        );

        expect(screen.getByText("Gorthdar")).toBeInTheDocument();
        expect(screen.getByText("Tier XII")).toBeInTheDocument();
        expect(screen.getByLabelText("5 z 9 gwiazdek")).toHaveTextContent("★★★★★");
        expect(screen.getByText("2 orb · 2 drif")).toBeInTheDocument();

        await user.click(screen.getByRole("button", { name: /Broń/i }));
        expect(onSelect).toHaveBeenCalledOnce();
    });

    it("marks an unconfigured slot without inventing item details", () => {
        render(
            <EquipmentSlotOverview
                label="Hełm"
                slotData={null}
                item={null}
                active={false}
                onSelect={vi.fn()}
            />
        );

        expect(screen.getByText("Wybierz przedmiot")).toBeInTheDocument();
        expect(screen.queryByText(/Tier/)).not.toBeInTheDocument();
    });
});
