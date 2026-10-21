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
    fireEvent.click(
        within(screen.getByRole("group", { name: "Widok ekwipunku" })).getByRole("button", {
            name: "Plecak",
            exact: true,
        })
    );
    return exposeRef;
};
describe("builder backpack workflow", () => {
    beforeEach(() => {
        localStorage.clear();
        window.history.replaceState({}, "", "/builder");
        server.use(http.get("*/api/initial-data", () => HttpResponse.json(builderCatalog)));
    });
    it.each(["DRIF", "ORB"])(
        "returns the replaced %s with its level after a catalog drop into the right editor",
        async (kind) => {
            server.use(
                http.get("*/api/initial-data", () =>
                    HttpResponse.json({
                        ...builderCatalog,
                        orbs: builderCatalog.orbs.map((orb) => ({ ...orb, size: "BIORB" })),
                    })
                )
            );
            const ref = await start();
            const equipment = {
                itemId: "1",
                itemStars: 1,
                drifIds: kind === "DRIF" ? ["60"] : [],
                drifLevels: kind === "DRIF" ? { 0: 6 } : {},
                orbIds: kind === "ORB" ? ["50"] : [],
                orbLevels: kind === "ORB" ? [3] : [],
            };
            await act(async () =>
                ref.current.onBackpackChange([{ id: "target", kind: "ITEM", equipment }])
            );
            const before = structuredClone(ref.current.requestData);
            const editor = screen.getByLabelText("Edytor plecaka");
            const field = within(editor).getByLabelText(
                kind === "DRIF" ? "Wybierz wielkość drifa 1" : "Wybierz wielkość orba"
            );
            fireEvent.drop(field, {
                dataTransfer: {
                    getData: () =>
                        JSON.stringify({
                            dragType: kind === "DRIF" ? "drifs" : "orbs",
                            id: kind === "DRIF" ? 60 : 50,
                        }),
                },
            });
            await waitFor(() => expect(ref.current.backpack).toHaveLength(2));
            expect(ref.current.backpack.find((entry) => entry.kind === kind)).toMatchObject({
                templateId: kind === "DRIF" ? "60" : "50",
                level: kind === "DRIF" ? 6 : 3,
            });
            expect(
                within(editor).getByLabelText(
                    kind === "DRIF" ? "Wybierz poziom drifa 1" : "Wybierz poziom orba"
                )
            ).toHaveValue("1");
            expect(ref.current.requestData).toEqual(before);
        }
    );
    it("rejects a catalog replacement in a full backpack while allowing a free socket", async () => {
        const ref = await start();
        // The loose stones fill capacity; this scenario operates on the item only.
        fireEvent.click(
            within(screen.getByRole("group", { name: "Pokaż w plecaku" })).getByRole("button", {
                name: "Przedmioty",
                exact: true,
            })
        );
        await act(async () =>
            ref.current.onBackpackChange([
                {
                    id: "target",
                    kind: "ITEM",
                    equipment: {
                        itemId: "1",
                        itemStars: 1,
                        drifIds: ["60"],
                        drifLevels: { 0: 6 },
                        orbIds: [],
                        orbLevels: [],
                    },
                },
                ...Array.from({ length: 199 }, (_, index) => ({
                    id: `loose-${index}`,
                    kind: "DRIF",
                    templateId: "60",
                    level: 1,
                })),
            ])
        );
        const before = structuredClone(ref.current.backpack);
        expect(before).toHaveLength(200);
        expect(screen.getByText("Sloty: 200/200 · Widoczne: 1")).toBeInTheDocument();
        const editor = within(screen.getByLabelText("Edytor plecaka"));
        fireEvent.drop(editor.getByLabelText("Wybierz wielkość drifa 1"), {
            dataTransfer: { getData: () => JSON.stringify({ dragType: "drifs", id: 60 }) },
        });
        expect(ref.current.backpack).toEqual(before);
        expect(screen.getByRole("alert")).toHaveTextContent(/200/);
        expect(editor.getByLabelText("Wybierz poziom drifa 1")).toHaveValue("6");
        fireEvent.drop(editor.getByLabelText("Wybierz wielkość orba"), {
            dataTransfer: { getData: () => JSON.stringify({ dragType: "orbs", id: 50 }) },
        });
        await waitFor(() => expect(ref.current.backpack[0].equipment.orbIds).toEqual(["50"]));
        expect(ref.current.backpack).toHaveLength(200);
    });
    it("can undo whole-item removal after viewing its normalized backpack editor", async () => {
        const ref = await start();
        const boots = builderCatalog.items.find((item) => item.category === "BOOTS");
        const equipment = {
            itemId: String(boots.id),
            itemStars: 1,
            drifIds: [],
            drifLevels: {},
            orbIds: [],
            orbLevels: [],
        };
        await act(async () => ref.current.handleSlotUpdate("boots", equipment));
        act(() => expect(ref.current.equipmentRemoval.removeEquipment("ITEM")).toBe(true));
        await waitFor(() => expect(ref.current.backpack[0].equipment.drifIds).toHaveLength(3));
        expect(ref.current.equipmentRemoval.getUndoWarning("all:ITEM")).toBeNull();
        act(() => expect(ref.current.equipmentRemoval.undoRemoval("all:ITEM")).toBe(true));
        expect(ref.current.backpack).toEqual([]);
        expect(
            equipmentRequestIdentity({ slots: { boots: ref.current.requestData.slots.boots } })
        ).toBe(equipmentRequestIdentity({ slots: { boots: equipment } }));
    });
    it("extracts and undoes stones in the backpack editor while preserving equipped stats and refreshing its draft", async () => {
        server.use(
            http.post("*/api/calculator/calculate", () =>
                HttpResponse.json({ stats: { Siła: 15 } })
            )
        );
        const ref = await start();
        const equipment = {
            itemId: "1",
            itemStars: 7,
            orbIds: ["50"],
            orbLevels: [1],
            drifIds: ["60"],
            drifLevels: { 0: 6 },
        };
        await act(async () => {
            ref.current.handleSlotUpdate("helmet", equipment);
            ref.current.onBackpackChange([{ id: "target", kind: "ITEM", equipment }]);
        });
        await act(async () => ref.current.calculateStats());
        fireEvent.click(document.querySelector(".backpack-grid .equipment-slot-overview"));
        const before = structuredClone(ref.current.requestData);
        const revision = ref.current.optimizationTrigger;
        const editor = within(screen.getByLabelText("Edytor plecaka"));
        for (const [kind, name, field] of [
            ["DRIF", "drif", "Wybierz wielkość drifa 1"],
            ["ORB", "orb", "Wybierz wielkość orba"],
        ]) {
            const label = `Zdejmij ${name} 1 do plecaka`;
            fireEvent.click(editor.getByRole("button", { name: label, exact: true }));
            await waitFor(() => expect(ref.current.backpack).toHaveLength(2));
            expect(ref.current.backpack[1]).toMatchObject({ kind, level: kind === "DRIF" ? 6 : 1 });
            expect(editor.getByLabelText(field)).toHaveValue("");
            fireEvent.click(editor.getByRole("button", { name: `Cofnij: ${label}`, exact: true }));
            await waitFor(() => expect(ref.current.backpack).toHaveLength(1));
            expect(editor.getByLabelText(field)).toHaveValue(kind === "DRIF" ? "60" : "50");
        }
        expect(ref.current.requestData).toEqual(before);
        expect(ref.current.optimizationTrigger).toBe(revision);
        expect(ref.current.stats).toEqual({ Siła: 15 });
        fireEvent.click(
            editor.getByRole("button", { name: "Zdejmij drif 1 do plecaka", exact: true })
        );
        const saved = ref.current.createBuildSnapshot();
        expect(
            editor.getByRole("button", { name: "Cofnij: Zdejmij drif 1 do plecaka", exact: true })
        ).toBeEnabled();
        await act(async () => ref.current.loadBuildSnapshot(saved));
        expect(
            editor.getByRole("button", { name: "Cofnij: Zdejmij drif 1 do plecaka", exact: true })
        ).toBeDisabled();
    });
    it("moves a stone into the selected inventory item without changing equipped gear or invalidating its calculation", async () => {
        const calculations = vi.fn();
        server.use(
            http.post("*/api/calculator/calculate", () => {
                calculations();
                return HttpResponse.json({ stats: { Siła: 15 } });
            })
        );
        const ref = await start();
        const equipment = {
            itemId: "1",
            itemStars: 1,
            drifIds: ["60"],
            drifLevels: { 0: 1 },
            orbIds: [],
            orbLevels: [],
        };
        await act(async () => {
            ref.current.handleSlotUpdate("helmet", equipment);
            ref.current.onBackpackChange([
                { id: "loose", kind: "DRIF", templateId: "60", level: 6 },
                { id: "target", kind: "ITEM", equipment },
            ]);
        });
        await act(async () => ref.current.calculateStats());
        fireEvent.click(document.querySelector(".backpack-grid .equipment-slot-overview"));
        const before = structuredClone(ref.current.requestData);
        const previousCalls = calculations.mock.calls.length;
        const payload = {
            source: "backpack",
            entryId: "loose",
            dragType: "drifs",
            id: 9999,
            level: 21,
        };
        fireEvent.drop(document.querySelector(".backpack-grid .equipment-slot-overview-item"), {
            dataTransfer: {
                types: ["application/json"],
                getData: (mime) => (mime === "application/json" ? JSON.stringify(payload) : ""),
            },
        });
        await waitFor(() =>
            expect(
                ref.current.backpack.find((entry) => entry.id === "target").equipment.drifLevels[0]
            ).toBe(6)
        );
        expect(ref.current.backpack.find((entry) => entry.kind === "DRIF")).toMatchObject({
            templateId: "60",
            level: 1,
        });
        expect(ref.current.backpack.some((entry) => entry.id === "loose")).toBe(false);
        expect(
            screen
                .getByLabelText("Edytor plecaka")
                .querySelector('[aria-label="Wybierz poziom drifa 1"]')
        ).toHaveValue("6");
        expect(ref.current.requestData).toEqual(before);
        expect(ref.current.stats).toEqual({ Siła: 15 });
        expect(calculations).toHaveBeenCalledTimes(previousCalls);
        const stored = structuredClone(ref.current.backpack);
        fireEvent.drop(document.querySelector(".backpack-grid .equipment-slot-overview-item"), {
            dataTransfer: { types: ["application/json"], getData: () => JSON.stringify(payload) },
        });
        expect(ref.current.backpack).toEqual(stored);
        expect(screen.getByRole("alert")).toHaveTextContent("nie znajduje się już");
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
        expect(snapshot.payload.version).toBe(3);
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
