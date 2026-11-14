import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import EquipmentRequirements from "./EquipmentRequirements";

it("distinguishes level and profession requirements and rechecks after a profession change", () => {
    const items = [{ id: 1, name: "Hełm łucznika", reqLevel: 80, allowedClasses: ["ARCHER"] }];
    const requestData = { slots: { helmet: { itemId: 1 } } };
    const { rerender } = render(
        <EquipmentRequirements requestData={requestData} items={items} level={40} />
    );
    expect(screen.getByRole("status")).toHaveTextContent("wymagany poziom 80");
    fireEvent.change(screen.getByLabelText("Profesja do sprawdzenia wymagań"), {
        target: { value: "KNIGHT" },
    });
    expect(screen.getByRole("status")).toHaveTextContent(
        "przedmiot nie pasuje do wybranej profesji"
    );
    fireEvent.change(screen.getByLabelText("Profesja do sprawdzenia wymagań"), {
        target: { value: "ARCHER" },
    });
    rerender(<EquipmentRequirements requestData={requestData} items={items} level={80} />);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
});
