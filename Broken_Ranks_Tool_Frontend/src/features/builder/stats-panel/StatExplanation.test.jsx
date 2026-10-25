import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import StatsPanel from "./StatsPanel";
import { explainEquipmentStats } from "../../../shared/api/equipmentApi";

vi.mock("../../../shared/api/equipmentApi", () => ({ explainEquipmentStats: vi.fn() }));
const gameRules = {
    bonusTranslations: { CRITICAL_CHANCE: "Szansa krytyczna" },
    drifBonusCategories: { CRITICAL_CHANCE: "OFFENSIVE" },
};
const response = {
    stats: { CRITICAL_CHANCE: "62%" },
    caps: { CRITICAL_CHANCE: 60 },
    contributions: {
        CRITICAL_CHANCE: [
            { source: { kind: "DEFAULT" }, baseValue: 2, value: 2, percentage: true },
            {
                source: {
                    kind: "DRIF",
                    stoneName: "Kryt",
                    itemName: "Hełm",
                    slotKey: "helmet",
                    size: "ARCYDRIF",
                    level: 21,
                    itemStars: 9,
                    repeatCount: 4,
                    penaltyMultiplier: 0.95,
                    itemBonus: 0.1,
                    starBonus: 0.15,
                },
                baseValue: 10,
                value: 11.875,
                percentage: true,
            },
        ],
    },
};
const requestData = { slots: {} };
function panel(request = requestData, catalog) {
    return (
        <StatsPanel
            stats={{ CRITICAL_CHANCE: "62%" }}
            gameRules={gameRules}
            requestData={request}
            catalog={catalog}
            onCalculate={vi.fn()}
        />
    );
}
beforeEach(() => {
    vi.clearAllMocks();
    HTMLDialogElement.prototype.showModal = vi.fn(function () {
        this.setAttribute("open", "");
    });
    HTMLDialogElement.prototype.close = vi.fn(function () {
        this.removeAttribute("open");
    });
});
afterEach(() => {
    cleanup();
    delete HTMLDialogElement.prototype.showModal;
    delete HTMLDialogElement.prototype.close;
});

describe("stat explanation", () => {
    it("returns focus to the triggering row even when a touch click did not focus it", async () => {
        explainEquipmentStats.mockResolvedValue(response);
        render(panel());
        const opener = screen.getByRole("button", { name: "Szansa krytyczna 62%" });
        fireEvent.click(opener);
        await screen.findByText("Kryt");
        fireEvent.click(screen.getByRole("button", { name: "Wróć do statystyk" }));
        expect(opener).toHaveFocus();
    });
    it("invalidates a trace after catalogue replacement even when rules and equipment stayed the same", async () => {
        explainEquipmentStats.mockResolvedValue(response);
        const user = userEvent.setup();
        const { rerender } = render(panel(requestData, { version: 1 }));
        await user.click(screen.getByRole("button", { name: "Szansa krytyczna 62%" }));
        await screen.findByText("Kryt");
        rerender(panel(requestData, { version: 2 }));
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
        await user.click(screen.getByRole("button", { name: "Szansa krytyczna 62%" }));
        await screen.findByText("Kryt");
        expect(explainEquipmentStats).toHaveBeenCalledTimes(2);
    });
    it("loads lazily, explains penalties/caps, restores focus and reuses the current trace", async () => {
        explainEquipmentStats.mockResolvedValue(response);
        const user = userEvent.setup();
        render(panel());
        expect(explainEquipmentStats).not.toHaveBeenCalled();
        const opener = screen.getByRole("button", { name: "Szansa krytyczna 62%" });
        await user.click(opener);
        await screen.findByText("Kryt");
        expect(screen.getByText(/Nadmiar bez dodatkowej korzyści: 2 p.p./)).toBeInTheDocument();
        expect(screen.getByText(/Mnożnik 0,95 obejmuje każdy/)).toBeInTheDocument();
        await user.click(screen.getByText("Kryt"));
        expect(screen.getByText("Bonus gwiazdek do drifów")).toBeVisible();
        await user.click(screen.getByRole("button", { name: "Wróć do statystyk" }));
        expect(opener).toHaveFocus();
        await user.click(opener);
        expect(explainEquipmentStats).toHaveBeenCalledTimes(1);
        fireEvent(
            screen.getByRole("dialog"),
            new Event("cancel", { bubbles: true, cancelable: true })
        );
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
    it("aborts stale requests and never reopens old details after undoing equipment", async () => {
        let finish;
        explainEquipmentStats.mockReturnValue(
            new Promise((resolve) => {
                finish = resolve;
            })
        );
        const user = userEvent.setup();
        const { rerender } = render(panel());
        await user.click(screen.getByRole("button", { name: "Szansa krytyczna 62%" }));
        const signal = explainEquipmentStats.mock.calls[0][1].signal;
        rerender(panel({ slots: {}, characterStats: { Siła: 20 } }));
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
        expect(signal.aborted).toBe(true);
        await act(async () => finish(response));
        rerender(panel());
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
    it("allows retry after a failed request", async () => {
        explainEquipmentStats
            .mockRejectedValueOnce(new Error("offline"))
            .mockResolvedValue(response);
        const user = userEvent.setup();
        render(panel());
        await user.click(screen.getByRole("button", { name: "Szansa krytyczna 62%" }));
        await screen.findByRole("alert");
        await user.click(screen.getByRole("button", { name: "Spróbuj ponownie" }));
        await waitFor(() => expect(screen.getByText("Kryt")).toBeInTheDocument());
    });
});
