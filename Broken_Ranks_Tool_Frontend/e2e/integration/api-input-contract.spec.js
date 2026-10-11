import { expect, test } from "@playwright/test";
import { createContractValidator, loadApiContract } from "../../../scripts/api-contract.mjs";

test("production API enforces enum names, field names and duplicate keys while preserving scalar compatibility", async ({
    request,
}) => {
    const initial = await request.get("/api/initial-data");
    expect(initial.status()).toBe(200);
    const { items } = await initial.json();
    const helmet = items.find((item) => item.category === "HELMET" && item.rarity === "RARE");
    expect(helmet).toBeTruthy();
    const cases = [
        ["/api/calculator/calculate", JSON.stringify({ slots: {}, unexpected: true })],
        [
            "/api/calculator/calculate",
            JSON.stringify({ slots: { helmet: { itemId: helmet.id, unexpected: true } } }),
        ],
        ["/api/calculator/calculate", '{"slots":{},"characterStats":{"Siła":1,"Siła":2}}'],
        [
            "/api/optimizer/drifs",
            JSON.stringify({
                mode: 0,
                originalSlots: { helmet: { itemId: helmet.id } },
                priorities: { CRITICAL_CHANCE: 15 },
                targetQuantities: { CRITICAL_CHANCE: { min: 0, max: 0 } },
            }),
        ],
        [
            "/api/optimizer/drifs",
            JSON.stringify({
                mode: "ADVISOR",
                originalSlots: { helmet: { itemId: helmet.id } },
                advisor: { goal: "12", targetValue: 0 },
            }),
        ],
    ];
    for (const [path, data] of cases) {
        const response = await request.post(path, {
            headers: { "Content-Type": "application/json" },
            data,
        });
        expect(response.status(), data).toBe(400);
    }
    const compatible = await request.post("/api/optimizer/drifs", {
        data: {
            mode: "ADVISOR",
            originalSlots: {
                helmet: {
                    itemId: String(helmet.id),
                    itemStars: "1",
                    orbIds: [null, null],
                    orbLevels: [null, null],
                },
            },
            advisor: { goal: "CRITICAL_CHANCE", targetValue: 0, allowedChanges: { stars: 0 } },
        },
    });
    expect(compatible.status()).toBe(200);
    const result = await compatible.json();
    expect(result.calculationResult).toBeTruthy();
    expect(result.optimizedSetup.slots.helmet.orbIds).toEqual([]);
});

test("production cancellation requires full UUID and an empty or null body", async ({
    request,
}) => {
    const id = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
    const token = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
    const headers = { "Content-Type": "application/json", "X-Advisor-Cancellation-Token": token };
    for (const data of ["{}", "[]", "invalid JSON"]) {
        const response = await request.post(`/api/optimizer/advisor/${id}/cancel`, {
            headers,
            data,
        });
        expect(response.status()).toBe(400);
    }
    const short = await request.post("/api/optimizer/advisor/1-1-1-1-1/cancel", {
        headers,
        data: "null",
    });
    expect(short.status()).toBe(400);
    const valid = await request.post(`/api/optimizer/advisor/${id}/cancel`, {
        headers,
        data: "null",
    });
    expect(valid.status()).toBe(200);
    expect(await valid.json()).toEqual({ cancelled: false });
});

test("real optimizer reports outcomes, numeric-search measurements and typed advisor actions", async ({
    request,
}) => {
    const validate = createContractValidator(await loadApiContract());
    const initial = await (await request.get("/api/initial-data")).json();
    const helmet = initial.items.find(
        (item) => item.category === "HELMET" && item.rarity === "RARE" && item.capacity >= 4
    );
    const drif = initial.drifs.find(
        (stone) => stone.bonusType === "CRITICAL_CHANCE" && stone.size === "SUBDRIF"
    );
    expect(helmet).toBeTruthy();
    expect(drif).toBeTruthy();
    const scratch = await request.post("/api/optimizer/drifs", {
        data: {
            originalSlots: { helmet: { itemId: helmet.id } },
            priorities: { CRITICAL_CHANCE: 15 },
            targetQuantities: { CRITICAL_CHANCE: { min: 0, max: 0 } },
            forcedPercentageTargets: { CRITICAL_CHANCE: 60 },
        },
    });
    expect(scratch.status()).toBe(200);
    const result = await scratch.json();
    validate("OptimizationResponse", result);
    expect(result.summary.outcome).toBe("VALID_BUILD_SOFT_TARGETS_UNMET");
    expect(result.summary.searchReport.proofComplete).toBe(false);
    expect(result.summary.searchReport.verifiedStates).toBeGreaterThan(0);
    for (const budget of Object.values(result.summary.searchReport.budgets))
        expect(budget.consumed + budget.remaining).toBe(budget.initial);
    const calculator = await request.post("/api/calculator/calculate", {
        data: result.optimizedSetup,
    });
    expect((await calculator.json()).stats).toEqual(result.calculationResult.stats);
    const advisor = await request.post("/api/optimizer/drifs", {
        data: {
            mode: "ADVISOR",
            originalSlots: {
                helmet: { itemId: helmet.id, drifIds: [drif.id], drifLevels: { 0: 1 } },
            },
            advisor: {
                goal: "CRITICAL_CHANCE",
                maxActions: 1,
                allowedChanges: { stars: false, drifUpgrades: true },
            },
        },
    });
    expect(advisor.status()).toBe(200);
    const advice = await advisor.json();
    validate("OptimizationResponse", advice);
    expect(advice.summary.outcome).toBe("VALID_BUILD");
    expect(advice.advisorReport.plans.length).toBeGreaterThan(0);
    expect(advice.advisorReport.plans[0].actionDetails[0]).toMatchObject({
        type: "UPGRADE_DRIF",
        drifs: [{ identity: "initial:helmet:0", fromLevel: 1, toLevel: 6 }],
    });
});
