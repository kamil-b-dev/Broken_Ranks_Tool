import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useEffect } from "react";
import { HttpResponse, http } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { EquipmentProvider } from "../../../app/EquipmentProvider";
import { useEquipment, useEquipmentBackpack } from "../../../shared/state/EquipmentContext";
import ConnectedBuilderWorkspace from "../ConnectedBuilderWorkspace";
import { server } from "../../../test/server";
import { builderCatalog } from "../../../test/fixtures/equipment/builderCatalog";
import legacy from "../../../test/fixtures/builds/compatibility/v1-minimal.json";
import { EQUIPMENT_DRAFT_STORAGE_KEY } from "../../../app/storage/workingDraftStorage";

function Probe({ exposeRef }) {
    const equipment = useEquipment();
    const inventory = useEquipmentBackpack();
    useEffect(() => {
        exposeRef.current = { ...equipment, ...inventory };
    }, [equipment, inventory, exposeRef]);
    return equipment.loading ? <p>Ładowanie katalogu</p> : <ConnectedBuilderWorkspace />;
}
const start = async () => {
    const exposeRef = { current: null };
    render(
        <EquipmentProvider>
            <Probe exposeRef={exposeRef} />
        </EquipmentProvider>
    );
    await waitFor(() => expect(exposeRef.current.loading).toBe(false));
    fireEvent.click(screen.getByRole("button", { name: "Plecak", exact: true }));
    return exposeRef;
};
describe("builder backpack workflow", () => {
    beforeEach(() => {
        localStorage.clear();
        window.history.replaceState({}, "", "/kreator");
        server.use(http.get("*/api/initial-data", () => HttpResponse.json(builderCatalog)));
    });
    it("edits and persists an item while keeping equipped gear and calculator input untouched", async () => {
        const calculations = vi.fn();
        server.use(
            http.post("*/api/calculator/calculate", async ({ request }) => {
                calculations(await request.json());
                return HttpResponse.json({ stats: {} });
            })
        );
        const exposeRef = await start();
        const before = structuredClone(exposeRef.current.requestData);
        const initialCalls = calculations.mock.calls.length;
        fireEvent.click(screen.getByRole("button", { name: "+ Dodaj przedmiot" }));
        fireEvent.change(screen.getByLabelText("Przedmiot do plecaka"), { target: { value: "1" } });
        await waitFor(() => expect(exposeRef.current.backpack).toHaveLength(1));
        expect(screen.getByLabelText("Edytor plecaka")).toHaveTextContent("Hełm podróżnika");
        expect(exposeRef.current.requestData).toEqual(before);
        await waitFor(() =>
            expect(
                JSON.parse(localStorage.getItem(EQUIPMENT_DRAFT_STORAGE_KEY)).value.backpack
            ).toHaveLength(1)
        );
        expect(calculations).toHaveBeenCalledTimes(initialCalls);
        const snapshot = exposeRef.current.createBuildSnapshot();
        expect(snapshot.payload.version).toBe(2);
        expect(snapshot.payload.build.backpack).toHaveLength(1);
        await act(async () => exposeRef.current.loadBuildSnapshot(snapshot));
        expect(exposeRef.current.backpack).toEqual(snapshot.payload.build.backpack);
        const revised = structuredClone(snapshot);
        revised.payload.build.backpack[0].equipment.itemStars = 7;
        await act(async () => exposeRef.current.loadBuildSnapshot(revised));
        await waitFor(() =>
            expect(
                screen.getByRole("button", { name: "Ustaw 7 gwiazdek: Przedmiot w plecaku" })
            ).toHaveAttribute("aria-pressed", "true")
        );
        expect(exposeRef.current.backpack[0].equipment.itemStars).toBe(7);
        expect(
            calculations.mock.calls.every(([request]) => !Object.hasOwn(request, "backpack"))
        ).toBe(true);
        await act(async () => exposeRef.current.loadBuildSnapshot({ payload: legacy }));
        expect(exposeRef.current.backpack).toEqual([]);
    });
    it("adds loose stones, duplicates occurrences and reorders them with accessible controls", async () => {
        const exposeRef = await start();
        fireEvent.click(screen.getByRole("button", { name: "+ Dodaj drif" }));
        fireEvent.change(screen.getByLabelText("Rodzaj drifa"), { target: { value: "Band" } });
        fireEvent.change(screen.getByLabelText("Rozmiar"), { target: { value: "60" } });
        fireEvent.change(screen.getByLabelText("Poziom"), { target: { value: "6" } });
        expect(exposeRef.current.backpack[0]).toMatchObject({
            kind: "DRIF",
            templateId: "60",
            level: 6,
        });
        fireEvent.click(screen.getByRole("button", { name: "Duplikuj: Band" }));
        expect(exposeRef.current.backpack[0].id).not.toBe(exposeRef.current.backpack[1].id);
        const second = exposeRef.current.backpack[1].id;
        fireEvent.click(screen.getAllByRole("button", { name: "Przesuń wcześniej: Band" })[1]);
        expect(exposeRef.current.backpack[0].id).toBe(second);
        fireEvent.click(screen.getAllByRole("button", { name: "Usuń z plecaka: Band" })[0]);
        expect(exposeRef.current.backpack).toHaveLength(1);
    });
});
