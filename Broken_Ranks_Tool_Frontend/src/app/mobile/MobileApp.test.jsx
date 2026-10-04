import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "../App";
import { EquipmentProvider } from "../EquipmentProvider";
import { readEquipmentDraft } from "../storage/workingDraftStorage";
import { server } from "../../test/server";
import { builderCatalog } from "../../test/fixtures/equipment/builderCatalog";

const button = (name) => screen.getByRole("button", { name, exact: true });
const mountApp = () =>
    render(
        <EquipmentProvider>
            <App />
        </EquipmentProvider>
    );
const clickSection = (name) => fireEvent.click(button(name));
const clickStatTab = (name) => fireEvent.click(screen.getByRole("tab", { name, exact: true }));
const save = () => {
    fireEvent.click(screen.getByText("Build", { selector: "summary" }));
    fireEvent.click(screen.getByRole("button", { name: /Zapisz lokalnie/ }));
};
const importFile = (container, payload) => {
    fireEvent.click(screen.getByText("Build", { selector: "summary" }));
    fireEvent.click(button("Wczytaj plik buildu"));
    fireEvent.change(container.querySelector('input[type="file"]'), {
        target: {
            files: [{ name: "build.json", size: 1000, text: async () => JSON.stringify(payload) }],
        },
    });
};
const savedBuild = (stars = 7) => ({
    format: "broken-ranks-tool-build",
    version: 1,
    build: {
        requestData: {
            slots: {
                helmet: {
                    itemId: 1,
                    itemStars: stars,
                    orbIds: [50],
                    orbLevels: [1],
                    drifIds: [60],
                    drifLevels: { 0: 6 },
                },
            },
            characterStats: {},
        },
        characterConfig: null,
        lockedSlots: [],
        lockedDrifs: {},
    },
});

describe("mobile application integration", () => {
    beforeEach(() => {
        localStorage.clear();
        sessionStorage.clear();
        window.history.replaceState(null, "", "/kreator?ui=mobile");
        vi.spyOn(window, "scrollTo").mockImplementation(() => {});
        // jsdom does not implement native modal opening; browser E2E covers focus/inert behavior.
        HTMLDialogElement.prototype.showModal = vi.fn(function () {
            this.open = true;
        });
        HTMLDialogElement.prototype.close = vi.fn(function () {
            this.open = false;
        });
        server.use(http.get("*/api/initial-data", () => HttpResponse.json(builderCatalog)));
    });
    afterEach(() => {
        cleanup();
        vi.restoreAllMocks();
        delete HTMLDialogElement.prototype.showModal;
        delete HTMLDialogElement.prototype.close;
    });

    it("edits a slot, calculates character statistics and saves a shared build snapshot", async () => {
        let calculation;
        server.use(
            http.post("*/api/calculator/calculate", async ({ request }) => {
                calculation = await request.json();
                return HttpResponse.json({
                    stats: { Siła: 12, CRITICAL_CHANCE: "12%", DEFENSE: "5%" },
                    drifCategories: { CRITICAL_CHANCE: "OFFENSIVE" },
                    orbBonusTypes: ["DEFENSE"],
                });
            })
        );
        mountApp();
        await screen.findByText("Kreator ekwipunku", { selector: "span.mobile-eyebrow" });
        clickSection("Edytuj slot: Hełm");
        clickSection("Wybierz przedmiot");
        const search = screen.getByRole("searchbox");
        fireEvent.change(search, { target: { value: "brak" } });
        expect(screen.getByText("Brak pasujących przedmiotów.")).toBeInTheDocument();
        fireEvent.change(search, { target: { value: "podróżnika" } });
        fireEvent.click(screen.getByRole("button", { name: /Hełm podróżnika/ }));
        fireEvent.click(screen.getByRole("button", { name: /Wyniki wyszukiwania/ }));
        fireEvent.click(screen.getByRole("button", { name: /Hełm podróżnika/ }));
        fireEvent.click(
            within(screen.getByRole("dialog")).getByRole("button", { name: "Wybierz przedmiot" })
        );
        await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
        fireEvent.change(screen.getByLabelText("Gwiazdki"), { target: { value: "9" } });
        fireEvent.change(screen.getByLabelText("Wybierz rodzaj drifa 1"), {
            target: { value: "Band" },
        });
        fireEvent.change(screen.getByLabelText("Wybierz wielkość drifa 1"), {
            target: { value: "60" },
        });
        fireEvent.change(screen.getByLabelText("Wybierz rodzaj orba"), {
            target: { value: "Ochrona" },
        });
        fireEvent.change(screen.getByLabelText("Wybierz wielkość orba"), {
            target: { value: "50" },
        });
        fireEvent.click(screen.getByRole("link", { name: "Kreator", exact: true }));
        expect(
            screen.getByRole("region", { name: "Poziomy wszystkich kamieni" })
        ).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Maksymalne poziomy drifów" })).toBeVisible();
        expect(screen.getByRole("button", { name: "Maksymalne poziomy orbów" })).toBeVisible();
        clickSection("Maksymalne poziomy drifów");
        clickSection("Maksymalne poziomy orbów");
        expect(readEquipmentDraft().requestData.slots.helmet.drifLevels[0]).toBe(6);
        clickSection("Postać");
        fireEvent.change(screen.getByLabelText("Poziom postaci"), { target: { value: "2" } });
        clickSection("Dodaj punkt: Siła");
        clickSection("Dodaj punkt: Siła");
        clickSection("Odejmij punkt: Siła");
        clickSection("Statystyki");
        clickSection("Przelicz statystyki");
        await screen.findByText("12%");
        expect(screen.getByRole("heading", { name: "Statystyki podstawowe" })).toBeVisible();
        expect(screen.getByRole("heading", { name: "Drify" })).toBeVisible();
        expect(screen.getByRole("heading", { name: "Orby" })).toBeVisible();
        clickStatTab("Bazowe");
        expect(screen.getByRole("heading", { name: "Statystyki podstawowe" })).toBeVisible();
        expect(screen.queryByRole("heading", { name: "Drify" })).not.toBeInTheDocument();
        expect(screen.queryByRole("heading", { name: "Orby" })).not.toBeInTheDocument();
        clickStatTab("Orby");
        expect(screen.getByText("DEFENSE")).toBeVisible();
        expect(
            screen.queryByRole("heading", { name: "Statystyki podstawowe" })
        ).not.toBeInTheDocument();
        expect(screen.queryByRole("heading", { name: "Drify" })).not.toBeInTheDocument();
        clickStatTab("Drify");
        expect(screen.getByRole("heading", { name: "Drify" })).toBeVisible();
        expect(screen.queryByRole("heading", { name: "Orby" })).not.toBeInTheDocument();
        clickStatTab("Wszystkie");
        expect(screen.getByRole("heading", { name: "Orby" })).toBeVisible();
        expect(calculation.characterStats.Siła).toBe(11);
        expect(calculation.slots.helmet).toMatchObject({
            itemId: "1",
            itemStars: 9,
            drifLevels: { 0: 6 },
        });
        clickSection("Postać");
        expect(screen.getByLabelText("Poziom postaci")).toHaveValue(2);
        expect(readEquipmentDraft().characterConfig.spentPoints.Siła).toBe(1);
        clickSection("Zresetuj punkty");
        clickSection("Statystyki");
        expect(screen.queryByText("12%")).not.toBeInTheDocument();
        save();
        expect(screen.getByRole("status")).toHaveTextContent("Zapisano lokalnie");
        const records = JSON.parse(localStorage.getItem("broken-ranks-tool.build-library.v1"));
        expect(records.builds[0].payload.build.requestData.slots.helmet.itemStars).toBe(9);
        fireEvent.click(screen.getByRole("link", { name: "Start", exact: true }));
        expect(screen.getByRole("heading", { name: "Broken Ranks Tool" })).toBeInTheDocument();
        fireEvent.click(screen.getByRole("link", { name: "Optymalizator", exact: true }));
        expect(screen.getByRole("heading", { name: "Optymalizator" })).toBeInTheDocument();
        fireEvent.click(screen.getByRole("link", { name: "Start", exact: true }));
        fireEvent.click(screen.getByRole("link", { name: "Buildy", exact: true }));
        expect(screen.getByRole("heading", { name: "Buildy lokalne" })).toBeInTheDocument();
    });

    it("replaces an open slot on import, rejects a bad import and preserves data after remount", async () => {
        window.history.replaceState(null, "", "/kreator?ui=mobile&slot=helmet");
        const app = mountApp();
        await screen.findByRole("heading", { name: "Hełm", level: 1 }, { timeout: 10000 });
        importFile(app.container, savedBuild());
        await waitFor(() => expect(screen.getByLabelText("Gwiazdki")).toHaveValue("7"));
        save();
        importFile(app.container, savedBuild(9));
        await waitFor(() => expect(screen.getByLabelText("Gwiazdki")).toHaveValue("9"));
        expect(screen.getByRole("status")).toHaveTextContent("Wczytano build z pliku");
        importFile(app.container, savedBuild(99));
        await screen.findByRole("alert");
        expect(screen.getByLabelText("Gwiazdki")).toHaveValue("9");
        app.unmount();
        mountApp();
        await screen.findByLabelText("Gwiazdki");
        expect(screen.getByLabelText("Wybierz poziom drifa 1")).toHaveValue("6");
        expect(screen.getByLabelText("Wybierz wielkość orba")).toHaveValue("50");
        clickSection("Zmień przedmiot");
        fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
        await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
        clickSection("Usuń przedmiot ze slotu");
        expect(readEquipmentDraft().requestData.slots.helmet.itemId).toBeNull();
        fireEvent.click(screen.getByRole("button", { name: /Wszystkie sloty/ }));
        await screen.findByText("Kreator ekwipunku", { selector: "span.mobile-eyebrow" });
    });

    it("keeps import and save disabled while loading and reports a catalog error", async () => {
        let complete;
        const pending = new Promise((resolve) => {
            complete = resolve;
        });
        server.use(
            http.get("*/api/initial-data", async () => {
                await pending;
                return HttpResponse.json({ message: "Katalog niedostępny" }, { status: 503 });
            })
        );
        const app = mountApp();
        await screen.findByRole("status");
        await userEvent.click(
            await screen.findByText("Build", { selector: "summary" }, { timeout: 10000 })
        );
        expect(screen.getByRole("button", { name: /Zapisz lokalnie/ })).toBeDisabled();
        expect(button("Wczytaj plik buildu")).toBeDisabled();
        expect(app.container.querySelectorAll("#workspace-content")).toHaveLength(1);
        complete();
        expect(await screen.findByRole("alert")).toHaveTextContent("Katalog niedostępny");
    });
});
