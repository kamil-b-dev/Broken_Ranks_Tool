import { afterEach, expect, it, vi } from "vitest";
import { downloadBuildCard } from "./buildCard";
import { stoneLabel, statisticLabel } from "./buildPresentation";

afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
});
const record = {
    name: "Mój build",
    payload: {
        build: {
            requestData: {
                slots: {
                    helmet: {
                        itemId: 1,
                        drifIds: [2, 999],
                        drifLevels: { 0: 6 },
                        orbIds: [3, 999],
                        orbLevels: [1],
                    },
                    ring1: { synergetic: { name: "Res", stats: { PŻ: 20 } } },
                },
            },
        },
    },
    stats: { CRITICAL_CHANCE: "12%" },
};
const data = {
    items: [{ id: 1, name: "Hełm" }],
    drifs: [{ id: 2, size: "SUBDRIF", name: "Band" }],
    orbs: [{ id: 3, name: "Ochrona", size: "SUBORB" }],
    gameRules: { bonusTranslations: { CRITICAL_CHANCE: "Krytyk" } },
};

it("exports the saved equipment, stones and translated statistics as a local PNG", async () => {
    vi.useFakeTimers();
    const context = { fillRect: vi.fn(), fillText: vi.fn() };
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(context);
    vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation((callback) =>
        callback(new Blob(["png"], { type: "image/png" }))
    );
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:test");
    const revoke = vi.spyOn(URL, "revokeObjectURL");
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    await downloadBuildCard(record, data);
    const text = context.fillText.mock.calls.map(([line]) => line).join("\n");
    expect(text).toContain("Mój build");
    expect(text).toContain("Subdrif Band 6");
    expect(text).toContain("Suborb Ochrona 1");
    expect(text).toContain("Res");
    expect(text).toContain("PŻ: 20");
    expect(text).toContain("Krytyk: 12%");
    expect(click.mock.instances[0].download).toBe("broken-ranks-build.png");
    vi.runAllTimers();
    expect(revoke).toHaveBeenCalledWith("blob:test");
});

it("reports unsupported canvas and failed encoding instead of downloading an empty card", async () => {
    const getContext = vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
    await expect(downloadBuildCard(record, data)).rejects.toThrow("nie obsługuje");
    getContext.mockReturnValue({ fillRect: vi.fn(), fillText: vi.fn() });
    vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation((callback) =>
        callback(null)
    );
    await expect(downloadBuildCard({ ...record, stats: null }, data)).rejects.toThrow(
        "Nie udało się utworzyć grafiki"
    );
    expect(stoneLabel({ name: "Nieznany" }, 1)).toBe("Nieznany 1");
    expect(stoneLabel({ name: "Inny", size: "CUSTOM" }, 2)).toBe("CUSTOM Inny 2");
    expect(statisticLabel("Siła", {})).toBe("Siła");
});
