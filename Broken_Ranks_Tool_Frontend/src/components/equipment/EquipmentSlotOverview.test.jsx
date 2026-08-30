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
                slotData={{
                    itemId: 7,
                    itemStars: 5,
                    orbIds: [10, 11],
                    drifIds: [20, null, 21],
                    drifLevels: [8, null, 12],
                }}
                drifs={[
                    {
                        id: 20,
                        name: "Drif Precyzji",
                        bonusType: "CRITICAL",
                        size: "SUBDRIF",
                        category: "OFFENSIVE",
                    },
                    { id: 21, name: "Redukcja obrażeń", size: "BIDRIF", category: "DEFENSIVE" },
                ]}
                bonusTranslations={{ CRITICAL: "Szansa na krytyk" }}
                active
                onSelect={onSelect}
            />
        );

        expect(screen.getByText("Gorthdar")).toBeInTheDocument();
        expect(screen.getByText("Tier XII")).toBeInTheDocument();
        expect(screen.getByLabelText("5 z 9 gwiazdek")).toHaveTextContent("★★★★★");
        expect(screen.queryByText("2 orb · 2 drif")).not.toBeInTheDocument();
        expect(screen.getByText("Drif Precyzji")).toBeInTheDocument();
        expect(screen.getByText("Redukcja obrażeń")).toBeInTheDocument();
        expect(screen.getByTitle("Drif Precyzji · SUBDRIF · poz. 8")).toBeInTheDocument();

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
