import { act, render, screen, waitFor } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import { useEffect } from "react";
import { describe, expect, it, vi } from "vitest";
import { EquipmentProvider, useEquipment } from "./EquipmentContext";
import { server } from "../test/server";

const ContextProbe = () => {
    const { data, gameRules, loading, initialDataError } = useEquipment();

    if (loading) return <p>Ładowanie</p>;
    if (initialDataError) return <p role="alert">{initialDataError}</p>;
    return <p>{`${data.items.length}:${gameRules.maxDrifLevel}`}</p>;
};

const ActionProbe = ({ exposeRef }) => {
    const equipment = useEquipment();
    useEffect(() => {
        exposeRef.current = equipment;
    }, [equipment, exposeRef]);
    return <p>{JSON.stringify(equipment.requestData.slots)}</p>;
};

describe("EquipmentProvider", () => {
    it("loads initial game data from the backend", async () => {
        server.use(
            http.get("http://localhost:8080/api/initial-data", () =>
                HttpResponse.json({
                    items: [{ id: 1 }],
                    orbs: [],
                    drifs: [],
                    gameRules: { maxDrifLevel: 21 },
                    dictionaries: {},
                })
            )
        );

        render(
            <EquipmentProvider>
                <ContextProbe />
            </EquipmentProvider>
        );

        expect(screen.getByText("Ładowanie")).toBeInTheDocument();
        expect(await screen.findByText("1:21")).toBeInTheDocument();
    });

    it("exposes a backend error to the application", async () => {
        vi.spyOn(console, "error").mockImplementation(() => {});
        server.use(
            http.get("http://localhost:8080/api/initial-data", () =>
                HttpResponse.json({ message: "Dane gry są niedostępne." }, { status: 503 })
            )
        );

        render(
            <EquipmentProvider>
                <ContextProbe />
            </EquipmentProvider>
        );

        await waitFor(() => {
            expect(screen.getByRole("alert")).toHaveTextContent("Dane gry są niedostępne.");
        });
    });

    it("updates slots and locks while protecting optimization without equipment", async () => {
        server.use(
            http.get("http://localhost:8080/api/initial-data", () =>
                HttpResponse.json({
                    items: [],
                    orbs: [],
                    drifs: [],
                    gameRules: {},
                    dictionaries: {},
                })
            )
        );
        const exposeRef = { current: null };
        render(
            <EquipmentProvider>
                <ActionProbe exposeRef={exposeRef} />
            </EquipmentProvider>
        );
        await waitFor(() => expect(exposeRef.current.loading).toBe(false));

        await act(async () => {
            exposeRef.current.handleSlotUpdate("helmet", {
                itemId: null,
                itemStars: 1,
                orbIds: [],
                orbLevels: [],
                drifIds: [],
                drifLevels: {},
            });
            exposeRef.current.toggleSlotLock("helmet");
            exposeRef.current.toggleDrifLock("helmet", 0);
        });
        expect(exposeRef.current.lockedSlots).toEqual(["helmet"]);
        expect(exposeRef.current.lockedDrifs).toEqual({ helmet: [0] });

        const result = await exposeRef.current.runDrifOptimization({});
        expect(result).toEqual({
            success: false,
            message: "Wybierz przynajmniej jeden przedmiot, aby uruchomić optymalizację.",
            applied: false,
        });

        act(() => {
            exposeRef.current.toggleSlotLock("helmet");
            exposeRef.current.toggleDrifLock("helmet", 0);
        });
        expect(exposeRef.current.lockedSlots).toEqual([]);
        expect(exposeRef.current.lockedDrifs).toEqual({ helmet: [] });
        expect(exposeRef.current.applyOptimizationSetup(null)).toBe(false);
    });
});
