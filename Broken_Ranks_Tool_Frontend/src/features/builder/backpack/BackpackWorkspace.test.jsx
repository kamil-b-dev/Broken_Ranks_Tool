import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
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
import { equipmentRequestIdentity } from "../../../shared/domain/equipment/equipmentRequestIdentity";

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
    fireEvent.click(screen.getByRole("button", { name: "Plecak W.I.P", exact: true }));
    return exposeRef;
};
describe("builder backpack workflow", () => {
    beforeEach(() => {
        localStorage.clear();
        window.history.replaceState({}, "", "/kreator");
        server.use(http.get("*/api/initial-data", () => HttpResponse.json(builderCatalog)));
    });
    it("swaps a configured occurrence from the sidebar and invalidates old calculations without stale editor publication", async () => {
        server.use(
            http.post("*/api/calculator/calculate", () =>
                HttpResponse.json({ stats: { Siła: 15 } })
            )
        );
        const ref = await start();
        const oldEquipment = {
            itemId: "1",
            itemStars: 1,
            drifIds: ["60"],
            drifLevels: { 0: 2 },
            orbIds: [],
            orbLevels: [],
        };
        const configured = {
            itemId: "1",
            itemStars: 8,
            drifIds: ["60"],
            drifLevels: { 0: 6 },
            orbIds: ["50"],
            orbLevels: [1],
        };
        await act(async () => {
            ref.current.handleSlotUpdate("helmet", oldEquipment);
            ref.current.onBackpackChange([
                { id: "replacement", kind: "ITEM", equipment: configured },
            ]);
        });
        await act(async () => ref.current.calculateStats());
        expect(ref.current.stats).toEqual({ Siła: 15 });
        fireEvent.click(screen.getByRole("button", { name: "Postać", exact: true }));
        fireEvent.click(
            within(screen.getByRole("group", { name: "Źródło wyposażenia" })).getByRole("button", {
                name: "Plecak",
                exact: true,
            })
        );
        const source = screen.getByRole("region", { name: "Plecak do wyposażenia" });
        fireEvent.click(within(source).getByRole("button", { name: /Przedmiot.*Hełm podróżnika/ }));
        fireEvent.click(within(source).getByRole("button", { name: "Załóż w slocie Hełm" }));
        await waitFor(() => expect(ref.current.requestData.slots.helmet.itemStars).toBe(8));
        expect(
            equipmentRequestIdentity({ slots: { helmet: ref.current.requestData.slots.helmet } })
        ).toBe(equipmentRequestIdentity({ slots: { helmet: configured } }));
        expect(ref.current.stats).toBeNull();
        expect(ref.current.backpack).toHaveLength(1);
        expect(
            equipmentRequestIdentity({ slots: { helmet: ref.current.backpack[0].equipment } })
        ).toBe(equipmentRequestIdentity({ slots: { helmet: oldEquipment } }));
        expect(ref.current.backpack[0].id).not.toBe("replacement");
        expect(screen.getByLabelText("Edytor wybranego slotu")).toHaveTextContent(
            "Hełm podróżnika"
        );
        await waitFor(() =>
            expect(
                JSON.parse(localStorage.getItem(EQUIPMENT_DRAFT_STORAGE_KEY)).value.requestData
                    .slots.helmet.itemStars
            ).toBe(8)
        );
        const snapshot = ref.current.createBuildSnapshot();
        expect(snapshot.payload.build.backpack).toEqual(ref.current.backpack);
        await act(async () => ref.current.loadBuildSnapshot(snapshot));
        expect(ref.current.requestData.slots.helmet.itemStars).toBe(8);
    });
    it("resolves drag occurrences from current inventory and rejects stale IDs without falling back to the catalog", async () => {
        const ref = await start();
        const configured = {
            itemId: "1",
            itemStars: 7,
            drifIds: [],
            drifLevels: {},
            orbIds: [],
            orbLevels: [],
        };
        await act(async () =>
            ref.current.onBackpackChange([{ id: "trusted", kind: "ITEM", equipment: configured }])
        );
        fireEvent.click(screen.getByRole("button", { name: "Postać", exact: true }));
        const overview = document.querySelector(".equipment-ring-slot-helmet");
        fireEvent.drop(overview, {
            dataTransfer: {
                getData: () =>
                    JSON.stringify({
                        source: "backpack",
                        dragType: "items",
                        entryId: "trusted",
                        id: 9999,
                        equipment: { itemStars: 9 },
                    }),
            },
        });
        await waitFor(() => expect(ref.current.requestData.slots.helmet.itemStars).toBe(7));
        expect(ref.current.backpack).toEqual([]);
        const previous = structuredClone(ref.current.requestData);
        fireEvent.drop(overview, {
            dataTransfer: {
                getData: () =>
                    JSON.stringify({
                        source: "backpack",
                        dragType: "items",
                        entryId: "trusted",
                        id: 1,
                    }),
            },
        });
        expect(ref.current.requestData).toEqual(previous);
        expect(ref.current.backpack).toEqual([]);
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
