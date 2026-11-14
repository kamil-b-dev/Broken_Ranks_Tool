import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import ItemReplacementPreview from "./ItemReplacementPreview";
import { calculateEquipmentStats } from "../../../shared/api/equipmentApi";
import { builderCatalog } from "../../../test/fixtures/equipment/builderCatalog";

vi.mock("../../../shared/api/equipmentApi", () => ({ calculateEquipmentStats: vi.fn() }));
beforeEach(() => vi.resetAllMocks());
const item = { ...builderCatalog.items[0], id: 101, name: "Zamiennik" };
const data = { ...builderCatalog, items: [...builderCatalog.items, item] };
const requestData = {
    slots: {
        helmet: { itemId: 1, itemStars: 3, orbIds: [], orbLevels: [], drifIds: [], drifLevels: {} },
    },
    characterStats: {},
};
function open() {
    const view = render(
        <ItemReplacementPreview
            requestData={requestData}
            slotKey="helmet"
            items={[item]}
            data={data}
            gameRules={data.gameRules}
        />
    );
    fireEvent.click(screen.getByText("Podgląd wymiany przedmiotu"));
    fireEvent.change(screen.getByLabelText("Przedmiot do porównania"), {
        target: { value: "101" },
    });
    return view;
}

it("compares detached requests and displays numeric and percentage changes", async () => {
    calculateEquipmentStats
        .mockResolvedValueOnce({ stats: { Siła: 10, DEFENSE: "5%", Mana: 20 } })
        .mockResolvedValueOnce({ stats: { Siła: 15, DEFENSE: "3,5%", Mana: 20 } });
    const original = structuredClone(requestData);
    open();
    fireEvent.click(screen.getByText("Sprawdź zmianę"));
    await screen.findByText(/10 → 15/);
    expect(screen.getByText(/5% → 3,5%/)).toHaveTextContent("p.p.");
    expect(screen.queryByText("Mana")).not.toBeInTheDocument();
    expect(calculateEquipmentStats.mock.calls[1][0].slots.helmet).toMatchObject({
        itemId: 101,
        itemStars: 1,
    });
    expect(requestData).toEqual(original);
    fireEvent.click(screen.getByLabelText("Zachowaj orby i zwykłe drify, jeśli pasują"));
    expect(screen.queryByText(/10 → 15/)).not.toBeInTheDocument();
});

it("shows unchanged statistics and hides errors after changing the comparison", async () => {
    calculateEquipmentStats.mockResolvedValue({ Siła: 10 });
    open();
    fireEvent.click(screen.getByText("Sprawdź zmianę"));
    await screen.findByText("Statystyki pozostają takie same.");
    calculateEquipmentStats.mockRejectedValue({
        response: { data: { message: "Kalkulator niedostępny" } },
    });
    fireEvent.click(screen.getByText("Sprawdź zmianę"));
    expect(await screen.findByRole("alert")).toHaveTextContent("Kalkulator niedostępny");
    await waitFor(() => expect(screen.getByText("Sprawdź zmianę")).not.toBeDisabled());
    fireEvent.change(screen.getByLabelText("Przedmiot do porównania"), { target: { value: "" } });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByText("Sprawdź zmianę")).toBeDisabled();
});
