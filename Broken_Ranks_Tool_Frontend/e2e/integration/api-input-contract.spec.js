import { expect, test } from "@playwright/test";

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
