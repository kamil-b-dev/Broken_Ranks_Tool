import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ReorganizationGoalsPanel from "./ReorganizationGoalsPanel";
import { builderCatalog } from "../../../test/fixtures/equipment/builderCatalog";

vi.mock("../../../shared/state/EquipmentContext", () => ({
    useEquipment: () => ({
        requestData: {
            slots: {
                helmet: { itemId: 1, drifIds: [60], drifLevels: { 0: 2 } },
                armor: { itemId: 2, drifIds: [60], drifLevels: { 0: 1 } },
            },
        },
        data: builderCatalog,
        gameRules: builderCatalog.gameRules,
        backpack: [{ id: "chosen", kind: "DRIF", templateId: 60, level: 6 }],
        lockedSlots: [],
        lockedDrifs: {},
    }),
}));
const View = () => {
    const [settings, onChange] = useState({ reorganization: {} });
    return <ReorganizationGoalsPanel settings={settings} onChange={onChange} />;
};
describe("operational reorganization goals", () => {
    it("shows modifier protections in a table with one shared loss heading and unique input labels", () => {
        render(<View />);
        fireEvent.click(screen.getByText("Ustawienia zaawansowane"));
        expect(screen.getAllByText("Dopuszczalny spadek (p.p.)")).toHaveLength(1);
        expect(screen.getByRole("columnheader", { name: "Chroń mod" })).toBeInTheDocument();
        const loss = screen.getByRole("spinbutton", { name: /Dopuszczalny spadek dla:/ });
        fireEvent.change(loss, { target: { value: "2.5" } });
        expect(loss).toHaveValue(2.5);
    });
    it("offers three concrete tasks without a modifier objective or pool summary", () => {
        render(<View />);
        expect(screen.getByRole("button", { name: "Ulepsz drify" })).toHaveAttribute(
            "aria-pressed",
            "true"
        );
        expect(screen.getByRole("button", { name: "Wstaw drif" })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Zwolnij miejsce" })).toBeInTheDocument();
        expect(screen.queryByLabelText("Mod do poprawy")).not.toBeInTheDocument();
        expect(screen.queryByText("Pula drifów")).not.toBeInTheDocument();
        expect(
            screen.queryByLabelText("Dołącz zaznaczone drify z plecaka")
        ).not.toBeInTheDocument();
        expect(screen.queryByLabelText("Jak najmniej przełożeń")).not.toBeInTheDocument();
        expect(screen.getByLabelText("Maksymalna liczba przełożeń")).toHaveValue(50);
        expect(
            screen.getByLabelText("Pozwól odkładać założone drify do plecaka")
        ).not.toBeChecked();
    });
    it("adds another distinct stone and preserves an incomplete numeric draft", () => {
        render(<View />);
        expect(screen.getByLabelText("Docelowy poziom")).toHaveValue(6);
        fireEvent.change(screen.getByLabelText("Docelowy poziom"), { target: { value: "" } });
        expect(screen.getByLabelText("Docelowy poziom")).toHaveValue(null);
        fireEvent.change(screen.getByLabelText("Docelowy poziom"), { target: { value: "5" } });
        fireEvent.click(screen.getByRole("button", { name: "+ Dodaj ulepszenie" }));
        expect(
            screen.getAllByLabelText("Kamień do ulepszenia").map((select) => select.value)
        ).toEqual(["helmet:0", "armor:0"]);
        expect(screen.queryByLabelText("Szukaj najwyższego poziomu")).not.toBeInTheDocument();
        fireEvent.click(screen.getByLabelText("Usuń ulepszenie 2"));
        expect(screen.getByLabelText("Docelowy poziom")).toHaveValue(5);
    });
    it("selects an exact loose backpack occurrence and independent capacity/socket requirements", () => {
        render(<View />);
        fireEvent.click(screen.getByRole("button", { name: "Wstaw drif" }));
        fireEvent.change(screen.getByLabelText("Drif z plecaka"), { target: { value: "chosen" } });
        expect(screen.getByLabelText("Drif z plecaka")).toHaveValue("chosen");
        fireEvent.click(screen.getByRole("button", { name: "Zwolnij miejsce" }));
        expect(screen.getByLabelText("Wolne gniazda")).toHaveValue(1);
        expect(screen.getByLabelText("Wolna pojemność")).toHaveValue(0);
    });
    it("lets the player edit a move limit from 1 to 50 without resetting an incomplete value", () => {
        render(<View />);
        const limit = screen.getByLabelText("Maksymalna liczba przełożeń");
        expect(limit).toHaveAttribute("min", "1");
        expect(limit).toHaveAttribute("max", "50");
        fireEvent.change(limit, { target: { value: "1" } });
        expect(limit).toHaveValue(1);
        fireEvent.change(limit, { target: { value: "" } });
        expect(limit).toHaveValue(null);
        fireEvent.change(limit, { target: { value: "50" } });
        expect(limit).toHaveValue(50);
    });
});
