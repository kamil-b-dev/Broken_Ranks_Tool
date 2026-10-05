import { act, render, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { useLayoutEffect } from "react";
import { server } from "../test/server";
import { describe, expect, it } from "vitest";
import { EquipmentProvider } from "./EquipmentProvider";
import { useEquipment, useEquipmentLocksState } from "../shared/state/EquipmentContext";

describe("equipment subscriptions", () => {
    it("measures unrelated renders of a lock-only consumer", async () => {
        server.use(
            http.get("*/api/initial-data", () =>
                HttpResponse.json({
                    items: [],
                    orbs: [],
                    drifs: [],
                    gameRules: {},
                    dictionaries: {},
                })
            )
        );
        let actions;
        let commits = 0;
        function Probe() {
            const equipment = useEquipment();
            useLayoutEffect(() => {
                actions = equipment;
            }, [equipment]);
            return null;
        }
        function Locks() {
            const { lockedSlots } = useEquipmentLocksState();
            useLayoutEffect(() => {
                commits += 1;
            });
            return <span>{lockedSlots.length}</span>;
        }
        render(
            <EquipmentProvider>
                <Probe />
                <Locks />
            </EquipmentProvider>
        );
        await waitFor(() => expect(actions.loading).toBe(false));
        commits = 0;
        for (let index = 0; index < 10; index += 1) {
            act(() =>
                actions.handleSlotUpdate("helmet", {
                    itemId: null,
                    itemStars: (index % 9) + 1,
                    orbIds: [],
                    orbLevels: [],
                    drifIds: [],
                    drifLevels: {},
                })
            );
        }
        console.info(`LOCK_SUBSCRIPTION_PROFILE unrelatedRenders=${commits}`);
        expect(commits).toBe(0);
        act(() => actions.toggleSlotLock("helmet"));
        expect(commits).toBe(1);
    });
});
