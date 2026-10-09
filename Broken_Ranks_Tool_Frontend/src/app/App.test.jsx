import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import { useEquipment } from "../shared/state/EquipmentContext";
import { downloadBuildPayload } from "../features/builds/buildDownloads";

vi.mock("../shared/state/EquipmentContext", async (importOriginal) => ({
    ...(await importOriginal()),
    useEquipment: vi.fn(),
    useEquipmentCatalogState: () => useEquipment(),
    useEquipmentBuildActions: () => useEquipment(),
    useEquipmentSetup: () => useEquipment(),
    useEquipmentLocksState: () => useEquipment(),
    useEquipmentCalculation: () => useEquipment(),
}));

vi.mock("../features/builds/buildDownloads", async (importOriginal) => ({
    ...(await importOriginal()),
    downloadBuildPayload: vi.fn(),
}));

const equipment = {
    data: { items: [], orbs: [], drifs: [] },
    categoryNames: {},
    orbCategories: {},
    drifCategories: {},
    gameRules: {
        slotOrbRules: {},
        elementalTypes: [],
        drifBasePowers: {},
        epicBuiltInDrifs: {},
        bonusTranslations: {},
        drifBonusCategories: {},
    },
    loading: false,
    initialDataError: null,
    requestData: { slots: {} },
    stats: null,
    statSources: {},
    isCalculatingStats: false,
    optimizationTrigger: 0,
    characterConfig: null,
    handleSlotUpdate: vi.fn(),
    handleCharacterStatsUpdate: vi.fn(),
    calculateStats: vi.fn(),
    loadBuildFromFile: vi.fn(),
    createBuildSnapshot: vi.fn(() => ({
        payload: {
            format: "broken-ranks-tool-build",
            version: 1,
            build: {
                requestData: { slots: {}, characterStats: {} },
                characterConfig: null,
                lockedSlots: [],
                lockedDrifs: {},
            },
        },
        stats: null,
        statSources: {},
    })),
    loadBuildSnapshot: vi.fn(),
    runDrifOptimization: vi.fn(),
    lockedSlots: [],
    lockedDrifs: [],
    toggleSlotLock: vi.fn(),
    toggleDrifLock: vi.fn(),
    applyOptimizationSetup: vi.fn(),
};

const renderApp = async () => {
    const result = render(<App />);
    await screen.findByRole("link", { name: /Kreator ekwipunku/i }, { timeout: 10000 });
    if (
        !useEquipment.mock.results.at(-1).value.loading &&
        !useEquipment.mock.results.at(-1).value.initialDataError
    ) {
        const heading =
            window.location.pathname === "/optymalizator"
                ? "Ustawienia"
                : window.location.pathname === "/"
                  ? "Broken Ranks Tool"
                  : "Ekwipunek";
        await screen.findByRole(
            "heading",
            { name: heading, ...(heading === "Broken Ranks Tool" ? { level: 2 } : {}) },
            { timeout: 10000 }
        );
    }
    return result;
};
describe("App", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
        window.history.replaceState(null, "", "/kreator");
        useEquipment.mockReturnValue(equipment);
    });

    it("navigates through the builder and optimizer workspaces", async () => {
        const user = userEvent.setup();
        await renderApp();

        expect(screen.getByRole("heading", { name: "Broken Ranks Tool" })).toBeInTheDocument();
        expect(screen.getByText("także z Broken HUD")).toBeInTheDocument();
        expect(screen.getByRole("link", { name: "Przejdź do głównej treści" })).toHaveAttribute(
            "href",
            "#workspace-content"
        );
        expect(
            await screen.findByRole("heading", { name: "Ekwipunek" }, { timeout: 10000 })
        ).toBeInTheDocument();
        expect(screen.getByRole("link", { name: /Kreator ekwipunku/i })).toHaveAttribute(
            "aria-current",
            "page"
        );

        expect(screen.getByRole("region", { name: /Rozwój bohatera/i })).toBeInTheDocument();
        expect(screen.getByRole("spinbutton", { name: /Poziom postaci/i })).toBeInTheDocument();
        await user.click(screen.getByRole("link", { name: /Optymalizator drifów/i }));
        expect(screen.getByRole("link", { name: /Optymalizator drifów/i })).toHaveAttribute(
            "aria-current",
            "page"
        );
        expect(
            await screen.findByRole("heading", { name: "Ustawienia" }, { timeout: 10000 })
        ).toBeInTheDocument();
        await user.click(screen.getByRole("button", { name: "Zaawansowany" }));
        const optimizerSearch = screen.getByPlaceholderText("Szukaj statystyki...");
        await user.type(optimizerSearch, "krytyk");
        expect(
            screen.queryByRole("button", { name: /Przelicz statystyki/i })
        ).not.toBeInTheDocument();

        await user.click(screen.getByRole("link", { name: /Kreator ekwipunku/i }));
        expect(screen.queryByRole("heading", { name: "Ustawienia" })).not.toBeInTheDocument();
        await user.click(screen.getByRole("button", { name: /Zapisz lokalnie/i }));
        await user.click(screen.getByRole("button", { name: /Przelicz statystyki/i }));
        expect(
            JSON.parse(localStorage.getItem("broken-ranks-tool.build-library.v1")).builds
        ).toHaveLength(1);
        expect(equipment.calculateStats).toHaveBeenCalledOnce();

        await user.click(screen.getByRole("link", { name: /Optymalizator drifów/i }));
        expect(window.location.pathname).toBe("/optymalizator");
    }, 20000);

    it("reports a successful build import", async () => {
        const { container } = await renderApp();
        const input = container.querySelector('input[type="file"]');
        const file = new File(["{}"], "build.json", { type: "application/json" });

        fireEvent.change(input, { target: { files: [file] } });
        await vi.waitFor(() => expect(equipment.loadBuildFromFile).toHaveBeenCalledWith(file));
        await vi.waitFor(() =>
            expect(screen.getByRole("status")).toHaveTextContent(
                "Wczytano build z pliku build.json"
            )
        );
    });

    it("reports a failed build import without a blocking alert", async () => {
        equipment.loadBuildFromFile.mockRejectedValueOnce(new Error("uszkodzony plik"));
        const { container } = await renderApp();
        const input = container.querySelector('input[type="file"]');
        const file = new File(["{}"], "build.json", { type: "application/json" });

        fireEvent.change(input, { target: { files: [file] } });
        await vi.waitFor(() =>
            expect(screen.getByRole("alert")).toHaveTextContent(
                "Nie udało się wczytać buildu: uszkodzony plik"
            )
        );
    });

    it("saves and reloads named builds from the local library", async () => {
        const user = userEvent.setup();
        await renderApp();

        await user.click(screen.getByRole("button", { name: /Zapisz lokalnie/i }));
        await user.click(screen.getByRole("link", { name: /Buildy lokalne/i }));
        expect(
            await screen.findByRole("heading", { name: "Buildy lokalne" }, { timeout: 10000 })
        ).toBeInTheDocument();
        const nameInput = screen.getByLabelText("Zmień nazwę lokalnego buildu");
        await user.clear(nameInput);
        await user.type(nameInput, "PvE ogień");
        await user.click(screen.getByRole("button", { name: "Zmień nazwę" }));

        expect(screen.getByRole("status")).toHaveTextContent("Zmieniono nazwę");
        expect(screen.getAllByText("PvE ogień")).not.toHaveLength(0);
        await user.click(screen.getByRole("button", { name: "Wczytaj" }));

        expect(equipment.loadBuildSnapshot).toHaveBeenCalledWith(
            expect.objectContaining({ name: "PvE ogień" })
        );
        expect(
            await screen.findByRole("heading", { name: "Ekwipunek" }, { timeout: 10000 })
        ).toBeVisible();
    });

    it("exports a saved local build to JSON and allows dismissing the message", async () => {
        const user = userEvent.setup();
        await renderApp();

        await user.click(screen.getByRole("button", { name: /Zapisz lokalnie/i }));
        expect(screen.getByRole("status")).toHaveTextContent("Zapisano lokalnie");
        await user.click(screen.getByRole("link", { name: /Buildy lokalne/i }));
        await user.click(screen.getByRole("button", { name: "Eksportuj JSON" }));
        expect(downloadBuildPayload).toHaveBeenCalledWith(
            expect.objectContaining({ format: "broken-ranks-tool-build" })
        );
        expect(screen.getByRole("status")).toHaveTextContent("Wyeksportowano build");

        await user.click(screen.getByRole("button", { name: "Zamknij komunikat" }));
        expect(screen.queryByRole("status")).not.toBeInTheDocument();
    });

    it("shows the initial API error", async () => {
        useEquipment.mockReturnValue({ ...equipment, initialDataError: "brak połączenia" });
        await renderApp();
        expect(screen.getByRole("alert")).toHaveTextContent("brak połączenia");
        expect(screen.queryByRole("heading", { name: "Ekwipunek" })).not.toBeInTheDocument();
        expect(screen.getByRole("button", { name: /Zapisz lokalnie/i })).toBeDisabled();
    });

    it("shows a dedicated loading state before rendering the workspaces", async () => {
        useEquipment.mockReturnValue({ ...equipment, loading: true });
        await renderApp();

        expect(screen.getByRole("status")).toHaveTextContent("Ładowanie danych gry");
        expect(screen.queryByRole("heading", { name: "Ekwipunek" })).not.toBeInTheDocument();
        expect(screen.getByRole("link", { name: /Optymalizator drifów/i })).toHaveAttribute(
            "aria-disabled",
            "true"
        );
    });

    it("supports direct routes and browser history", async () => {
        window.history.replaceState(null, "", "/optymalizator");
        const user = userEvent.setup();
        await renderApp();

        expect(
            await screen.findByRole("heading", { name: "Ustawienia" }, { timeout: 10000 })
        ).toBeInTheDocument();
        expect(screen.queryByRole("heading", { name: "Ekwipunek" })).not.toBeInTheDocument();

        await user.click(screen.getByRole("link", { name: /Buildy lokalne/i }));
        expect(window.location.pathname).toBe("/buildy");
        window.history.back();
        window.dispatchEvent(new PopStateEvent("popstate"));
        expect(await screen.findByRole("heading", { name: "Ustawienia" })).toBeInTheDocument();
    });

    it("renders the home page at the root and opens a selected tool", async () => {
        window.history.replaceState(null, "", "/");
        const user = userEvent.setup();
        await renderApp();

        expect(screen.getAllByRole("heading", { name: "Broken Ranks Tool" })).toHaveLength(2);
        expect(screen.queryByText("Warsztat świadomych wyborów")).not.toBeInTheDocument();
        await user.click(screen.getByRole("link", { name: /Kreator ekwipunku/i }));

        expect(window.location.pathname).toBe("/kreator");
        expect(
            await screen.findByRole("heading", { name: "Ekwipunek" }, { timeout: 10000 })
        ).toBeVisible();
    });

    it("keeps optimizer lock controls out of the manual builder", async () => {
        useEquipment.mockReturnValue({
            ...equipment,
            data: {
                items: [
                    {
                        id: 1,
                        name: "Hełm testowy",
                        category: "HELMET",
                        tier: "X",
                        rarity: "RARE",
                        capacity: 10,
                    },
                ],
                orbs: [],
                drifs: [],
            },
            requestData: {
                slots: {
                    helmet: {
                        itemId: 1,
                        itemStars: 1,
                        orbIds: [],
                        orbLevels: [],
                        drifIds: [],
                        drifLevels: {},
                    },
                },
                characterStats: {},
            },
            lockedSlots: ["helmet"],
        });

        await renderApp();

        await vi.waitFor(() =>
            expect(screen.getByLabelText("Wybierz przedmiot dla slotu Hełm")).toHaveValue("1")
        );
        expect(screen.queryByTitle("Odblokuj slot")).not.toBeInTheDocument();
        expect(screen.queryByTitle("Zablokuj slot w optymalizatorze")).not.toBeInTheDocument();
    });
});
